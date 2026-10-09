// Ringkasan untuk Dashboard utama, dibatasi cakupan unit pengguna.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnitKerja } = require('./auth');

const router = express.Router();
router.use(wajibLogin);

router.get('/dashboard', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  const lingkup = { periode_id, ...cakupanUnitKerja(req.pengguna) };

  const [risiko, level, mitigasiAktif, pemilik, aktivitas] = await Promise.all([
    prisma.risiko.findMany({
      where: lingkup,
      select: { status_persetujuan: true, penilaian: { where: { jenis: 'RESIDUAL' }, select: { level_id: true } } },
    }),
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' } }),
    prisma.mitigasi.count({ where: { risiko: lingkup, status: { in: ['DIRENCANAKAN', 'BERJALAN', 'TERLAMBAT'] } } }),
    // Pimpinan unit = pemilik risiko di tingkat unit.
    prisma.pengguna.count({ where: { aktif: true, peran: { some: { peran: { kode: { in: ['PIMPINAN'] } } } } } }),
    prisma.jejak_audit.findMany({
      where: { nama_tabel: { in: ['risiko', 'pemantauan_bulanan', 'mitigasi'] }, ...(Object.keys(cakupanUnitKerja(req.pengguna)).length ? { pengguna_id: req.pengguna.id } : {}) },
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



// Ringkasan eksekutif: KPI, matriks inheren/residual, 10 risiko teratas, status mitigasi & KRI.
router.get('/eksekutif', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  const lingkup = { periode_id, ...cakupanUnitKerja(req.pengguna) };
  const [risiko, level, mitigasi, kri, insiden] = await Promise.all([
    prisma.risiko.findMany({
      where: lingkup,
      select: {
        id: true, kode: true, nama: true, deskripsi: true, status_persetujuan: true,
        unit_kerja: { select: { nama: true } },
        penilaian: { select: { jenis: true, kemungkinan: true, dampak: true, skor: true, level: { select: { nama: true, warna: true } } } },
      },
    }),
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' }, select: { nama: true, warna: true, skor_min: true, skor_maks: true } }),
    prisma.mitigasi.groupBy({ by: ['status'], where: { risiko: lingkup }, _count: true, _avg: { progres: true } }),
    prisma.kri.groupBy({ by: ['status'], where: { risiko: lingkup }, _count: true }),
    prisma.insiden.aggregate({ where: { risiko: lingkup }, _count: true, _sum: { kerugian: true } }),
  ]);
  const ambil = (r, j) => r.penilaian.find((p) => p.jenis === j);
  const matriks = (jenis) => {
    const sel = {};
    for (const r of risiko) {
      const p = ambil(r, jenis);
      if (p) sel[`${p.kemungkinan}-${p.dampak}`] = (sel[`${p.kemungkinan}-${p.dampak}`] || 0) + 1;
    }
    return sel;
  };
  const dinilai = risiko.filter((r) => ambil(r, 'INHEREN'));
  const sumInh = dinilai.reduce((t, r) => t + ambil(r, 'INHEREN').skor, 0);
  const sumRes = dinilai.reduce((t, r) => t + (ambil(r, 'RESIDUAL')?.skor ?? ambil(r, 'INHEREN').skor), 0);
  const totalMit = mitigasi.reduce((t, m) => t + m._count, 0);
  res.json({
    level,
    kpi: {
      total_risiko: risiko.length,
      dinilai: dinilai.length,
      final: risiko.filter((r) => r.status_persetujuan === 'FINAL').length,
      penurunan_risiko: sumInh ? Math.round(((sumInh - sumRes) / sumInh) * 100) : 0,
      peristiwa: insiden._count,
      kerugian: Number(insiden._sum.kerugian || 0),
      rata_progres_mitigasi: totalMit ? Math.round(mitigasi.reduce((t, m) => t + (m._avg.progres || 0) * m._count, 0) / totalMit) : 0,
    },
    matriks: { INHEREN: matriks('INHEREN'), RESIDUAL: matriks('RESIDUAL') },
    teratas: risiko
      .filter((r) => ambil(r, 'RESIDUAL') || ambil(r, 'INHEREN'))
      .map((r) => ({ id: r.id, kode: r.kode, nama: r.deskripsi || r.nama, unit_kerja: r.unit_kerja.nama, status: r.status_persetujuan, inheren: ambil(r, 'INHEREN'), residual: ambil(r, 'RESIDUAL') }))
      .sort((a, b) => (b.residual?.skor ?? b.inheren.skor) - (a.residual?.skor ?? a.inheren.skor) || (b.inheren?.skor ?? 0) - (a.inheren?.skor ?? 0))
      .slice(0, 10),
    mitigasi: Object.fromEntries(mitigasi.map((m) => [m.status, m._count])),
    kri: Object.fromEntries(kri.map((k) => [k.status, k._count])),
  });
});
module.exports = { router };
