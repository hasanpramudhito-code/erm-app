// API Risk Register. Aturan: handoff bagian 5 (entri per periode/unit), 7 (penguncian setelah persetujuan), 8 (hak akses).
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnitKerja } = require('./auth');
const { catat } = require('./audit');
const { konteksPenilaian, nilaiPenilaian } = require('./skor');
const sinkronKriBaku = (...a) => require('./risiko-utama').sinkronKriBaku(...a);

const router = express.Router();
router.use(wajibLogin);

const PERAN_GLOBAL_TULIS = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO'];
const PERAN_UNIT_TULIS = ['PIMPINAN', 'PETUGAS'];
const STATUS_BISA_DIUBAH = ['DRAF', 'DIKEMBALIKAN'];

const ENUM = {
  sumber: ['INTERNAL', 'EKSTERNAL'],
  status: ['BARU', 'DALAM_PENILAIAN', 'DINILAI', 'DALAM_PENANGANAN', 'DIPANTAU', 'DITUTUP', 'DITOLAK'],
  prioritas: ['PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'],
  jenisMitigasi: ['MITIGASI', 'HINDARI', 'TRANSFER', 'TERIMA'],
  arah: ['LEBIH_RENDAH', 'LEBIH_TINGGI'],
  frekuensi: ['HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN'],
};

const sertakan = {
  periode: { select: { id: true, nama: true, status: true } },
  unit_kerja: { select: { id: true, kode: true, nama: true, jenis: true, alur_persetujuan: true, direktorat: { select: { id: true, nama: true, nama_jabatan_direktur: true } } } },
  kategori: { select: { id: true, kode: true, nama: true } },
  risiko_utama: { select: { id: true, kode: true, nama: true } },
  penanggung_jawab: { select: { id: true, nama: true } },
  penyebab: { select: { id: true, uraian: true, pustaka_penyebab_id: true } },
  dampak: { select: { id: true, uraian: true, pustaka_dampak_id: true } },
  penilaian: { include: { level: { select: { id: true, nama: true, warna: true } } } },
  mitigasi: { orderBy: { id: 'asc' }, include: { penanggung_jawab: { select: { id: true, nama: true } } } },
  kri: { orderBy: { id: 'asc' }, include: { pemilik: { select: { id: true, nama: true } } } },
  pemantauan_bulanan: {
    orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    take: 1,
    select: { id: true, tahun: true, bulan: true, status_persetujuan: true, peristiwa_terjadi: true },
  },
};

const punya = (pengguna, daftar) => pengguna.peran.some((p) => daftar.includes(p));

// Boleh menulis ke risiko pada unit ini dengan status ini?
function cekTulis(pengguna, unit_kerja_id, status_persetujuan) {
  if (pengguna.peran.includes('DIREKSI')) return null; // akses penuh, ditandai di data (handoff bagian 8)
  if (!STATUS_BISA_DIUBAH.includes(status_persetujuan)) return 'Risiko sudah diajukan/final dan terkunci';
  if (punya(pengguna, PERAN_GLOBAL_TULIS)) return null;
  if (punya(pengguna, PERAN_UNIT_TULIS) && pengguna.unit_kerja_id === unit_kerja_id) return null;
  return 'Akses ditolak';
}

const teks = (v) => (v === undefined ? undefined : String(v ?? '').trim() || null);
const pilihan = (v, daftar, nama) => {
  if (v === undefined) return { v: undefined };
  if (v === null || v === '') return { v: null };
  return daftar.includes(v) ? { v } : { error: `${nama} tidak valid` };
};
const uang = (v) => (v === undefined ? undefined : v === null || v === '' ? null : Number(v));
const daftarUraian = (arr, kunciPustaka) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => ({ uraian: String(x?.uraian ?? '').trim(), [kunciPustaka]: x?.[kunciPustaka] ? Number(x[kunciPustaka]) : null }))
    .filter((x) => x.uraian);

const cekPengguna = async (id, nama) =>
  id && !(await prisma.pengguna.findUnique({ where: { id } })) ? `${nama} tidak ditemukan` : null;

