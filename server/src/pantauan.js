// Halaman pantauan lintas risiko (baca saja): mitigasi, KRI, insiden. Dibatasi cakupan unit pengguna.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnit } = require('./auth');

const router = express.Router();
router.use(wajibLogin);

const risikoRingkas = {
  select: {
    id: true, kode: true, nama: true, deskripsi: true, status_persetujuan: true,
    unit: { select: { id: true, nama: true } },
    penilaian: { where: { jenis: 'RESIDUAL' }, select: { skor: true, level: { select: { nama: true, warna: true } } } },
  },
};
const lingkup = (req) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) throw Object.assign(new Error('periode_id wajib'), { status: 400, expose: true });
  return { periode_id, ...cakupanUnit(req.pengguna) };
};

router.get('/mitigasi', async (req, res) => {
  const daftar = await prisma.mitigasi.findMany({
    where: { risiko: lingkup(req) },
    include: {
      risiko: risikoRingkas,
      penanggung_jawab: { select: { id: true, nama: true } },
      realisasi: {
        select: { status: true, progres: true, keterangan: true, pemantauan_bulanan: { select: { tahun: true, bulan: true, status_persetujuan: true } } },
      },
    },
    orderBy: [{ target_waktu: 'asc' }, { id: 'asc' }],
  });
  const hariIni = new Date();
  res.json(daftar.map(({ realisasi, ...m }) => ({
    ...m,
    // Lewat target bila tenggat sudah lewat dan belum selesai/dibatalkan, terlepas dari status yang dilaporkan.
    lewat_target: !!m.target_waktu && m.target_waktu < hariIni && !['SELESAI', 'DIBATALKAN'].includes(m.status),
    riwayat: realisasi
      .map((r) => ({ tahun: r.pemantauan_bulanan.tahun, bulan: r.pemantauan_bulanan.bulan, status_laporan: r.pemantauan_bulanan.status_persetujuan, status: r.status, progres: r.progres, keterangan: r.keterangan }))
      .sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan),
  })));
});

router.get('/kri', async (req, res) => {
  const daftar = await prisma.kri.findMany({
    where: { risiko: lingkup(req) },
    include: {
      risiko: risikoRingkas,
      pemilik: { select: { id: true, nama: true } },
      pengukuran: {
        select: { nilai: true, status: true, catatan: true, pemantauan_bulanan: { select: { tahun: true, bulan: true, status_persetujuan: true } } },
      },
    },
    orderBy: { id: 'asc' },
  });
  res.json(daftar.map(({ pengukuran, ...k }) => ({
    ...k,
    riwayat: pengukuran
      .map((p) => ({ tahun: p.pemantauan_bulanan.tahun, bulan: p.pemantauan_bulanan.bulan, status_laporan: p.pemantauan_bulanan.status_persetujuan, nilai: Number(p.nilai), status: p.status, catatan: p.catatan }))
      .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan),
  })));
});

router.get('/insiden', async (req, res) => {
  const l = lingkup(req);
  res.json(await prisma.insiden.findMany({
    where: { risiko: l },
    include: {
      risiko: risikoRingkas,
      unit: { select: { nama: true } },
      pelapor: { select: { nama: true } },
      pemantauan_bulanan: { select: { id: true, tahun: true, bulan: true, status_persetujuan: true } },
    },
    orderBy: { tanggal_kejadian: 'desc' },
  }));
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router };
