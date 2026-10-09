// API data master: organisasi (direktorat, unit kerja) dan parameter penilaian.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran } = require('./auth');
const { catat } = require('./audit');
const { crud, teks, angka } = require('./crud');

// Dimuat saat dipakai untuk menghindari require melingkar.
const bentukEntri = (...a) => require('./risiko-utama').bentukEntriCabang(...a);

const ADMIN = ['ADMIN'];
const PENGELOLA = ['ADMIN', 'PENGELOLA_RISIKO'];
const WARNA = /^#[0-9a-fA-F]{6}$/;
const KATEGORI_DAMPAK = ['FINANSIAL', 'OPERASIONAL', 'REPUTASI', 'LEGAL', 'HSE'];

// Hapus key bernilai undefined agar PATCH hanya menulis kolom yang dikirim.
const rapikan = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const wajib = (data, kolom, baru) => baru && kolom.find((k) => data[k] === undefined || data[k] === null);

const router = express.Router();

router.use('/direktorat', crud({
  model: 'direktorat',
  penulis: ADMIN,
  orderBy: { kode: 'asc' },
  bersihkan: (b, baru) => {
    const data = rapikan({ kode: teks(b.kode)?.toUpperCase(), nama: teks(b.nama), nama_jabatan_direktur: teks(b.nama_jabatan_direktur) });
    const kurang = wajib(data, ['kode', 'nama', 'nama_jabatan_direktur'], baru);
    return kurang ? { error: `${kurang} wajib diisi` } : { data };
  },
}));

// Unit kerja (adendum v2 C, G.1). CABANG & UNIT sama-sama kantor wilayah (WILAYAH).
const WILAYAH = ['CABANG', 'UNIT'];
const JENIS_UK = ['BAGIAN', 'SUB_BAGIAN', ...WILAYAH];
router.use('/unit-kerja', crud({
  model: 'unit_kerja',
  penulis: ADMIN,
  // Cabang/Unit baru atau aktif kembali: bentuk entri risiko utama CABANG di periode terbuka.
  setelah: (r, lama) => (WILAYAH.includes(r.jenis) && r.aktif && (!lama || !lama.aktif || !WILAYAH.includes(lama.jenis)) ? bentukEntri() : null),
  orderBy: [{ jenis: 'asc' }, { kode: 'asc' }],
  include: { direktorat: { select: { id: true, kode: true, nama: true } }, _count: { select: { pengguna: { where: { aktif: true } } } } },
  bersihkan: async (b, baru, lama) => {
    const data = rapikan({
      kode: teks(b.kode),
      nama: teks(b.nama),
      deskripsi: teks(b.deskripsi),
      jenis: b.jenis,
      direktorat_id: b.direktorat_id === undefined ? undefined : angka(b.direktorat_id) ?? null,
      induk_id: b.induk_id === undefined ? undefined : angka(b.induk_id) ?? null,
      pemilik_risiko: b.pemilik_risiko === undefined ? undefined : Boolean(b.pemilik_risiko),
      adalah_pengelola_risiko: b.adalah_pengelola_risiko === undefined ? undefined : Boolean(b.adalah_pengelola_risiko),
      alur_persetujuan: b.alur_persetujuan === undefined ? undefined : b.alur_persetujuan || null,
      aktif: b.aktif === undefined ? undefined : Boolean(b.aktif),
    });
    const kurang = wajib(data, ['kode', 'nama', 'jenis'], baru);
    if (kurang) return { error: `${kurang} wajib diisi` };
    if (data.jenis && !JENIS_UK.includes(data.jenis)) return { error: `Jenis harus salah satu dari ${JENIS_UK.join(', ')}` };
    if (data.alur_persetujuan && !['DUA_TINGKAT', 'SATU_TINGKAT'].includes(data.alur_persetujuan)) return { error: 'Alur persetujuan harus DUA_TINGKAT atau SATU_TINGKAT' };
    // Default (G.3): sub-bagian bukan pemilik risiko; pemilik risiko memakai alur dua tingkat.
    const jenis = data.jenis ?? lama?.jenis;
    if (baru && data.pemilik_risiko === undefined) data.pemilik_risiko = jenis !== 'SUB_BAGIAN';
    const pemilik = data.pemilik_risiko ?? lama?.pemilik_risiko;
    if (!pemilik) data.alur_persetujuan = null;
    else if (!(data.alur_persetujuan ?? lama?.alur_persetujuan)) data.alur_persetujuan = 'DUA_TINGKAT';
    if (jenis === 'SUB_BAGIAN' && !(data.induk_id ?? lama?.induk_id)) return { error: 'Sub-bagian wajib punya induk' };
    // Cegah siklus induk: induk tidak boleh diri sendiri atau turunannya.
    if (data.induk_id && lama) {
      for (let id = data.induk_id; id; id = (await prisma.unit_kerja.findUnique({ where: { id } }))?.induk_id)
        if (id === lama.id) return { error: 'Induk unit kerja tidak boleh unit kerja itu sendiri atau turunannya' };
    }
    return { data };
  },
}));

