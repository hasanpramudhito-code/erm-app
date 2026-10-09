// Seed data dasar: peran, direktorat, unit kerja Pusat (adendum v2 G.3), parameter penilaian, admin awal.
// Idempoten: aman dijalankan ulang. Wajib set SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD.
const bcrypt = require('bcryptjs');
const prisma = require('../src/db');

const PERAN = [
  ['ADMIN', 'Administrator Sistem'],
  ['DIREKSI', 'Direksi'],
  ['PENGELOLA_RISIKO', 'Pengelola Risiko Pusat'],
  ['AUDITOR', 'Auditor Internal (hanya baca)'],
  ['PIMPINAN', 'Pimpinan Unit Kerja'],
  ['PETUGAS', 'Petugas Risiko'],
];

// [kode, nama, jabatan direktur, kode lama sebelum adendum v2]
const DIREKTORAT = [
  ['DIR-UT', 'Direktorat Utama', 'Direktur Utama', 'DIRUT'],
  ['DIR-UM', 'Direktorat Umum', 'Direktur Umum', 'DIRUM'],
  ['DIR-TK', 'Direktorat Teknik', 'Direktur Teknik', 'DIRTEK'],
];

// Struktur Pusat menurut Perbup Kutim 53/2021. Bagian: [kode, nama, direktorat, alur, [sub-bagian: [kode, nama, pengelola?]]].
// Cabang/Unit belum diputuskan klien (adendum v2 J.5): ditambah lewat menu Organisasi.
const BAGIAN = [
  ['SPI', 'Satuan Pengawas Intern', 'DIR-UT', 'SATU_TINGKAT', [['SPI-MR', 'Manajemen Risiko', true], ['SPI-AUD', 'Auditor']]],
  ['UMM', 'Bagian Umum', 'DIR-UM', 'DUA_TINGKAT', [['UMM-UM', 'Umum'], ['UMM-HL', 'Hubungan Langganan'], ['UMM-KPG', 'Kepegawaian'], ['UMM-HMS', 'Humas dan Protokol'], ['UMM-HKM', 'Hukum dan Keamanan']]],
  ['KEU', 'Bagian Keuangan', 'DIR-UM', 'DUA_TINGKAT', [['KEU-ANG', 'Perencanaan Anggaran'], ['KEU-BUK', 'Pembukuan'], ['KEU-KAS', 'Kas dan Penagihan']]],
  ['TEK', 'Bagian Teknik', 'DIR-TK', 'DUA_TINGKAT', [['TEK-REN', 'Perencanaan dan Pengawasan'], ['TEK-TD', 'Transmisi dan Distribusi'], ['TEK-SIM', 'Pengembangan Sistem Informasi Manajemen']]],
  ['PRD', 'Bagian Produksi', 'DIR-TK', 'DUA_TINGKAT', [['PRD-PRD', 'Produksi'], ['PRD-RWT', 'Perawatan Teknik'], ['PRD-LAB', 'Laboratorium']]],
];

const KEMUNGKINAN = [
  [1, 'Sangat Rendah', 'Sangat jarang terjadi (>10 tahun)', '0-10%'],
  [2, 'Rendah', 'Jarang terjadi (5-10 tahun)', '11-30%'],
  [3, 'Sedang', 'Mungkin terjadi (1-5 tahun)', '31-50%'],
  [4, 'Tinggi', 'Sering terjadi (beberapa kali/tahun)', '51-70%'],
  [5, 'Sangat Tinggi', 'Sangat sering terjadi (bulanan)', '71-100%'],
];

const LABEL_DAMPAK = [
  [1, 'Sangat Rendah', 'Dampak tidak signifikan'],
  [2, 'Rendah', 'Dampak terbatas'],
  [3, 'Sedang', 'Dampak signifikan'],
  [4, 'Tinggi', 'Dampak kritis'],
  [5, 'Sangat Tinggi', 'Dampak katastropik'],
];

