// Ringkasan untuk Dashboard utama, dibatasi cakupan unit pengguna.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnit } = require('./auth');

const router = express.Router();
router.use(wajibLogin);

router.get('/dashboard', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  const lingkup = { periode_id, ...cakupanUnit(req.pengguna) };

  const [risiko, level, mitigasiAktif, pemilik, aktivitas] = await Promise.all([
    prisma.risiko.findMany({
      where: lingkup,
      select: { status_persetujuan: true, penilaian: { where: { jenis: 'RESIDUAL' }, select: { level_id: true } } },
    }),
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' } }),
    prisma.mitigasi.count({ where: { risiko: lingkup, status: { in: ['DIRENCANAKAN', 'BERJALAN', 'TERLAMBAT'] } } }),
    // Pimpinan unit = pemilik risiko di tingkat unit.
    prisma.pengguna.count({ where: { aktif: true, peran: { some: { peran: { kode: { in: ['PIMPINAN_UNIT_PUSAT', 'PIMPINAN_CABANG'] } } } } } }),
    prisma.jejak_audit.findMany({
      where: { nama_tabel: { in: ['risiko', 'pemantauan_bulanan', 'mitigasi'] }, ...(Object.keys(cakupanUnit(req.pengguna)).length ? { pengguna_id: req.pengguna.id } : {}) },
      select: { id: true, aksi: true, nama_tabel: true, dibuat_pada: true, pengguna: { select: { nama: true } } },
      orderBy: { dibuat_pada: 'desc' },
      take: 5,
    }),
  ]);

  const perLevel = new Map(level.map((l) => [l.id, 0]));
  for (const r of risiko) {
    const id = r.penilaian[0]?.level_id;
    if (id) perLevel.set(id, perLevel.get(id) + 1);
  }
  // Risiko tinggi = residual pada dua level teratas.
  const atas = new Set(level.slice(-2).map((l) => l.id));

  res.json({
    total_risiko: risiko.length,
    risiko_final: risiko.filter((r) => r.status_persetujuan === 'FINAL').length,
    mitigasi_aktif: mitigasiAktif,
    risiko_tinggi: risiko.filter((r) => atas.has(r.penilaian[0]?.level_id)).length,
    pemilik_risiko: pemilik,
    sebaran: level.map((l) => ({ level: l.nama, warna: l.warna, jumlah: perLevel.get(l.id) })),
    belum_dinilai: risiko.filter((r) => !r.penilaian[0]).length,
    aktivitas,
  });
});

module.exports = { router };
