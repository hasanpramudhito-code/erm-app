// Agregasi per risiko utama (handoff bagian 6). Hanya entri berstatus FINAL yang dihitung.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran } = require('./auth');
const { hitungSkor } = require('./skor');
const { statusKri } = require('./pemantauan');

const router = express.Router();
router.use(wajibLogin, wajibPeran('ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'AUDITOR'));

// Penanda (handoff 6.3): unit dengan level lebih tinggi dari level nilai utama (keputusan pengguna 2026-10-09).
const SELISIH_LEVEL_PENANDA = 1;

// Modus satu dimensi; seri diambil nilai tertinggi.
function modus(nilai) {
  const frek = new Map();
  for (const v of nilai) frek.set(v, (frek.get(v) || 0) + 1);
  let terbaik = null;
  for (const [v, n] of frek) if (!terbaik || n > terbaik.n || (n === terbaik.n && v > terbaik.v)) terbaik = { v, n };
  return terbaik?.v ?? null;
}

// entri: [{ unit, kemungkinan, dampak }]. ctx: { metode, level: [{id,nama,warna,skor_min,skor_maks,urutan}] }.
function agregasi(entri, ctx) {
  if (!entri.length) return null;
  const skor = (k, d) => hitungSkor(k, d, ctx.metode);
  const levelDari = (s) => ctx.level.find((l) => s >= l.skor_min && s <= l.skor_maks) || null;

  // Nilai utama (B2): modus sel (k,d); seri -> skor terbesar, lalu dampak terbesar.
  const frek = new Map();
  for (const e of entri) {
    const kunci = `${e.kemungkinan}|${e.dampak}`;
    frek.set(kunci, { kemungkinan: e.kemungkinan, dampak: e.dampak, n: (frek.get(kunci)?.n || 0) + 1 });
  }
  const kandidat = [...frek.values()].sort((a, b) =>
    b.n - a.n || skor(b.kemungkinan, b.dampak) - skor(a.kemungkinan, a.dampak) || b.dampak - a.dampak);
  const utama = kandidat[0];
  const skorUtama = skor(utama.kemungkinan, utama.dampak);
  const levelUtama = levelDari(skorUtama);

  const denganSkor = entri.map((e) => {
    const s = skor(e.kemungkinan, e.dampak);
    return { ...e, skor: s, level: levelDari(s) };
  });
  const maks = Math.max(...denganSkor.map((e) => e.skor));
  const sebaran = ctx.level.map((l) => ({ level: l.nama, warna: l.warna, jumlah: denganSkor.filter((e) => e.level?.id === l.id).length }));

  return {
    nilai_utama: { kemungkinan: utama.kemungkinan, dampak: utama.dampak, skor: skorUtama, level: levelUtama?.nama ?? null, warna: levelUtama?.warna ?? null, frekuensi: utama.n },
    modus_kemungkinan: modus(entri.map((e) => e.kemungkinan)),
    modus_dampak: modus(entri.map((e) => e.dampak)),
    sebaran,
    tertinggi: { skor: maks, unit: denganSkor.filter((e) => e.skor === maks).map((e) => e.unit) },
    penanda: levelUtama
      ? denganSkor.filter((e) => e.level && e.level.urutan - levelUtama.urutan >= SELISIH_LEVEL_PENANDA)
        .map((e) => ({ unit: e.unit, skor: e.skor, level: e.level.nama }))
      : [],
  };
}

async function konteks() {
  const [level, metode] = await Promise.all([
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' } }),
    prisma.pengaturan.findUnique({ where: { kunci: 'metode_penilaian' } }),
  ]);
  // urutan dipakai untuk selisih tingkat; pastikan berurutan sesuai skor.
  return { level: level.map((l, i) => ({ ...l, urutan: i })), metode: metode?.nilai ?? 'multiplication' };
}

// Agregasi semua risiko utama dalam daftar periode untuk satu jenis penilaian.
router.get('/', async (req, res) => {
  const periode_id = Number(req.query.periode_id);
  const jenis = req.query.jenis === 'RESIDUAL' ? 'RESIDUAL' : 'INHEREN';
  if (!periode_id) return res.status(400).json({ error: 'periode_id wajib' });

  const [ctx, daftar, jumlahCabang] = await Promise.all([
    konteks(),
    prisma.risiko_utama.findMany({
      where: { periode: { some: { periode_id } } },
      include: {
        direktorat_pemilik: { select: { nama: true } },
        risiko: {
          where: { periode_id },
          select: {
            status_persetujuan: true,
            unit_kerja: { select: { id: true, nama: true } },
            penilaian: { where: { jenis }, select: { kemungkinan: true, dampak: true } },
          },
        },
      },
      orderBy: [{ berlaku_untuk: 'asc' }, { kode: 'asc' }],
    }),
    prisma.unit_kerja.count({ where: { jenis: { in: ['CABANG', 'UNIT'] }, pemilik_risiko: true, aktif: true } }),
  ]);

  res.json({
    jenis,
    metode: ctx.metode,
    level: ctx.level.map(({ id, nama, warna, skor_min, skor_maks }) => ({ id, nama, warna, skor_min, skor_maks })),
    risiko_utama: daftar.map((ru) => {
      const final = ru.risiko.filter((r) => r.status_persetujuan === 'FINAL' && r.penilaian[0]);
      return {
        id: ru.id, kode: ru.kode, nama: ru.nama, berlaku_untuk: ru.berlaku_untuk,
        pemilik: ru.berlaku_untuk === 'CABANG' ? 'Direktorat Utama' : ru.direktorat_pemilik?.nama || null,
        // Cabang: seluruh Cabang/Unit aktif wajib; Pusat: bagian yang memilihnya.
        jumlah_seharusnya: ru.berlaku_untuk === 'CABANG' ? jumlahCabang : ru.risiko.length,
        jumlah_final: final.length,
        hasil: agregasi(final.map((r) => ({ unit: r.unit_kerja.nama, ...r.penilaian[0] })), ctx),
      };
    }),
  });
});

// Agregasi KRI baku per risiko utama untuk satu masa pemantauan (hanya laporan FINAL).
// RASIO: jumlahkan angka nyata (pembilang & penyebut) semua unit, lalu hitung ulang; LANGSUNG: rata-rata nilai.
router.get('/kri', async (req, res) => {
  const periode_id = Number(req.query.periode_id), tahun = Number(req.query.tahun), bulan = Number(req.query.bulan);
  if (!periode_id || !tahun || !bulan) return res.status(400).json({ error: 'periode_id, tahun, bulan wajib' });
  const baku = await prisma.kri_baku.findMany({
    where: { aktif: true, risiko_utama: { aktif: true, periode: { some: { periode_id } } } },
    orderBy: [{ risiko_utama_id: 'asc' }, { id: 'asc' }],
    include: {
      risiko_utama: { select: { kode: true, nama: true } },
      kri: {
        where: { risiko: { periode_id } },
        select: {
          risiko: { select: { kode: true, unit_kerja: { select: { id: true, nama: true, jenis: true } } } },
          pengukuran: {
            where: { pemantauan_bulanan: { tahun, bulan } },
            select: { nilai: true, pembilang: true, penyebut: true, status: true, pemantauan_bulanan: { select: { status_persetujuan: true } } },
          },
        },
      },
    },
  });
  const n = (v) => (v == null ? null : Number(v));
  res.json(baku.map((kb) => {
    const unit = kb.kri.map((k) => {
      const p = k.pengukuran[0];
      return {
        unit_kerja: k.risiko.unit_kerja.nama, jenis: k.risiko.unit_kerja.jenis, kode_risiko: k.risiko.kode,
        status_laporan: p?.pemantauan_bulanan.status_persetujuan || null,
        nilai: n(p?.nilai), pembilang: n(p?.pembilang), penyebut: n(p?.penyebut), status: p?.status || null,
      };
    }).sort((a, b) => a.unit_kerja.localeCompare(b.unit_kerja));
    const final = unit.filter((u) => u.status_laporan === 'FINAL' && u.nilai != null);
    let nilai = null, pembilang = null, penyebut = null;
    if (kb.rumus === 'RASIO') {
      pembilang = final.reduce((t, u) => t + (u.pembilang || 0), 0);
      penyebut = final.reduce((t, u) => t + (u.penyebut || 0), 0);
      if (penyebut > 0) nilai = Math.round((pembilang / penyebut) * Number(kb.pengali) * 100) / 100;
    } else if (final.length) nilai = Math.round((final.reduce((t, u) => t + u.nilai, 0) / final.length) * 100) / 100;
    return {
      id: kb.id, nama: kb.nama, satuan: kb.satuan, rumus: kb.rumus, label_pembilang: kb.label_pembilang, label_penyebut: kb.label_penyebut,
      arah_target: kb.arah_target, ambang_hijau: n(kb.ambang_hijau), ambang_kuning: n(kb.ambang_kuning), ambang_merah: n(kb.ambang_merah),
      risiko_utama: kb.risiko_utama,
      gabungan: { nilai, pembilang, penyebut, status: nilai == null ? null : statusKri(kb, nilai) },
      sebaran: Object.fromEntries(['HIJAU', 'KUNING', 'MERAH'].map((s) => [s, final.filter((u) => u.status === s).length])),
      jumlah_unit: unit.length, jumlah_final: final.length,
      unit,
    };
  }));
});

// Ringkasan pemantauan satu bulan: kelengkapan laporan per unit, KRI merah, peristiwa, mitigasi terlambat.
router.get('/bulanan', async (req, res) => {
  const periode_id = Number(req.query.periode_id), tahun = Number(req.query.tahun), bulan = Number(req.query.bulan);
  if (!periode_id || !tahun || !bulan) return res.status(400).json({ error: 'periode_id, tahun, bulan wajib' });
  const akhirBulan = new Date(tahun, bulan, 0);

  const [risiko, kriMerah, peristiwa, mitigasiTerlambat] = await Promise.all([
    prisma.risiko.findMany({
      where: { periode_id },
      select: {
        status_persetujuan: true,
        unit_kerja: { select: { id: true, nama: true, jenis: true } },
        pemantauan_bulanan: { where: { tahun, bulan }, select: { status_persetujuan: true } },
      },
    }),
    prisma.pengukuran_kri.findMany({
      where: { status: 'MERAH', pemantauan_bulanan: { tahun, bulan, status_persetujuan: 'FINAL', risiko: { periode_id } } },
      select: { nilai: true, kri: { select: { nama: true, satuan: true } }, pemantauan_bulanan: { select: { risiko: { select: { kode: true, unit_kerja: { select: { nama: true } } } } } } },
    }),
    prisma.insiden.findMany({
      where: { pemantauan_bulanan: { tahun, bulan, status_persetujuan: 'FINAL', risiko: { periode_id } } },
      select: { tanggal_kejadian: true, deskripsi: true, kerugian: true, risiko: { select: { kode: true } }, unit_kerja: { select: { nama: true } } },
      orderBy: { tanggal_kejadian: 'asc' },
    }),
    prisma.mitigasi.count({
      where: { risiko: { periode_id }, target_waktu: { lt: akhirBulan }, status: { notIn: ['SELESAI', 'DIBATALKAN'] } },
    }),
  ]);

  const perUnit = new Map();
  for (const r of risiko) {
    const u = perUnit.get(r.unit_kerja.id) || { unit_kerja: r.unit_kerja.nama, jenis: r.unit_kerja.jenis, risiko: 0, risiko_final: 0, laporan_final: 0, laporan_diajukan: 0 };
    u.risiko++;
    if (r.status_persetujuan === 'FINAL') u.risiko_final++;
    const lap = r.pemantauan_bulanan[0];
    if (lap?.status_persetujuan === 'FINAL') u.laporan_final++;
    else if (lap && lap.status_persetujuan !== 'DRAF') u.laporan_diajukan++;
    perUnit.set(r.unit_kerja.id, u);
  }

  res.json({
    ringkasan: {
      risiko: risiko.length,
      risiko_final: risiko.filter((r) => r.status_persetujuan === 'FINAL').length,
      laporan_final: risiko.filter((r) => r.pemantauan_bulanan[0]?.status_persetujuan === 'FINAL').length,
      kri_merah: kriMerah.length,
      peristiwa: peristiwa.length,
      kerugian: peristiwa.reduce((t, p) => t + Number(p.kerugian || 0), 0),
      mitigasi_terlambat: mitigasiTerlambat,
    },
    per_unit: [...perUnit.values()].sort((a, b) => a.jenis.localeCompare(b.jenis) || a.unit_kerja.localeCompare(b.unit_kerja)),
    kri_merah: kriMerah.map((k) => ({ kri: k.kri.nama, nilai: Number(k.nilai), satuan: k.kri.satuan, risiko: k.pemantauan_bulanan.risiko.kode, unit_kerja: k.pemantauan_bulanan.risiko.unit_kerja.nama })),
    peristiwa: peristiwa.map((p) => ({ tanggal: p.tanggal_kejadian, deskripsi: p.deskripsi, kerugian: p.kerugian && Number(p.kerugian), risiko: p.risiko?.kode, unit_kerja: p.unit_kerja?.nama })),
  });
});

module.exports = { router, agregasi, modus, konteks };