// [nilai_min, nilai_maks] per kategori untuk nilai 1..5
const KRITERIA_DAMPAK = {
  FINANSIAL: [
    ['0', '< Rp 10.000.000'],
    ['Rp 10.000.000', 'Rp 100.000.000'],
    ['Rp 100.000.000', 'Rp 1.000.000.000'],
    ['Rp 1.000.000.001', 'Rp 10.000.000.000'],
    ['Rp 10.000.000.001', 'tidak hingga'],
  ],
  OPERASIONAL: [
    ['Gangguan minor', 'layanan terhenti < 1 jam.'],
    ['Gangguan 1-4 jam,', 'namun masih bisa diatasi hari itu.'],
    ['Gangguan hingga 1 hari kerja,', 'target harian meleset.'],
    ['Operasional terhenti > 2 hari,', 'komitmen klien gagal.'],
    ['Lumpuh total,', 'perusahaan tidak bisa beroperasi.'],
  ],
  REPUTASI: [
    ['Komplain pelanggan secara individu,', '(internal).'],
    ['Keluhan di sosial media', '(skala lokal)'],
    ['Berita negatif di media massa lokal', 'regional.'],
    ['Berita negatif nasional', 'viral di media sosial.'],
    ['Kehilangan kepercayaan publik secara total', '& permanen.'],
  ],
  LEGAL: [
    ['Teguran lisan,', 'Administratif ringan'],
    ['Teguran tertulis dari otoritas terkait', null],
    ['Gugatan hukum,', 'denda finansial cukup besar'],
    ['Investigasi pidana,', 'pembekuan izin sementara.'],
    ['Pencabutan ijin usaha', 'penutupan permanen'],
  ],
  HSE: [
    ['Cedera ringan, dapat diselesaikan dengan P3K.', 'Tidak ada dampak lingkungan'],
    ['Cedera memerlukan bantuan medis luar/ Puskesmas', 'Dampak lingkungan lokal'],
    ['Cedera berat, hilang hari kerja', 'Dampak lingkungan meluas ke area sekitar.'],
    ['Cacat permanen, 1 kematian.', 'Kerusakan lingkungan serius.'],
    ['Kematian massal, lebih dari 1', 'Kerusakan lingkungan permanen'],
  ],
};

const LEVEL_RISIKO = [
  ['Sangat Rendah', 1, 3, '#4caf50'],
  ['Rendah', 4, 6, '#81c784'],
  ['Sedang', 7, 10, '#ffeb3b'],
  ['Tinggi', 11, 15, '#f57c00'],
  ['Sangat Tinggi', 16, 20, '#d32f2f'],
  ['Ekstrim', 21, 25, '#7b1fa2'],
];

const KATEGORI = [
  ['STR', 'Risiko Strategis', 'Risiko terkait kegagalan strategi bisnis, pencapaian target jangka panjang, dan persaingan pasar.'],
  ['OPR', 'Risiko Operasional', 'Risiko kegagalan proses internal, manusia, sistem, atau kejadian eksternal yang mengganggu operasional.'],
  ['FIN', 'Risiko Finansial', 'Risiko kerugian finansial, fluktuasi nilai tukar, risiko kredit, dan likuiditas cash flow.'],
  ['HSE', 'Risiko K3 (HSE)', 'Risiko keselamatan dan kesehatan kerja karyawan, serta kelestarian lingkungan hidup.'],
  ['REP', 'Risiko Reputasi', 'Risiko rusaknya citra perusahaan di mata publik, pelanggan, dan stakeholder.'],
  ['LGL', 'Risiko Hukum & Kepatuhan', 'Risiko terkait tuntutan hukum, denda regulasi, dan ketidakpatuhan aturan pemerintah.'],
];

const SELERA = [
  ['VERY_LOW', 'Sangat Rendah', '#4caf50', 'Dapat diterima'],
  ['LOW', 'Rendah', '#81c784', 'Dapat diterima dengan kontrol'],
  ['MODERATE', 'Sedang', '#ffeb3b', 'Perlu mitigasi'],
  ['HIGH', 'Tinggi', '#f57c00', 'Perlu mitigasi intensif'],
  ['EXTREME', 'Sangat Tinggi', '#d32f2f', 'Tidak dapat diterima'],
];