router.use('/skala-kemungkinan', crud({
  model: 'skala_kemungkinan',
  penulis: PENGELOLA,
  orderBy: { nilai: 'asc' },
  bersihkan: (b, baru) => {
    const data = rapikan({ nilai: angka(b.nilai), label: teks(b.label), deskripsi: teks(b.deskripsi), probabilitas: teks(b.probabilitas) });
    const kurang = wajib(data, ['nilai', 'label'], baru);
    if (kurang) return { error: `${kurang} wajib diisi` };
    if (data.nilai !== undefined && !(Number.isInteger(data.nilai) && data.nilai >= 1 && data.nilai <= 10)) return { error: 'Nilai harus bilangan 1-10' };
    return { data };
  },
}));

router.use('/skala-dampak', crud({
  model: 'skala_dampak',
  penulis: PENGELOLA,
  orderBy: [{ kategori: 'asc' }, { nilai: 'asc' }],
  bersihkan: (b, baru) => {
    const data = rapikan({
      kategori: teks(b.kategori)?.toUpperCase(),
      nilai: angka(b.nilai),
      label: teks(b.label),
      deskripsi: teks(b.deskripsi),
      nilai_min: teks(b.nilai_min),
      nilai_maks: teks(b.nilai_maks),
      warna: teks(b.warna),
    });
    const kurang = wajib(data, ['kategori', 'nilai', 'label'], baru);
    if (kurang) return { error: `${kurang} wajib diisi` };
    if (data.kategori && !KATEGORI_DAMPAK.includes(data.kategori)) return { error: `Kategori harus salah satu: ${KATEGORI_DAMPAK.join(', ')}` };
    if (data.nilai !== undefined && !(Number.isInteger(data.nilai) && data.nilai >= 1 && data.nilai <= 10)) return { error: 'Nilai harus bilangan 1-10' };
    return { data };
  },
}));

router.use('/level-risiko', crud({
  model: 'level_risiko',
  penulis: PENGELOLA,
  orderBy: { skor_min: 'asc' },
  bersihkan: async (b, baru, lama) => {
    const data = rapikan({ nama: teks(b.nama), skor_min: angka(b.skor_min), skor_maks: angka(b.skor_maks), warna: teks(b.warna), urutan: angka(b.urutan) });
    const kurang = wajib(data, ['nama', 'skor_min', 'skor_maks', 'warna'], baru);
    if (kurang) return { error: `${kurang} wajib diisi` };
    if (data.warna && !WARNA.test(data.warna)) return { error: 'Warna harus format #RRGGBB' };
    const min = data.skor_min ?? lama?.skor_min;
    const maks = data.skor_maks ?? lama?.skor_maks;
    if (min > maks) return { error: 'Skor minimum tidak boleh lebih besar dari maksimum' };
    const tumpang = await prisma.level_risiko.findFirst({
      where: { skor_min: { lte: maks }, skor_maks: { gte: min }, ...(lama ? { NOT: { id: lama.id } } : {}) },
    });
    if (tumpang) return { error: `Rentang skor bertumpang tindih dengan level "${tumpang.nama}"` };
    if (baru && data.urutan === undefined) data.urutan = min;
    return { data };
  },
}));

router.use('/kategori-risiko', crud({
  model: 'kategori_risiko',
  penulis: PENGELOLA,
  orderBy: { kode: 'asc' },
  bersihkan: (b, baru) => {
    const data = rapikan({ kode: teks(b.kode)?.toUpperCase(), nama: teks(b.nama), deskripsi: teks(b.deskripsi), warna: teks(b.warna) });
    const kurang = wajib(data, ['kode', 'nama'], baru);
    return kurang ? { error: `${kurang} wajib diisi` } : { data };
  },
}));

router.use('/level-selera-risiko', crud({
  model: 'level_selera_risiko',
  penulis: PENGELOLA,
  orderBy: { urutan: 'asc' },
  bersihkan: (b, baru) => {
    const data = rapikan({ kode: teks(b.kode)?.toUpperCase(), nama: teks(b.nama), warna: teks(b.warna), deskripsi: teks(b.deskripsi), tindakan: teks(b.tindakan), urutan: angka(b.urutan) });
    const kurang = wajib(data, ['kode', 'nama', 'warna'], baru);
    if (kurang) return { error: `${kurang} wajib diisi` };
    if (baru && data.urutan === undefined) data.urutan = 99;
    return { data };
  },
}));

