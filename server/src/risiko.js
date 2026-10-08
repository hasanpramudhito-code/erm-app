// API Risk Register. Aturan: handoff bagian 5 (entri per periode/unit), 7 (penguncian setelah persetujuan), 8 (hak akses).
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnit } = require('./auth');
const { catat } = require('./audit');
const { konteksPenilaian, nilaiPenilaian } = require('./skor');

const router = express.Router();
router.use(wajibLogin);

const PERAN_GLOBAL_TULIS = ['ADMIN_SISTEM', 'DIREKSI', 'PENGELOLA_RISIKO'];
const PERAN_UNIT_TULIS = ['PIMPINAN_UNIT_PUSAT', 'PETUGAS_RISIKO_PUSAT', 'PIMPINAN_CABANG', 'PETUGAS_RISIKO_CABANG'];
const STATUS_BISA_DIUBAH = ['DRAF', 'DIKEMBALIKAN'];

const ENUM = {
  sumber: ['INTERNAL', 'EKSTERNAL'],
  status: ['BARU', 'DALAM_PENILAIAN', 'DINILAI', 'DALAM_PENANGANAN', 'DIPANTAU', 'DITUTUP', 'DITOLAK'],
  prioritas: ['PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'],
};

const sertakan = {
  periode: { select: { id: true, nama: true, status: true } },
  unit: { select: { id: true, kode: true, nama: true, jenis: true, direktorat: { select: { id: true, nama: true, nama_jabatan_direktur: true } } } },
  kategori: { select: { id: true, kode: true, nama: true } },
  risiko_utama: { select: { id: true, kode: true, nama: true } },
  penanggung_jawab: { select: { id: true, nama: true } },
  penyebab: { select: { id: true, uraian: true, pustaka_penyebab_id: true } },
  dampak: { select: { id: true, uraian: true, pustaka_dampak_id: true } },
  penilaian: { include: { level: { select: { id: true, nama: true, warna: true } } } },
  pemantauan_bulanan: {
    orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    take: 1,
    include: { level: { select: { id: true, nama: true, warna: true } } },
  },
};

const punya = (pengguna, daftar) => pengguna.peran.some((p) => daftar.includes(p));

