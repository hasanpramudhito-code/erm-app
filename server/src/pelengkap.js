// API modul pelengkap: pengujian kontrol, selera risiko, budaya risiko, RACI.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran, cakupanUnit } = require('./auth');
const { catat } = require('./audit');
const { crud, teks, angka } = require('./crud');

const PENGELOLA = ['ADMIN_SISTEM', 'PENGELOLA_RISIKO'];
const rapikan = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const wajib = (data, kolom, baru) => baru && kolom.find((k) => data[k] === undefined || data[k] === null);
const tgl = (v) => (v === undefined ? undefined : v ? new Date(v) : null);
const idOpsional = (v) => (v === undefined ? undefined : angka(v) ?? null);

// Validasi umum: kolom wajib, enum, tanggal. `enumnya` = {kolom: [nilai sah]}.
function periksa(data, baru, kolomWajib, enumnya = {}) {
  const kurang = wajib(data, kolomWajib, baru);
  if (kurang) return { error: `${kurang} wajib diisi` };
  for (const [k, sah] of Object.entries(enumnya))
    if (data[k] !== undefined && !sah.includes(data[k])) return { error: `${k} harus salah satu dari ${sah.join(', ')}` };
  if (Object.values(data).some((v) => v instanceof Date && isNaN(v))) return { error: 'Tanggal tidak valid' };
  return { data };
}

const JENIS_KONTROL = ['PREVENTIF', 'DETEKTIF', 'KOREKTIF'];
const FREKUENSI = ['HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN'];
const JENIS_UJI = ['DESAIN', 'OPERASIONAL', 'KEDUANYA'];
const ringkasKontrol = { kontrol: { select: { id: true, kode: true, nama: true } } };
const ringkasOrang = (k) => ({ [k]: { select: { id: true, nama: true } } });

const router = express.Router();

router.use('/kontrol', crud({
  model: 'kontrol',
  penulis: PENGELOLA,
  orderBy: { nama: 'asc' },
  include: { unit: { select: { id: true, nama: true } }, ...ringkasOrang('pemilik'),
    hasil_pengujian: { orderBy: { tanggal_uji: 'desc' }, take: 1, select: { tanggal_uji: true, hasil: true, peringkat_efektivitas: true } } },
  bersihkan: (b, baru) => periksa(rapikan({
    kode: teks(b.kode), nama: teks(b.nama), deskripsi: teks(b.deskripsi), kategori: teks(b.kategori),
    jenis: b.jenis, frekuensi: b.frekuensi, tujuan: teks(b.tujuan), prosedur_pengujian: teks(b.prosedur_pengujian),
    unit_id: idOpsional(b.unit_id), pemilik_id: idOpsional(b.pemilik_id),
    aktif: b.aktif === undefined ? undefined : Boolean(b.aktif),
  }), baru, ['nama', 'jenis'], { jenis: JENIS_KONTROL, frekuensi: FREKUENSI }),
}));

router.use('/jadwal-pengujian', crud({
  model: 'jadwal_pengujian',
  penulis: PENGELOLA,
  orderBy: { tanggal_jadwal: 'asc' },
  include: { ...ringkasKontrol, ...ringkasOrang('penguji') },
  bersihkan: (b, baru) => periksa(rapikan({
    kontrol_id: angka(b.kontrol_id), tanggal_jadwal: tgl(b.tanggal_jadwal), penguji_id: idOpsional(b.penguji_id),
    jenis_pengujian: b.jenis_pengujian, catatan: teks(b.catatan), status: b.status,
  }), baru, ['kontrol_id', 'tanggal_jadwal', 'jenis_pengujian'], { jenis_pengujian: JENIS_UJI, status: ['DIJADWALKAN', 'SELESAI', 'DIBATALKAN'] }),
}));

router.use('/hasil-pengujian', crud({
  model: 'hasil_pengujian',
  penulis: PENGELOLA,
  orderBy: { tanggal_uji: 'desc' },
  include: { ...ringkasKontrol, ...ringkasOrang('penguji') },
  // Hasil yang mengacu jadwal menandai jadwal itu selesai.
  setelah: (r) => (r.jadwal_id ? prisma.jadwal_pengujian.update({ where: { id: r.jadwal_id }, data: { status: 'SELESAI' } }) : null),
  bersihkan: (b, baru) => {
    const cek = periksa(rapikan({
      kontrol_id: angka(b.kontrol_id), jadwal_id: idOpsional(b.jadwal_id), tanggal_uji: tgl(b.tanggal_uji),
      penguji_id: idOpsional(b.penguji_id), jenis_pengujian: b.jenis_pengujian, hasil: b.hasil,
      peringkat_efektivitas: angka(b.peringkat_efektivitas), ukuran_sampel: idOpsional(b.ukuran_sampel),
      jumlah_pengecualian: angka(b.jumlah_pengecualian), catatan: teks(b.catatan),
    }), baru, ['kontrol_id', 'tanggal_uji', 'jenis_pengujian', 'hasil', 'peringkat_efektivitas'],
    { jenis_pengujian: JENIS_UJI, hasil: ['EFEKTIF', 'SEBAGIAN_EFEKTIF', 'TIDAK_EFEKTIF'] });
    const p = cek.data?.peringkat_efektivitas;
    if (p !== undefined && !(Number.isInteger(p) && p >= 1 && p <= 5)) return { error: 'Peringkat efektivitas harus 1-5' };
    return cek;
  },
}));