router.use('/periode', crud({
  model: 'periode',
  penulis: PENGELOLA,
  // Periode dibuka: bentuk entri draf risiko utama CABANG untuk setiap cabang (handoff 5.1).
  setelah: (r, lama) => (r.status === 'TERBUKA' && (!lama || lama.status !== 'TERBUKA') ? bentukEntri(r.id) : null),
  orderBy: { tanggal_mulai: 'desc' },
  bersihkan: (b, baru, lama) => {
    const tgl = (v) => (v === undefined ? undefined : new Date(v));
    const data = rapikan({ nama: teks(b.nama), tanggal_mulai: tgl(b.tanggal_mulai), tanggal_selesai: tgl(b.tanggal_selesai), status: b.status });
    const kurang = wajib(data, ['nama', 'tanggal_mulai', 'tanggal_selesai'], baru);
    if (kurang) return { error: `${kurang} wajib diisi` };
    if ([data.tanggal_mulai, data.tanggal_selesai].some((d) => d && isNaN(d))) return { error: 'Tanggal tidak valid' };
    if ((data.tanggal_mulai ?? lama?.tanggal_mulai) > (data.tanggal_selesai ?? lama?.tanggal_selesai)) return { error: 'Tanggal mulai melewati tanggal selesai' };
    if (data.status && !['PERSIAPAN', 'TERBUKA', 'DITUTUP'].includes(data.status)) return { error: 'Status harus PERSIAPAN, TERBUKA, atau DITUTUP' };
    return { data };
  },
}));

// ---- Pengaturan (key-value) ----
// Kunci yang boleh dibaca semua pengguna login; sisanya hanya admin.
const PENGATURAN_PUBLIK = ['metode_penilaian', 'ambang_toleransi', 'ui', 'tenggat_pemantauan', 'nama_perusahaan'];
const PENGATURAN_PENGELOLA = ['metode_penilaian', 'ambang_toleransi', 'tenggat_pemantauan'];
const VALIDASI_PENGATURAN = {
  metode_penilaian: (v) => ['multiplication', 'coordinate'].includes(v) || 'Metode harus multiplication atau coordinate',
  ambang_toleransi: (v) => (Number.isInteger(v) && v >= 1 && v <= 100) || 'Ambang toleransi harus bilangan 1-100',
  nama_perusahaan: (v) => (typeof v === 'string' && v.trim().length >= 2 && v.length <= 150) || 'Nama perusahaan 2-150 karakter',
  tenggat_pemantauan: (v) => (Number.isInteger(v) && v >= 1 && v <= 28) || 'Tenggat harus tanggal 1-28',
  umum: (v) => (v && typeof v === 'object' && !Array.isArray(v)) || 'Harus objek',
  ui: (v) => (v && typeof v === 'object' && !Array.isArray(v)) || 'Harus objek',
  notifikasi: (v) => (v && typeof v === 'object' && !Array.isArray(v)) || 'Harus objek',
};

router.get('/pengaturan', wajibLogin, async (req, res) => {
  const semua = req.pengguna.peran.includes('ADMIN');
  const rows = await prisma.pengaturan.findMany(semua ? {} : { where: { kunci: { in: PENGATURAN_PUBLIK } } });
  res.json(Object.fromEntries(rows.map((r) => [r.kunci, r.nilai])));
});

router.put('/pengaturan/:kunci', wajibLogin, async (req, res) => {
  const { kunci } = req.params;
  const boleh = PENGATURAN_PENGELOLA.includes(kunci) ? PENGELOLA : ADMIN;
  if (!req.pengguna.peran.some((p) => boleh.includes(p))) return res.status(403).json({ error: 'Akses ditolak' });
  const cek = VALIDASI_PENGATURAN[kunci];
  if (!cek) return res.status(400).json({ error: 'Kunci pengaturan tidak dikenal' });
  const nilai = req.body?.nilai;
  const hasil = cek(nilai);
  if (hasil !== true) return res.status(400).json({ error: hasil });

  const lama = await prisma.pengaturan.findUnique({ where: { kunci } });
  const r = await prisma.pengaturan.upsert({ where: { kunci }, update: { nilai }, create: { kunci, nilai } });
  await catat({ req, nama_tabel: 'pengaturan', id_data: kunci, aksi: 'UBAH', nilai_lama: lama?.nilai, nilai_baru: nilai });
  res.json({ [kunci]: r.nilai });
});

// Konfigurasi penilaian gabungan untuk frontend (satu request saat aplikasi dibuka).
router.get('/konfigurasi-penilaian', wajibLogin, async (req, res) => {
  const [kemungkinan, dampak, level, pengaturan] = await Promise.all([
    prisma.skala_kemungkinan.findMany({ orderBy: { nilai: 'asc' } }),
    prisma.skala_dampak.findMany({ orderBy: [{ kategori: 'asc' }, { nilai: 'asc' }] }),
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' } }),
    prisma.pengaturan.findMany({ where: { kunci: { in: ['metode_penilaian', 'ambang_toleransi'] } } }),
  ]);
  const p = Object.fromEntries(pengaturan.map((r) => [r.kunci, r.nilai]));
  res.json({ kemungkinan, dampak, level, metode_penilaian: p.metode_penilaian ?? 'multiplication', ambang_toleransi: p.ambang_toleransi ?? 13 });
});

module.exports = { router };