// Mitigasi di register: hanya rencana. Status & progres diisi saat pemantauan.
async function bersihkanMitigasi(arr) {
  if (!Array.isArray(arr)) return { error: 'mitigasi harus daftar' };
  const daftar = [];
  for (const [i, m] of arr.entries()) {
    const n = `Mitigasi #${i + 1}`;
    const x = {
      id: m.id ? Number(m.id) : undefined,
      uraian: String(m.uraian ?? '').trim(),
      jenis: m.jenis || 'MITIGASI',
      penanggung_jawab_id: m.penanggung_jawab_id ? Number(m.penanggung_jawab_id) : null,
      target_waktu: m.target_waktu ? new Date(m.target_waktu) : null,
      anggaran: m.anggaran === '' || m.anggaran == null ? null : Number(m.anggaran),
      prioritas: m.prioritas || 'SEDANG',
    };
    if (!x.uraian) return { error: `${n}: uraian wajib diisi` };
    if (!ENUM.jenisMitigasi.includes(x.jenis)) return { error: `${n}: jenis tidak valid` };
    if (!ENUM.prioritas.includes(x.prioritas)) return { error: `${n}: prioritas tidak valid` };
    if (x.target_waktu && isNaN(x.target_waktu)) return { error: `${n}: target waktu bukan tanggal` };
    if (x.anggaran !== null && !(Number.isFinite(x.anggaran) && x.anggaran >= 0)) return { error: `${n}: anggaran harus angka >= 0` };
    const e = await cekPengguna(x.penanggung_jawab_id, `${n}: penanggung jawab`);
    if (e) return { error: e };
    daftar.push(x);
  }
  return { daftar };
}

// KRI di register: hanya definisi. Nilai diisi saat pemantauan.
async function bersihkanKri(arr) {
  if (!Array.isArray(arr)) return { error: 'kri harus daftar' };
  const daftar = [];
  for (const [i, k] of arr.entries()) {
    const n = `KRI #${i + 1}`;
    const x = {
      id: k.id ? Number(k.id) : undefined,
      nama: String(k.nama ?? '').trim(),
      deskripsi: String(k.deskripsi ?? '').trim() || null,
      satuan: String(k.satuan ?? '').trim() || null,
      ambang_hijau: Number(k.ambang_hijau),
      ambang_kuning: Number(k.ambang_kuning),
      ambang_merah: Number(k.ambang_merah),
      arah_target: k.arah_target || 'LEBIH_RENDAH',
      frekuensi: k.frekuensi || 'BULANAN',
      pemilik_id: k.pemilik_id ? Number(k.pemilik_id) : null,
      rumus: k.rumus === 'RASIO' ? 'RASIO' : 'LANGSUNG',
      label_pembilang: String(k.label_pembilang ?? '').trim() || null,
      label_penyebut: String(k.label_penyebut ?? '').trim() || null,
      pengali: k.pengali === '' || k.pengali == null ? 100 : Number(k.pengali),
    };
    if (!x.nama) return { error: `${n}: nama wajib diisi` };
    if (![x.ambang_hijau, x.ambang_kuning, x.ambang_merah].every(Number.isFinite)) return { error: `${n}: ketiga ambang wajib angka` };
    if (!ENUM.arah.includes(x.arah_target)) return { error: `${n}: arah tidak valid` };
    if (!ENUM.frekuensi.includes(x.frekuensi)) return { error: `${n}: frekuensi tidak valid` };
    if (x.rumus === 'RASIO') {
      if (!x.label_pembilang || !x.label_penyebut) return { error: `${n}: nama angka pembilang dan penyebut wajib diisi` };
      if (!(Number.isFinite(x.pengali) && x.pengali > 0)) return { error: `${n}: pengali harus angka > 0` };
    } else Object.assign(x, { label_pembilang: null, label_penyebut: null, pengali: 100 });
    const naik = x.ambang_hijau <= x.ambang_kuning && x.ambang_kuning <= x.ambang_merah;
    const turun = x.ambang_hijau >= x.ambang_kuning && x.ambang_kuning >= x.ambang_merah;
    if (x.arah_target === 'LEBIH_RENDAH' && !naik) return { error: `${n}: makin rendah makin baik, jadi ambang hijau <= kuning <= merah` };
    if (x.arah_target === 'LEBIH_TINGGI' && !turun) return { error: `${n}: makin tinggi makin baik, jadi ambang hijau >= kuning >= merah` };
    const e = await cekPengguna(x.pemilik_id, `${n}: pemilik`);
    if (e) return { error: e };
    daftar.push(x);
  }
  return { daftar };
}