// Boleh menulis ke risiko pada unit ini dengan status ini?
function cekTulis(pengguna, unit_id, status_persetujuan) {
  if (pengguna.peran.includes('DIREKSI')) return null; // akses penuh, ditandai di data (handoff bagian 8)
  if (!STATUS_BISA_DIUBAH.includes(status_persetujuan)) return 'Risiko sudah diajukan/final dan terkunci';
  if (punya(pengguna, PERAN_GLOBAL_TULIS)) return null;
  if (punya(pengguna, PERAN_UNIT_TULIS) && pengguna.unit_id === unit_id) return null;
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

// Validasi body. Kembalikan {data, penyebab, dampak, penilaian, residual} atau {error}.
async function bersihkan(b, baru, pengguna) {
  const data = {
    kode: teks(b.kode)?.toUpperCase(),
    nama: teks(b.nama),
    deskripsi: teks(b.deskripsi),
    kontrol_eksisting: teks(b.kontrol_eksisting),
    efektivitas_kontrol: teks(b.efektivitas_kontrol),
    kontrol_tambahan: teks(b.kontrol_tambahan),
    catatan_penilaian: teks(b.catatan_penilaian),
    biaya_kontrol: uang(b.biaya_kontrol),
    kuantifikasi_inheren: uang(b.kuantifikasi_inheren),
    kuantifikasi_residual: uang(b.kuantifikasi_residual),
    target_selesai: b.target_selesai === undefined ? undefined : b.target_selesai ? new Date(b.target_selesai) : null,
  };
  for (const k of ['biaya_kontrol', 'kuantifikasi_inheren', 'kuantifikasi_residual'])
    if (data[k] !== undefined && data[k] !== null && !(Number.isFinite(data[k]) && data[k] >= 0)) return { error: `${k} harus angka >= 0` };
  if (data.target_selesai && isNaN(data.target_selesai)) return { error: 'target_selesai bukan tanggal' };

  for (const [k, daftar, nama] of [['sumber', ENUM.sumber, 'Sumber'], ['status', ENUM.status, 'Status'], ['klasifikasi', ENUM.prioritas, 'Klasifikasi'], ['prioritas_penanganan', ENUM.prioritas, 'Prioritas penanganan']]) {
    const r = pilihan(b[k], daftar, nama);
    if (r.error) return r;
    data[k] = r.v;
  }
  if (data.sumber === null || data.status === null) return { error: 'Sumber dan status tidak boleh kosong' };

  for (const k of ['periode_id', 'unit_id', 'kategori_id', 'risiko_utama_id', 'penanggung_jawab_id'])
    if (b[k] !== undefined) data[k] = b[k] ? Number(b[k]) : null;

  if (baru) {
    for (const k of ['kode', 'nama', 'periode_id', 'unit_id']) if (!data[k]) return { error: `${k} wajib diisi` };
  } else if (data.kode === null || data.nama === null) return { error: 'Kode dan nama tidak boleh kosong' };
  if (data.periode_id === null || data.unit_id === null) return { error: 'Periode dan unit tidak boleh kosong' };

  if (data.periode_id) {
    const p = await prisma.periode.findUnique({ where: { id: data.periode_id } });
    if (!p) return { error: 'Periode tidak ditemukan' };
    if (p.status !== 'TERBUKA') return { error: 'Periode sudah ditutup' };
  }
  if (data.unit_id) {
    const u = await prisma.unit.findUnique({ where: { id: data.unit_id } });
    if (!u || !u.aktif) return { error: 'Unit tidak ditemukan atau nonaktif' };
    if (!punya(pengguna, PERAN_GLOBAL_TULIS) && u.id !== pengguna.unit_id) return { error: 'Hanya boleh mencatat risiko untuk unit sendiri' };
    if (data.risiko_utama_id) {
      const ru = await prisma.risiko_utama.findUnique({ where: { id: data.risiko_utama_id } });
      if (!ru || !ru.aktif) return { error: 'Risiko utama tidak ditemukan' };
      if (ru.berlaku_untuk !== u.jenis) return { error: `Risiko utama ini hanya untuk unit ${ru.berlaku_untuk}` };
    }
  }
  if (data.kategori_id && !(await prisma.kategori_risiko.findUnique({ where: { id: data.kategori_id } }))) return { error: 'Kategori tidak ditemukan' };
  if (data.penanggung_jawab_id && !(await prisma.pengguna.findUnique({ where: { id: data.penanggung_jawab_id } }))) return { error: 'Penanggung jawab tidak ditemukan' };

  const hasil = { data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) };
  if (b.penyebab !== undefined) hasil.penyebab = daftarUraian(b.penyebab, 'pustaka_penyebab_id');
  if (b.dampak !== undefined) hasil.dampak = daftarUraian(b.dampak, 'pustaka_dampak_id');

  // Penilaian: inheren sekali per periode; residual disimpan sebagai pemantauan bulan berjalan.
  const ctx = await konteksPenilaian();
  hasil.penilaian = [];
  for (const [kunci, jenis, nama] of [['inheren', 'INHEREN', 'Inheren']]) {
    if (!b[kunci]) continue;
    const r = nilaiPenilaian(ctx, b[kunci], nama);
    if (r.error) return r;
    hasil.penilaian.push({ jenis, ...r.data });
  }
  if (b.residual) {
    const r = nilaiPenilaian(ctx, b.residual, 'Residual');
    if (r.error) return r;
    hasil.residual = r.data;
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
  for (const p of h.penilaian || []) {
    const { jenis, ...nilai } = p;
    await tx.penilaian.upsert({ where: { risiko_id_jenis: { risiko_id, jenis } }, update: nilai, create: { risiko_id, jenis, ...nilai } });
  }
  if (h.residual) {
    const now = new Date();
    const kunci = { risiko_id, tahun: now.getFullYear(), bulan: now.getMonth() + 1 };
    const ada = await tx.pemantauan_bulanan.findUnique({ where: { risiko_id_tahun_bulan: kunci } });
    const r = { kemungkinan_residual: h.residual.kemungkinan, dampak_residual: h.residual.dampak, skor: h.residual.skor, level_id: h.residual.level_id };
    if (!ada) await tx.pemantauan_bulanan.create({ data: { ...kunci, ...r } });
    else if (STATUS_BISA_DIUBAH.includes(ada.status_persetujuan)) await tx.pemantauan_bulanan.update({ where: { id: ada.id }, data: r });
    else throw Object.assign(new Error('Pemantauan bulan ini sudah diajukan/final, residual tidak dapat diubah dari register'), { status: 400, expose: true });
  }
}

router.get('/', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  res.json(await prisma.risiko.findMany({
    where: { periode_id, ...cakupanUnit(req.pengguna) },
    include: sertakan,
    orderBy: { dibuat_pada: 'desc' },
  }));
});