router.use('/defisiensi', crud({
  model: 'defisiensi',
  penulis: PENGELOLA,
  orderBy: { tanggal_identifikasi: 'desc' },
  include: { ...ringkasKontrol, ...ringkasOrang('ditugaskan_ke') },
  bersihkan: (b, baru) => periksa(rapikan({
    kontrol_id: idOpsional(b.kontrol_id), hasil_pengujian_id: idOpsional(b.hasil_pengujian_id),
    judul: teks(b.judul), deskripsi: teks(b.deskripsi), kategori: teks(b.kategori), dampak_risiko: teks(b.dampak_risiko),
    akar_masalah: teks(b.akar_masalah), rekomendasi: teks(b.rekomendasi), ditugaskan_ke_id: idOpsional(b.ditugaskan_ke_id),
    tingkat_keparahan: b.tingkat_keparahan, status: b.status,
    tanggal_identifikasi: tgl(b.tanggal_identifikasi), tanggal_target: tgl(b.tanggal_target),
  }), baru, ['judul', 'tanggal_identifikasi'], {
    tingkat_keparahan: ['PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'], status: ['TERBUKA', 'BERJALAN', 'SELESAI', 'DITUTUP'],
  }),
}));

// batas_toleransi: {rendah:{min,maks}, sedang:{min,maks}, tinggi:{min,maks}}, angka berurutan.
const batasSah = (b) => ['rendah', 'sedang', 'tinggi'].every((k) => Number.isFinite(b?.[k]?.min) && Number.isFinite(b?.[k]?.maks) && b[k].min <= b[k].maks);

router.use('/pernyataan-selera-risiko', crud({
  model: 'pernyataan_selera_risiko',
  penulis: PENGELOLA,
  orderBy: { id: 'asc' },
  include: { kategori: { select: { id: true, kode: true, nama: true } } },
  bersihkan: (b, baru) => {
    const cek = periksa(rapikan({
      kategori_id: idOpsional(b.kategori_id), pernyataan: teks(b.pernyataan), batas_toleransi: b.batas_toleransi,
      proses_eskalasi: teks(b.proses_eskalasi), aktif: b.aktif === undefined ? undefined : Boolean(b.aktif),
    }), baru, ['pernyataan', 'batas_toleransi']);
    if (cek.data?.batas_toleransi !== undefined && !batasSah(cek.data.batas_toleransi)) return { error: 'Batas toleransi rendah/sedang/tinggi harus angka dengan min ≤ maks' };
    return cek;
  },
}));

// ---- Budaya risiko ----
// Pertanyaan: [{id, kategori, pertanyaan, opsi:[{nilai,label}]}]. Skor respons = rata-rata jawaban / nilai maks × 100.
const pertanyaanSah = (q) => Array.isArray(q) && q.length > 0 && q.every((x) => x?.id && x.pertanyaan && Array.isArray(x.opsi) && x.opsi.length >= 2);

// Rekap per kategori, dihitung dari pertanyaan survei itu sendiri (bukan daftar baku di frontend).
function rekapBudaya(pertanyaan, respons) {
  const kat = {};
  for (const q of pertanyaan) {
    const maks = Math.max(...q.opsi.map((o) => Number(o.nilai)));
    const k = (kat[q.kategori || 'Umum'] ??= { jumlah: 0, total: 0 });
    for (const r of respons) {
      const v = Number(r.jawaban?.[q.id]);
      if (Number.isFinite(v)) { k.jumlah++; k.total += (v / maks) * 100; }
    }
  }
  return Object.fromEntries(Object.entries(kat).map(([k, v]) => [k, v.jumlah ? Math.round(v.total / v.jumlah) : 0]));
}


const budaya = express.Router();
budaya.use(wajibLogin);

// Hasil hanya untuk pengelola & direksi; jawaban per orang tidak dikirim.
budaya.get('/:id/hasil', wajibPeran(...PENGELOLA, 'DIREKSI'), async (req, res) => {
  const s = await prisma.survei_budaya.findUnique({ where: { id: Number(req.params.id) || -1 }, include: { respons: { orderBy: { dibuat_pada: 'desc' } } } });
  if (!s) return res.status(404).json({ error: 'Survei tidak ditemukan' });
  const { respons, ...survei } = s;
  const daftar = respons.map((r) => ({ id: r.id, nama_responden: r.nama_responden, peran_responden: r.peran_responden, skor: r.skor, dibuat_pada: r.dibuat_pada }));
  const rata = respons.length ? Math.round(respons.reduce((t, r) => t + Number(r.skor), 0) / respons.length) : 0;
  res.json({ survei, jumlah_respons: respons.length, skor_rata: rata, kategori: rekapBudaya(s.pertanyaan, respons), respons: daftar });
});