// Sinkronkan daftar anak dengan id: ubah yang ada, buat yang baru, hapus yang tidak dikirim.
// Baris yang sudah punya riwayat (realisasi/pengukuran) tidak boleh dihapus agar data pemantauan tidak hilang.
// `saring`: batasi baris lama yang disinkron (mis. hanya KRI buatan unit, bukan KRI baku).
async function sinkron(tx, model, risiko_id, daftar, riwayat, nama, saring = {}) {
  const lama = await tx[model].findMany({ where: { risiko_id, ...saring }, select: { id: true, [riwayat]: { select: { id: true }, take: 1 } } });
  const dikirim = new Set(daftar.filter((x) => x.id).map((x) => x.id));
  for (const l of lama) {
    if (dikirim.has(l.id)) continue;
    if (l[riwayat].length) throw Object.assign(new Error(`${nama} yang sudah punya catatan pemantauan tidak dapat dihapus`), { status: 400, expose: true });
    await tx[model].delete({ where: { id: l.id } });
  }
  const idLama = new Set(lama.map((l) => l.id));
  for (const { id, ...data } of daftar) {
    if (id && !idLama.has(id)) throw Object.assign(new Error(`${nama} #${id} bukan milik risiko ini`), { status: 400, expose: true });
    if (id) await tx[model].update({ where: { id }, data });
    else await tx[model].create({ data: { ...data, risiko_id } });
  }
}

// Validasi body. Kembalikan {data, penyebab, dampak, penilaian, residual} atau {error}.
async function bersihkan(b, baru, pengguna, risikoUtamaLama = null, periodeLama = null) {
  const data = {
    kode: teks(b.kode)?.toUpperCase(),
    nama: teks(b.nama),
    deskripsi: teks(b.deskripsi),
    kontrol_eksisting: teks(b.kontrol_eksisting),
    efektivitas_kontrol: teks(b.efektivitas_kontrol),
    catatan_penilaian: teks(b.catatan_penilaian),
    kuantifikasi_inheren: uang(b.kuantifikasi_inheren),
    kuantifikasi_residual: uang(b.kuantifikasi_residual),
  };
  for (const k of ['kuantifikasi_inheren', 'kuantifikasi_residual'])
    if (data[k] !== undefined && data[k] !== null && !(Number.isFinite(data[k]) && data[k] >= 0)) return { error: `${k} harus angka >= 0` };

  for (const [k, daftar, nama] of [['sumber', ENUM.sumber, 'Sumber'], ['status', ENUM.status, 'Status'], ['klasifikasi', ENUM.prioritas, 'Klasifikasi'], ['prioritas_penanganan', ENUM.prioritas, 'Prioritas penanganan']]) {
    const r = pilihan(b[k], daftar, nama);
    if (r.error) return r;
    data[k] = r.v;
  }
  if (data.sumber === null || data.status === null) return { error: 'Sumber dan status tidak boleh kosong' };

  for (const k of ['periode_id', 'unit_kerja_id', 'kategori_id', 'risiko_utama_id', 'penanggung_jawab_id'])
    if (b[k] !== undefined) data[k] = b[k] ? Number(b[k]) : null;

  if (baru) {
    for (const k of ['kode', 'nama', 'periode_id', 'unit_kerja_id']) if (!data[k]) return { error: `${k} wajib diisi` };
  } else if (data.kode === null || data.nama === null) return { error: 'Kode dan nama tidak boleh kosong' };
  if (data.periode_id === null || data.unit_kerja_id === null) return { error: 'Periode dan unit kerja tidak boleh kosong' };

  if (data.periode_id) {
    const p = await prisma.periode.findUnique({ where: { id: data.periode_id } });
    if (!p) return { error: 'Periode tidak ditemukan' };
    if (p.status !== 'TERBUKA') return { error: 'Periode sudah ditutup' };
  }
  if (data.unit_kerja_id) {
    const u = await prisma.unit_kerja.findUnique({ where: { id: data.unit_kerja_id } });
    if (!u || !u.aktif) return { error: 'Unit kerja tidak ditemukan atau nonaktif' };
    if (!u.pemilik_risiko) return { error: 'Unit kerja ini tidak memegang register risiko; pilih bagian induknya' };
    if (!punya(pengguna, PERAN_GLOBAL_TULIS) && u.id !== pengguna.unit_kerja_id) return { error: 'Hanya boleh mencatat risiko untuk unit kerja sendiri' };
    if (data.risiko_utama_id) {
      const ru = await prisma.risiko_utama.findUnique({ where: { id: data.risiko_utama_id } });
      if (!ru || !ru.aktif) return { error: 'Risiko utama tidak ditemukan' };
      const periodeEntri = data.periode_id ?? periodeLama;
      if (periodeEntri && !(await prisma.periode_risiko_utama.findUnique({ where: { periode_id_risiko_utama_id: { periode_id: periodeEntri, risiko_utama_id: ru.id } } })))
        return { error: 'Risiko utama ini tidak termasuk daftar periode tersebut' };
      if (ru.berlaku_untuk !== (['CABANG', 'UNIT'].includes(u.jenis) ? 'CABANG' : 'PUSAT'))
        return { error: `Risiko utama ini hanya untuk unit kerja ${ru.berlaku_untuk === 'CABANG' ? 'Cabang/Unit' : 'Pusat'}` };
    }
  }
  if (data.kategori_id && !(await prisma.kategori_risiko.findUnique({ where: { id: data.kategori_id } }))) return { error: 'Kategori tidak ditemukan' };
  if (data.penanggung_jawab_id && !(await prisma.pengguna.findUnique({ where: { id: data.penanggung_jawab_id } }))) return { error: 'Penanggung jawab tidak ditemukan' };

  const hasil = { data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) };
  if (b.penyebab !== undefined) hasil.penyebab = daftarUraian(b.penyebab, 'pustaka_penyebab_id');
  if (b.dampak !== undefined) hasil.dampak = daftarUraian(b.dampak, 'pustaka_dampak_id');
  // Rujukan pustaka harus milik risiko utama entri ini (teks tetap disalin, handoff 5.3).
  for (const [kunci, model] of [['penyebab', 'pustaka_penyebab'], ['dampak', 'pustaka_dampak']]) {
    const ids = (hasil[kunci] || []).map((x) => x[`${model}_id`]).filter(Boolean);
    if (!ids.length) continue;
    const ru = data.risiko_utama_id ?? risikoUtamaLama;
    const sah = ru ? await prisma[model].count({ where: { id: { in: ids }, risiko_utama_id: ru } }) : 0;
    if (sah !== new Set(ids).size) return { error: `Pilihan pustaka ${kunci} tidak sesuai risiko utama` };
  }

  if (b.mitigasi !== undefined) {
    const r = await bersihkanMitigasi(b.mitigasi);
    if (r.error) return r;
    hasil.mitigasi = r.daftar;
  }
  if (b.kri !== undefined) {
    const r = await bersihkanKri(b.kri);
    if (r.error) return r;
    hasil.kri = r.daftar;
  }

  // Penilaian inheren & residual: sekali per periode.
  const ctx = await konteksPenilaian();
  hasil.penilaian = [];
  for (const [kunci, jenis, nama] of [['inheren', 'INHEREN', 'Inheren'], ['residual', 'RESIDUAL', 'Residual']]) {
    if (!b[kunci]) continue;
    const r = nilaiPenilaian(ctx, b[kunci], nama);
    if (r.error) return r;
    hasil.penilaian.push({ jenis, ...r.data });
  }
  return hasil;
}