router.get('/:id', async (req, res) => {
  const r = await prisma.risiko.findFirst({ where: { id: Number(req.params.id) || -1, ...cakupanUnit(req.pengguna) }, include: sertakan });
  if (!r) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  res.json(r);
});

router.post('/', async (req, res) => {
  const h = await bersihkan(req.body || {}, true, req.pengguna);
  if (h.error) return res.status(400).json({ error: h.error });
  const larang = cekTulis(req.pengguna, h.data.unit_id, 'DRAF');
  if (larang) return res.status(403).json({ error: larang });

  const r = await prisma.$transaction(async (tx) => {
    const baru = await tx.risiko.create({ data: h.data });
    await simpanAnak(tx, baru.id, h);
    return tx.risiko.findUnique({ where: { id: baru.id }, include: sertakan });
  });
  await catat({ req, nama_tabel: 'risiko', id_data: r.id, aksi: 'BUAT', nilai_baru: r });
  res.status(201).json(r);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko.findFirst({ where: { id, ...cakupanUnit(req.pengguna) }, include: sertakan });
  if (!lama) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  const larang = cekTulis(req.pengguna, lama.unit_id, lama.status_persetujuan);
  if (larang) return res.status(403).json({ error: larang });

  const h = await bersihkan(req.body || {}, false, req.pengguna);
  if (h.error) return res.status(400).json({ error: h.error });
  if (h.data.unit_id && h.data.unit_id !== lama.unit_id) {
    const l2 = cekTulis(req.pengguna, h.data.unit_id, lama.status_persetujuan);
    if (l2) return res.status(403).json({ error: l2 });
  }
  // Perubahan Direksi atas data yang sudah diajukan/final ditandai (handoff bagian 8).
  if (req.pengguna.peran.includes('DIREKSI') && !STATUS_BISA_DIUBAH.includes(lama.status_persetujuan)) h.data.diubah_direksi = true;

  const r = await prisma.$transaction(async (tx) => {
    await tx.risiko.update({ where: { id }, data: h.data });
    await simpanAnak(tx, id, h);
    return tx.risiko.findUnique({ where: { id }, include: sertakan });
  });
  await catat({ req, nama_tabel: 'risiko', id_data: id, aksi: 'UBAH', nilai_lama: lama, nilai_baru: r });
  res.json(r);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko.findFirst({ where: { id, ...cakupanUnit(req.pengguna) }, include: sertakan });
  if (!lama) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  if (lama.status_persetujuan !== 'DRAF') return res.status(400).json({ error: 'Hanya risiko berstatus DRAF yang dapat dihapus' });
  const larang = cekTulis(req.pengguna, lama.unit_id, lama.status_persetujuan);
  if (larang) return res.status(403).json({ error: larang });
  await prisma.risiko.delete({ where: { id } });
  await catat({ req, nama_tabel: 'risiko', id_data: id, aksi: 'HAPUS', nilai_lama: lama });
  res.status(204).end();
});

// Riwayat perubahan satu risiko dari jejak audit.
router.get('/:id/riwayat', async (req, res) => {
  const r = await prisma.risiko.findFirst({ where: { id: Number(req.params.id) || -1, ...cakupanUnit(req.pengguna) }, select: { id: true } });
  if (!r) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  res.json(await prisma.jejak_audit.findMany({
    where: { nama_tabel: 'risiko', id_data: String(r.id) },
    select: { id: true, aksi: true, dibuat_pada: true, pengguna: { select: { nama: true } } },
    orderBy: { dibuat_pada: 'desc' },
  }));
});

module.exports = { router };
