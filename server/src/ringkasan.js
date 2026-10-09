// Ringkasan untuk Dashboard utama (beranda), dibatasi cakupan unit kerja pengguna.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnitKerja } = require('./auth');
const { frekuensi } = require('./pemantauan');
const PERAN_LIHAT_SEMUA = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'AUDITOR'];

const router = express.Router();
router.use(wajibLogin);

router.get('/dashboard', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  const lingkup = { periode_id, ...cakupanUnitKerja(req.pengguna) };

  // Masa pemantauan terakhir yang sudah selesai (dasar "laporan belum diajukan").
  const n = await frekuensi();
  const kini = new Date();
  let tahun = kini.getFullYear(), bulan = Math.floor(kini.getMonth() / n) * n;
  if (bulan === 0) { tahun--; bulan = 12; }

  const [risiko, level, mitigasiAktif] = await Promise.all([
    prisma.risiko.findMany({
      where: lingkup,
      select: {
        status_persetujuan: true, penilaian: { where: { jenis: 'RESIDUAL' }, select: { level_id: true } },
        pemantauan_bulanan: { where: { tahun, bulan }, select: { status_persetujuan: true } },
      },
    }),
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' } }),
    prisma.mitigasi.count({ where: { risiko: lingkup, status: { in: ['DIRENCANAKAN', 'BERJALAN', 'TERLAMBAT'] } } }),
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
    // Pekerjaan yang menunggu di unit kerja pengguna.
    perlu_dilengkapi: risiko.filter((r) => ['DRAF', 'DIKEMBALIKAN'].includes(r.status_persetujuan)).length,
    laporan_belum_diajukan: risiko.filter((r) => r.status_persetujuan === 'FINAL' &&
      !['DIAJUKAN', 'DISETUJUI_PIMPINAN', 'FINAL'].includes(r.pemantauan_bulanan[0]?.status_persetujuan)).length,
    masa_laporan: { tahun, bulan, frekuensi: n },
    sebaran: level.map((l) => ({ level: l.nama, warna: l.warna, jumlah: perLevel.get(l.id) })),
    belum_dinilai: risiko.filter((r) => !r.penilaian[0]).length,
  });
});



// Risiko utama dalam daftar periode beserta nilai agregasi inheren & residual (hanya entri FINAL),
// diurutkan dari skor residual tertinggi (inheren bila residual belum ada); yang belum punya data final di bawah.
async function peringkatRisikoUtama(periode_id) {
  const { agregasi, konteks } = require('./agregasi');
  const [ctx, daftar] = await Promise.all([
    konteks(),
    prisma.risiko_utama.findMany({
      where: { periode: { some: { periode_id } } },
      select: {
        id: true, kode: true, nama: true, berlaku_untuk: true,
        risiko: {
          where: { periode_id },
          select: { status_persetujuan: true, unit_kerja: { select: { nama: true } }, penilaian: { select: { jenis: true, kemungkinan: true, dampak: true } } },
        },
      },
    }),
  ]);
  const hasil = daftar.map((ru) => {
    const final = ru.risiko.filter((r) => r.status_persetujuan === 'FINAL');
    const agg = (jenis) => agregasi(final.flatMap((r) => r.penilaian.filter((p) => p.jenis === jenis).map((p) => ({ unit: r.unit_kerja.nama, kemungkinan: p.kemungkinan, dampak: p.dampak }))), ctx);
    const [inh, res] = [agg('INHEREN'), agg('RESIDUAL')];
    const ringkas = (a) => a && { skor: a.nilai_utama.skor, level: a.nilai_utama.level, warna: a.nilai_utama.warna, tertinggi: a.tertinggi.skor, penanda: a.penanda.length };
    return { id: ru.id, kode: ru.kode, nama: ru.nama, berlaku_untuk: ru.berlaku_untuk, jumlah_unit: ru.risiko.length, jumlah_final: final.length, inheren: ringkas(inh), residual: ringkas(res) };
  });
  const kunci = (r) => r.residual?.skor ?? r.inheren?.skor ?? -1;
  return hasil.sort((a, b) => kunci(b) - kunci(a) || (b.inheren?.skor ?? -1) - (a.inheren?.skor ?? -1) || a.kode.localeCompare(b.kode));
}