// Simpan anak-anak risiko (penyebab, dampak, penilaian, residual) dalam transaksi.
async function simpanAnak(tx, risiko_id, h) {
  if (h.penyebab) {
    await tx.risiko_penyebab.deleteMany({ where: { risiko_id } });
    await tx.risiko_penyebab.createMany({ data: h.penyebab.map((x) => ({ ...x, risiko_id })) });
  }
  if (h.dampak) {
    await tx.risiko_dampak.deleteMany({ where: { risiko_id } });
    await tx.risiko_dampak.createMany({ data: h.dampak.map((x) => ({ ...x, risiko_id })) });
  }
  if (h.mitigasi) await sinkron(tx, 'mitigasi', risiko_id, h.mitigasi, 'realisasi', 'Mitigasi');
  if (h.kri) {
    // KRI baku dikelola dari risiko utama: unit hanya boleh mengatur pemiliknya; KRI baku tidak ikut terhapus.
    const baku = new Set((await tx.kri.findMany({ where: { risiko_id, kri_baku_id: { not: null } }, select: { id: true } })).map((k) => k.id));
    for (const k of h.kri.filter((k) => baku.has(k.id))) await tx.kri.update({ where: { id: k.id }, data: { pemilik_id: k.pemilik_id } });
    await sinkron(tx, 'kri', risiko_id, h.kri.filter((k) => !baku.has(k.id)), 'pengukuran', 'KRI', { kri_baku_id: null });
  }
  for (const p of h.penilaian || []) {
    const { jenis, ...nilai } = p;
    await tx.penilaian.upsert({ where: { risiko_id_jenis: { risiko_id, jenis } }, update: nilai, create: { risiko_id, jenis, ...nilai } });
  }

}