// Semua pengguna login boleh mengisi survei yang terbit; skor dihitung server.
budaya.post('/:id/respons', async (req, res) => {
  const s = await prisma.survei_budaya.findUnique({ where: { id: Number(req.params.id) || -1 } });
  if (!s) return res.status(404).json({ error: 'Survei tidak ditemukan' });
  if (s.status !== 'TERBIT') return res.status(400).json({ error: 'Survei tidak sedang dibuka' });
  if (await prisma.respons_budaya.findFirst({ where: { survei_id: s.id, responden_id: req.pengguna.id } })) return res.status(409).json({ error: 'Anda sudah mengisi survei ini' });
  const jawaban = req.body?.jawaban || {};
  const nilai = [];
  for (const q of s.pertanyaan) {
    const v = Number(jawaban[q.id]);
    if (!q.opsi.some((o) => Number(o.nilai) === v)) return res.status(400).json({ error: `Jawaban pertanyaan "${q.pertanyaan}" tidak valid` });
    nilai.push((v / Math.max(...q.opsi.map((o) => Number(o.nilai)))) * 100);
  }
  const r = await prisma.respons_budaya.create({ data: {
    survei_id: s.id, responden_id: req.pengguna.id, nama_responden: teks(req.body.nama_responden) ?? req.pengguna.nama,
    peran_responden: teks(req.body.peran_responden), jawaban: Object.fromEntries(s.pertanyaan.map((q) => [q.id, Number(jawaban[q.id])])),
    skor: Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100,
  } });
  await catat({ req, nama_tabel: 'respons_budaya', id_data: r.id, aksi: 'BUAT', nilai_baru: r });
  res.status(201).json(r);
});

// ---- RACI per risiko ----
const raci = express.Router();
raci.use(wajibLogin);

raci.get('/', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  res.json(await prisma.risiko.findMany({
    where: { periode_id, ...cakupanUnit(req.pengguna) },
    select: { id: true, kode: true, nama: true, unit: { select: { id: true, nama: true } },
      raci: { select: { peran: true, pengguna: { select: { id: true, nama: true } } } } },
    orderBy: { kode: 'asc' },
  }));
});

// Isi/ganti satu sel; pengguna_id null = kosongkan.
raci.put('/:risiko_id/:peran', wajibPeran(...PENGELOLA), async (req, res) => {
  const risiko_id = Number(req.params.risiko_id) || -1;
  const { peran } = req.params;
  if (!['R', 'A', 'C', 'I'].includes(peran)) return res.status(400).json({ error: 'Peran RACI harus R, A, C, atau I' });
  if (!(await prisma.risiko.findUnique({ where: { id: risiko_id }, select: { id: true } }))) return res.status(404).json({ error: 'Risiko tidak ditemukan' });
  const kunci = { risiko_id_peran: { risiko_id, peran } };
  const lama = await prisma.raci.findUnique({ where: kunci });
  const pengguna_id = angka(req.body?.pengguna_id);
  if (!pengguna_id) {
    if (lama) await prisma.raci.delete({ where: kunci });
    await catat({ req, nama_tabel: 'raci', id_data: lama?.id ?? `${risiko_id}-${peran}`, aksi: 'HAPUS', nilai_lama: lama });
    return res.status(204).end();
  }
  const r = await prisma.raci.upsert({ where: kunci, update: { pengguna_id }, create: { risiko_id, peran, pengguna_id } });
  await catat({ req, nama_tabel: 'raci', id_data: r.id, aksi: lama ? 'UBAH' : 'BUAT', nilai_lama: lama, nilai_baru: r });
  res.json(r);
});

// Rute khusus dipasang sebelum CRUD: router CRUD menolak non-pengelola untuk semua rute selain GET /.
router.use('/survei-budaya', budaya);
router.use('/survei-budaya', crud({
  model: 'survei_budaya',
  penulis: PENGELOLA,
  orderBy: { dibuat_pada: 'desc' },
  include: { _count: { select: { respons: true } } },
  bersihkan: (b, baru) => {
    const cek = periksa(rapikan({ judul: teks(b.judul), deskripsi: teks(b.deskripsi), pertanyaan: b.pertanyaan, status: b.status }),
      baru, ['judul', 'pertanyaan'], { status: ['DRAF', 'TERBIT', 'DITUTUP'] });
    if (cek.data?.pertanyaan !== undefined && !pertanyaanSah(cek.data.pertanyaan)) return { error: 'Pertanyaan survei tidak valid' };
    return cek;
  },
}));
router.use('/raci', raci);

module.exports = { router, rekapBudaya };