const PENGATURAN = {
  metode_penilaian: 'coordinate',
  ambang_toleransi: 13,
  tenggat_pemantauan: 10,
  nama_perusahaan: process.env.SEED_NAMA_PERUSAHAAN || 'Perusahaan Air Minum',
  umum: { autoSave: true, autoSaveInterval: 30, idleTimeout: 15 },
  ui: { themeMode: 'light', compactView: true, sidebarCollapsed: false },
  notifikasi: { emailAlerts: true, systemAnnouncements: true },
};

async function main() {
  const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = process.env;
  if (!email || !password || password.length < 10) {
    throw new Error('Set SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (min 10 karakter).');
  }

  for (const [kode, nama] of PERAN)
    await prisma.peran.upsert({ where: { kode }, update: { nama }, create: { kode, nama } });

  const dir = {};
  for (const [kode, nama, nama_jabatan_direktur, lama] of DIREKTORAT) {
    await prisma.direktorat.updateMany({ where: { kode: lama }, data: { kode } });
    dir[kode] = (await prisma.direktorat.upsert({ where: { kode }, update: {}, create: { kode, nama, nama_jabatan_direktur } })).id;
  }

  for (const [kode, nama, d, alur_persetujuan, sub] of BAGIAN) {
    const induk = await prisma.unit_kerja.upsert({
      where: { kode }, update: {},
      create: { kode, nama, jenis: 'BAGIAN', direktorat_id: dir[d], pemilik_risiko: true, alur_persetujuan },
    });
    for (const [k, n, pengelola = false] of sub)
      await prisma.unit_kerja.upsert({
        where: { kode: k }, update: {},
        create: { kode: k, nama: n, jenis: 'SUB_BAGIAN', induk_id: induk.id, direktorat_id: dir[d], pemilik_risiko: false, adalah_pengelola_risiko: pengelola },
      });
  }

  for (const [nilai, label, deskripsi, probabilitas] of KEMUNGKINAN)
    await prisma.skala_kemungkinan.upsert({ where: { nilai }, update: {}, create: { nilai, label, deskripsi, probabilitas } });

  for (const [kategori, rows] of Object.entries(KRITERIA_DAMPAK))
    for (const [i, [nilai_min, nilai_maks]] of rows.entries()) {
      const [nilai, label, deskripsi] = LABEL_DAMPAK[i];
      await prisma.skala_dampak.upsert({
        where: { kategori_nilai: { kategori, nilai } },
        update: {},
        create: { kategori, nilai, label, deskripsi, nilai_min, nilai_maks },
      });
    }

  for (const [i, [nama, skor_min, skor_maks, warna]] of LEVEL_RISIKO.entries())
    await prisma.level_risiko.upsert({ where: { nama }, update: {}, create: { nama, skor_min, skor_maks, warna, urutan: i + 1 } });

  for (const [kode, nama, deskripsi] of KATEGORI)
    await prisma.kategori_risiko.upsert({ where: { kode }, update: {}, create: { kode, nama, deskripsi } });

  for (const [i, [kode, nama, warna, deskripsi]] of SELERA.entries())
    await prisma.level_selera_risiko.upsert({ where: { kode }, update: {}, create: { kode, nama, warna, deskripsi, urutan: i + 1 } });

  for (const [kunci, nilai] of Object.entries(PENGATURAN))
    await prisma.pengaturan.upsert({ where: { kunci }, update: {}, create: { kunci, nilai } });

  const tahun = new Date().getFullYear();
  if (!(await prisma.periode.findFirst({ where: { nama: String(tahun) } })))
    await prisma.periode.create({ data: { nama: String(tahun), tanggal_mulai: new Date(`${tahun}-01-01`), tanggal_selesai: new Date(`${tahun}-12-31`) } });

  const adminPeran = await prisma.peran.findUnique({ where: { kode: 'ADMIN' } });
  await prisma.pengguna.upsert({
    where: { email },
    update: {},
    create: {
      nama: 'Administrator',
      email,
      kata_sandi_hash: await bcrypt.hash(password, 12),
      peran: { create: { peran_id: adminPeran.id } },
    },
  });

  console.log('Seed selesai.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