router.get('/', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  res.json(await prisma.risiko.findMany({
    where: { periode_id, ...cakupanUnitKerja(req.pengguna) },
    include: sertakan,
    orderBy: { dibuat_pada: 'desc' },
  }));
});

router.get('/:id', async (req, res) => {
  const r = await prisma.risiko.findFirst({ where: { id: Number(req.params.id) || -1, ...cakupanUnitKerja(req.pengguna) }, include: sertakan });
  if (!r) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  res.json(r);
});

router.post('/', async (req, res) => {
  const h = await bersihkan(req.body || {}, true, req.pengguna);
  if (h.error) return res.status(400).json({ error: h.error });
  const larang = cekTulis(req.pengguna, h.data.unit_kerja_id, 'DRAF');
  if (larang) return res.status(403).json({ error: larang });

  const r = await prisma.$transaction(async (tx) => {
    const baru = await tx.risiko.create({ data: h.data });
    await simpanAnak(tx, baru.id, h);
    if (baru.risiko_utama_id) await sinkronKriBaku(tx, baru.risiko_utama_id);
    return tx.risiko.findUnique({ where: { id: baru.id }, include: sertakan });
  });
  await catat({ req, nama_tabel: 'risiko', id_data: r.id, aksi: 'BUAT', nilai_baru: r });
  res.status(201).json(r);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko.findFirst({ where: { id, ...cakupanUnitKerja(req.pengguna) }, include: sertakan });
  if (!lama) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  const larang = cekTulis(req.pengguna, lama.unit_kerja_id, lama.status_persetujuan);
  if (larang) return res.status(403).json({ error: larang });

  const h = await bersihkan(req.body || {}, false, req.pengguna, lama.risiko_utama_id, lama.periode_id);
  if (h.error) return res.status(400).json({ error: h.error });
  if (h.data.unit_kerja_id && h.data.unit_kerja_id !== lama.unit_kerja_id) {
    const l2 = cekTulis(req.pengguna, h.data.unit_kerja_id, lama.status_persetujuan);
    if (l2) return res.status(403).json({ error: l2 });
  }
  // Perubahan Direksi atas data yang sudah diajukan/final ditandai (handoff bagian 8).
  if (req.pengguna.peran.includes('DIREKSI') && !STATUS_BISA_DIUBAH.includes(lama.status_persetujuan)) h.data.diubah_direksi = true;

  const r = await prisma.$transaction(async (tx) => {
    const baru = await tx.risiko.update({ where: { id }, data: h.data });
    await simpanAnak(tx, id, h);
    if (baru.risiko_utama_id) await sinkronKriBaku(tx, baru.risiko_utama_id);
    return tx.risiko.findUnique({ where: { id }, include: sertakan });
  });
  await catat({ req, nama_tabel: 'risiko', id_data: id, aksi: 'UBAH', nilai_lama: lama, nilai_baru: r });
  res.json(r);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko.findFirst({ where: { id, ...cakupanUnitKerja(req.pengguna) }, include: sertakan });
  if (!lama) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  if (lama.status_persetujuan !== 'DRAF') return res.status(400).json({ error: 'Hanya risiko berstatus DRAF yang dapat dihapus' });
  const larang = cekTulis(req.pengguna, lama.unit_kerja_id, lama.status_persetujuan);
  if (larang) return res.status(403).json({ error: larang });
  const laporan = await prisma.pemantauan_bulanan.findMany({ where: { risiko_id: id }, select: { id: true } });
  await prisma.risiko.delete({ where: { id } });
  await require('./lampiran').hapusBuktiLaporan(prisma, laporan.map((l) => l.id));
  await catat({ req, nama_tabel: 'risiko', id_data: id, aksi: 'HAPUS', nilai_lama: lama });
  res.status(204).end();
});

// Riwayat perubahan satu risiko dari jejak audit.
router.get('/:id/riwayat', async (req, res) => {
  const r = await prisma.risiko.findFirst({ where: { id: Number(req.params.id) || -1, ...cakupanUnitKerja(req.pengguna) }, select: { id: true } });
  if (!r) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  res.json(await prisma.jejak_audit.findMany({
    where: { nama_tabel: 'risiko', id_data: String(r.id) },
    select: { id: true, aksi: true, dibuat_pada: true, pengguna: { select: { nama: true } } },
    orderBy: { dibuat_pada: 'desc' },
  }));
});

module.exports = { router, bersihkanKri };