// Ringkasan eksekutif: KPI, matriks inheren/residual, 10 risiko teratas, status mitigasi & KRI.
// ?unit_kerja_id=: Dashboard Unit Kerja. Pengguna unit hanya boleh unitnya sendiri (cakupan); peran lihat-semua boleh unit mana pun.
router.get('/eksekutif', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });
  const unit_kerja_id = Number(req.query.unit_kerja_id) || null;
  const lihatSemua = req.pengguna.peran.some((p) => PERAN_LIHAT_SEMUA.includes(p));
  if (!unit_kerja_id && !lihatSemua) return res.status(403).json({ error: 'Akses ditolak' });
  if (unit_kerja_id && !lihatSemua && unit_kerja_id !== req.pengguna.unit_kerja_id) return res.status(403).json({ error: 'Hanya boleh melihat unit kerja sendiri' });
  const lingkup = { periode_id, ...cakupanUnitKerja(req.pengguna), ...(unit_kerja_id ? { unit_kerja_id } : {}) };
  const [risiko, level, mitigasi, kri, insiden] = await Promise.all([
    prisma.risiko.findMany({
      where: lingkup,
      select: {
        id: true, kode: true, nama: true, deskripsi: true, status_persetujuan: true, risiko_utama_id: true,
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
  // Sel matriks: daftar risiko per "kemungkinan-dampak".
  const matriks = (jenis) => {
    const sel = {};
    for (const r of risiko) {
      const p = ambil(r, jenis);
      if (p) (sel[`${p.kemungkinan}-${p.dampak}`] ??= []).push({ id: r.id, kode: r.kode, nama: r.deskripsi || r.nama, unit_kerja: r.unit_kerja.nama });
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
    // Unit kerja: tidak ada agregasi antarunit, jadi daftar teratas memuat semua risiko unit itu.
    risiko_utama: unit_kerja_id ? [] : await peringkatRisikoUtama(periode_id),
    // 10 teratas hanya risiko spesifik (tidak terkait risiko utama); risiko utama sudah tampil teragregasi di atas.
    teratas: risiko
      .filter((r) => (unit_kerja_id || !r.risiko_utama_id) && (ambil(r, 'RESIDUAL') || ambil(r, 'INHEREN')))
      .map((r) => ({ id: r.id, kode: r.kode, nama: r.deskripsi || r.nama, unit_kerja: r.unit_kerja.nama, status: r.status_persetujuan, inheren: ambil(r, 'INHEREN'), residual: ambil(r, 'RESIDUAL') }))
      .sort((a, b) => (b.residual?.skor ?? b.inheren.skor) - (a.residual?.skor ?? a.inheren.skor) || (b.inheren?.skor ?? 0) - (a.inheren?.skor ?? 0))
      .slice(0, 10),
    mitigasi: Object.fromEntries(mitigasi.map((m) => [m.status, m._count])),
    kri: Object.fromEntries(kri.map((k) => [k.status, k._count])),
    ...(unit_kerja_id ? await rincianUnit(lingkup, risiko) : {}),
  });
});

// Tambahan khusus Dashboard Unit Kerja: KRI kuning/merah, mitigasi lewat target, status laporan pemantauan masa terakhir.
async function rincianUnit(lingkup, risiko) {
  const n = await frekuensi();
  const kini = new Date();
  let tahun = kini.getFullYear(), bulan = Math.floor(kini.getMonth() / n) * n;
  if (bulan === 0) { tahun--; bulan = 12; }
  const [kri, terlambat, laporan] = await Promise.all([
    prisma.kri.findMany({
      where: { risiko: lingkup, aktif: true, status: { in: ['KUNING', 'MERAH'] } },
      select: { id: true, nama: true, satuan: true, nilai_sekarang: true, status: true, risiko: { select: { kode: true } } },
      orderBy: { status: 'desc' },
    }),
    prisma.mitigasi.findMany({
      where: { risiko: lingkup, target_waktu: { lt: kini }, status: { notIn: ['SELESAI', 'DIBATALKAN'] } },
      select: { id: true, uraian: true, target_waktu: true, progres: true, risiko: { select: { kode: true } }, penanggung_jawab: { select: { nama: true } } },
      orderBy: { target_waktu: 'asc' },
    }),
    prisma.pemantauan_bulanan.findMany({ where: { tahun, bulan, risiko: lingkup }, select: { status_persetujuan: true } }),
  ]);
  const hitung = (s) => laporan.filter((l) => l.status_persetujuan === s).length;
  return {
    kri_perhatian: kri.map((k) => ({ ...k, nilai_sekarang: k.nilai_sekarang == null ? null : Number(k.nilai_sekarang) })),
    mitigasi_terlambat: terlambat,
    pemantauan: {
      tahun, bulan, frekuensi: n, total: risiko.length, belum_diisi: risiko.length - laporan.length,
      draf: hitung('DRAF') + hitung('DIKEMBALIKAN'), menunggu: hitung('DIAJUKAN') + hitung('DISETUJUI_PIMPINAN'), final: hitung('FINAL'),
    },
  };
}
module.exports = { router };
