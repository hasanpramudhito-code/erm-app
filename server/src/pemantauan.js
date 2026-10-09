// API laporan pemantauan per risiko: realisasi mitigasi, nilai KRI, catatan, peristiwa risiko.
// Frekuensi diatur admin (pengaturan frekuensi_pemantauan = 1 bulanan, 2 dua bulanan, 3 triwulanan).
// Satu laporan per jendela; disimpan dengan (tahun, bulan) = bulan terakhir jendela, mis. triwulan III -> bulan 9.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnitKerja } = require('./auth');
const { catat } = require('./audit');

const router = express.Router();
router.use(wajibLogin);

const PERAN_GLOBAL_TULIS = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO'];
const PERAN_UNIT_TULIS = ['PIMPINAN', 'PETUGAS'];
const STATUS_BISA_DIUBAH = ['DRAF', 'DIKEMBALIKAN'];
const STATUS_MITIGASI = ['DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'TERLAMBAT', 'DIBATALKAN'];
const TENGGAT_DEFAULT = 10;

const punya = (pengguna, daftar) => pengguna.peran.some((p) => daftar.includes(p));
const galat = (status, message) => Object.assign(new Error(message), { status, expose: true });

// Status KRI dari nilai & ambang. Arah LEBIH_RENDAH: hijau <= ambang_hijau, merah >= ambang_merah.
function statusKri(kri, nilai) {
  const [h, k, m] = [kri.ambang_hijau, kri.ambang_kuning, kri.ambang_merah].map(Number);
  if (kri.arah_target === 'LEBIH_TINGGI') return nilai >= h ? 'HIJAU' : nilai > m ? 'KUNING' : 'MERAH';
  return nilai <= h ? 'HIJAU' : nilai < m ? 'KUNING' : 'MERAH';
}

async function frekuensi() {
  const p = await prisma.pengaturan.findUnique({ where: { kunci: 'frekuensi_pemantauan' } });
  return [1, 2, 3].includes(Number(p?.nilai)) ? Number(p.nilai) : 1;
}

async function tanggalTenggat() {
  const p = await prisma.pengaturan.findUnique({ where: { kunci: 'tenggat_pemantauan' } });
  return Number(p?.nilai) || TENGGAT_DEFAULT;
}

// Tenggat laporan bulan (tahun, bulan) = tanggal N pada bulan berikutnya, akhir hari.
const tenggat = (tahun, bulan, tgl) => new Date(tahun, bulan, tgl, 23, 59, 59);

const sertakanLaporan = {
  realisasi_mitigasi: true,
  pengukuran_kri: true,
  insiden: { select: { id: true, tanggal_kejadian: true, deskripsi: true, dampak: true, kerugian: true, tindakan_segera: true } },
};

async function ambilRisiko(req, id) {
  const r = await prisma.risiko.findFirst({
    where: { id, ...cakupanUnitKerja(req.pengguna) },
    include: {
      periode: true,
      unit_kerja: { select: { alur_persetujuan: true } },
      mitigasi: { orderBy: { id: 'asc' }, include: { penanggung_jawab: { select: { id: true, nama: true } } } },
      kri: { where: { aktif: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!r) throw galat(404, 'Risiko tidak ditemukan');
  return r;
}

// Validasi jendela laporan; kembalikan bulan pertama jendela.
function cekBulan(tahun, bulan, periode, n) {
  if (!Number.isInteger(tahun) || !Number.isInteger(bulan) || bulan < 1 || bulan > 12) throw galat(400, 'Tahun/bulan tidak valid');
  if (bulan % n) throw galat(400, 'Bulan tidak sesuai frekuensi pemantauan');
  const bulanAwal = bulan - n + 1;
  const awal = new Date(tahun, bulanAwal - 1, 1);
  const akhir = new Date(tahun, bulan, 0);
  if (akhir < periode.tanggal_mulai || awal > periode.tanggal_selesai) throw galat(400, 'Bulan di luar periode risiko');
  if (awal > new Date()) throw galat(400, 'Belum bisa melaporkan masa yang akan datang');
  return bulanAwal;
}

// Laporan satu risiko untuk satu bulan + data pembanding bulan sebelumnya.
router.get('/risiko/:risikoId/:tahun/:bulan', async (req, res) => {
  const [risiko_id, tahun, bulan] = [req.params.risikoId, req.params.tahun, req.params.bulan].map(Number);
  const risiko = await ambilRisiko(req, risiko_id);
  const n = await frekuensi();
  const bulan_awal = cekBulan(tahun, bulan, risiko.periode, n);
  const [laporan, sebelumnya, tgl] = await Promise.all([
    prisma.pemantauan_bulanan.findUnique({ where: { risiko_id_tahun_bulan: { risiko_id, tahun, bulan } }, include: sertakanLaporan }),
    prisma.pemantauan_bulanan.findFirst({
      where: { risiko_id, OR: [{ tahun: { lt: tahun } }, { tahun, bulan: { lt: bulan } }] },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
      include: { realisasi_mitigasi: true, pengukuran_kri: true },
    }),
    tanggalTenggat(),
  ]);
  res.json({ risiko, laporan, sebelumnya, tenggat: tenggat(tahun, bulan, tgl), frekuensi: n, bulan_awal });
});

// Simpan (buat/ubah) laporan. Body: { catatan, peristiwa_terjadi, mitigasi:[{mitigasi_id,status,progres,keterangan}],
//   kri:[{kri_id,nilai,catatan}], peristiwa:[{tanggal_kejadian,deskripsi,dampak,kerugian,tindakan_segera}] }
router.put('/risiko/:risikoId/:tahun/:bulan', async (req, res) => {
  const [risiko_id, tahun, bulan] = [req.params.risikoId, req.params.tahun, req.params.bulan].map(Number);
  const risiko = await ambilRisiko(req, risiko_id);
  const bulanAwal = cekBulan(tahun, bulan, risiko.periode, await frekuensi());
  if (risiko.periode.status !== 'TERBUKA') throw galat(400, 'Periode sudah ditutup');
  const boleh = req.pengguna.peran.includes('DIREKSI') || punya(req.pengguna, PERAN_GLOBAL_TULIS) ||
    (punya(req.pengguna, PERAN_UNIT_TULIS) && req.pengguna.unit_kerja_id === risiko.unit_kerja_id);
  if (!boleh) throw galat(403, 'Akses ditolak');

  const lama = await prisma.pemantauan_bulanan.findUnique({ where: { risiko_id_tahun_bulan: { risiko_id, tahun, bulan } }, include: sertakanLaporan });
  if (lama && !STATUS_BISA_DIUBAH.includes(lama.status_persetujuan) && !req.pengguna.peran.includes('DIREKSI'))
    throw galat(403, 'Laporan sudah diajukan/final dan terkunci');

  const b = req.body || {};
  const idMitigasi = new Set(risiko.mitigasi.map((m) => m.id));
  const kriById = new Map(risiko.kri.map((k) => [k.id, k]));

  const mitigasi = (Array.isArray(b.mitigasi) ? b.mitigasi : []).map((m, i) => {
    const x = { mitigasi_id: Number(m.mitigasi_id), status: m.status, progres: Number(m.progres), keterangan: String(m.keterangan ?? '').trim() || null };
    if (!idMitigasi.has(x.mitigasi_id)) throw galat(400, `Mitigasi baris ${i + 1} bukan milik risiko ini`);
    if (!STATUS_MITIGASI.includes(x.status)) throw galat(400, `Mitigasi baris ${i + 1}: status tidak valid`);
    if (!(Number.isInteger(x.progres) && x.progres >= 0 && x.progres <= 100)) throw galat(400, `Mitigasi baris ${i + 1}: progres harus 0-100`);
    return x;
  });
  // KRI boleh kosong (frekuensi non-bulanan); baris tanpa nilai diabaikan.
  const kri = (Array.isArray(b.kri) ? b.kri : []).filter((k) => k.nilai !== '' && k.nilai != null).map((k, i) => {
    const def = kriById.get(Number(k.kri_id));
    if (!def) throw galat(400, `KRI baris ${i + 1} bukan milik risiko ini`);
    const nilai = Number(k.nilai);
    if (!Number.isFinite(nilai)) throw galat(400, `KRI "${def.nama}": nilai harus angka`);
    return { kri_id: def.id, nilai, status: statusKri(def, nilai), catatan: String(k.catatan ?? '').trim() || null };
  });
  const peristiwa_terjadi = Boolean(b.peristiwa_terjadi);
  const peristiwa = peristiwa_terjadi ? (Array.isArray(b.peristiwa) ? b.peristiwa : []).map((p, i) => {
    const x = {
      tanggal_kejadian: new Date(p.tanggal_kejadian),
      deskripsi: String(p.deskripsi ?? '').trim(),
      dampak: String(p.dampak ?? '').trim() || null,
      kerugian: p.kerugian === '' || p.kerugian == null ? null : Number(p.kerugian),
      tindakan_segera: String(p.tindakan_segera ?? '').trim() || null,
    };
    if (isNaN(x.tanggal_kejadian)) throw galat(400, `Peristiwa ${i + 1}: tanggal wajib diisi`);
    const bln = x.tanggal_kejadian.getMonth() + 1;
    if (x.tanggal_kejadian.getFullYear() !== tahun || bln < bulanAwal || bln > bulan) throw galat(400, `Peristiwa ${i + 1}: tanggal harus di dalam masa laporan`);
    if (!x.deskripsi) throw galat(400, `Peristiwa ${i + 1}: uraian wajib diisi`);
    if (x.kerugian !== null && !(Number.isFinite(x.kerugian) && x.kerugian >= 0)) throw galat(400, `Peristiwa ${i + 1}: kerugian harus angka >= 0`);
    return x;
  }) : [];
  if (peristiwa_terjadi && !peristiwa.length) throw galat(400, 'Peristiwa risiko ditandai terjadi: isi minimal satu kejadian');

  const laporan = await prisma.$transaction(async (tx) => {
    const lap = await tx.pemantauan_bulanan.upsert({
      where: { risiko_id_tahun_bulan: { risiko_id, tahun, bulan } },
      update: { catatan: String(b.catatan ?? '').trim() || null, peristiwa_terjadi },
      create: { risiko_id, tahun, bulan, catatan: String(b.catatan ?? '').trim() || null, peristiwa_terjadi },
    });
    await tx.realisasi_mitigasi.deleteMany({ where: { pemantauan_bulanan_id: lap.id } });
    await tx.realisasi_mitigasi.createMany({ data: mitigasi.map((m) => ({ ...m, pemantauan_bulanan_id: lap.id })) });
    await tx.pengukuran_kri.deleteMany({ where: { pemantauan_bulanan_id: lap.id } });
    await tx.pengukuran_kri.createMany({ data: kri.map((k) => ({ ...k, pemantauan_bulanan_id: lap.id })) });
    await tx.insiden.deleteMany({ where: { pemantauan_bulanan_id: lap.id } });
    await tx.insiden.createMany({
      data: peristiwa.map((p) => ({
        ...p, pemantauan_bulanan_id: lap.id, risiko_id, unit_kerja_id: risiko.unit_kerja_id, pelapor_id: req.pengguna.id,
        judul: `Peristiwa ${risiko.kode}`, sumber: 'PEMANTAUAN',
      })),
    });
    // Status & progres terkini di mitigasi/KRI mengikuti laporan bulan terbaru.
    await perbaruiTerkini(tx, risiko_id);
    return tx.pemantauan_bulanan.findUnique({ where: { id: lap.id }, include: sertakanLaporan });
  });

  await catat({ req, nama_tabel: 'pemantauan_bulanan', id_data: laporan.id, aksi: lama ? 'UBAH' : 'BUAT', nilai_lama: lama, nilai_baru: laporan });
  res.json(laporan);
});

// Salin status/progres mitigasi dan nilai/status KRI dari laporan terbaru yang memuatnya.
async function perbaruiTerkini(tx, risiko_id) {
  const urut = [{ pemantauan_bulanan: { tahun: 'desc' } }, { pemantauan_bulanan: { bulan: 'desc' } }];
  for (const m of await tx.mitigasi.findMany({ where: { risiko_id }, select: { id: true } })) {
    const r = await tx.realisasi_mitigasi.findFirst({ where: { mitigasi_id: m.id }, orderBy: urut });
    await tx.mitigasi.update({ where: { id: m.id }, data: r ? { status: r.status, progres: r.progres } : { status: 'DIRENCANAKAN', progres: 0 } });
  }
  for (const k of await tx.kri.findMany({ where: { risiko_id }, select: { id: true } })) {
    const [a, b] = await tx.pengukuran_kri.findMany({ where: { kri_id: k.id }, orderBy: urut, take: 2 });
    await tx.kri.update({
      where: { id: k.id },
      data: {
        nilai_sekarang: a?.nilai ?? null,
        nilai_sebelumnya: b?.nilai ?? null,
        status: a?.status ?? 'NONAKTIF',
        tren: !a || !b ? 'STABIL' : Number(a.nilai) > Number(b.nilai) ? 'NAIK' : Number(a.nilai) < Number(b.nilai) ? 'TURUN' : 'STABIL',
      },
    });
  }
}

// Ringkasan status laporan satu masa (jendela berakhir di `bulan`) untuk semua risiko dalam cakupan pengguna.
router.get('/ringkasan', async (req, res) => {
  const periode_id = Number(req.query.periode_id), tahun = Number(req.query.tahun), bulan = Number(req.query.bulan);
  if (!periode_id || !tahun || !bulan) throw galat(400, 'periode_id, tahun, bulan wajib');
  const [risiko, tgl, n] = await Promise.all([
    prisma.risiko.findMany({
      where: { periode_id, ...cakupanUnitKerja(req.pengguna) },
      select: {
        id: true, kode: true, nama: true, deskripsi: true,
        unit_kerja: { select: { id: true, nama: true, alur_persetujuan: true } },
        _count: { select: { mitigasi: true, kri: true } },
        pemantauan_bulanan: {
          where: { tahun, bulan },
          select: { id: true, status_persetujuan: true, diajukan_pada: true, peristiwa_terjadi: true, diubah_pada: true },
        },
      },
      orderBy: [{ unit_kerja_id: 'asc' }, { kode: 'asc' }],
    }),
    tanggalTenggat(),
    frekuensi(),
  ]);
  const batas = tenggat(tahun, bulan, tgl);
  const lewat = new Date() > batas;
  res.json({
    tenggat: batas,
    frekuensi: n,
    risiko: risiko.map(({ pemantauan_bulanan: [lap], ...r }) => ({
      ...r,
      laporan: lap || null,
      // Terlambat: belum diajukan saat tenggat lewat, atau diajukan setelah tenggat.
      terlambat: lap?.diajukan_pada ? lap.diajukan_pada > batas : lewat,
    })),
  });
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router, statusKri, frekuensi };
