// Laporan Excel dari data server (satu sumber kebenaran). Dibatasi cakupan unit pengguna.
const express = require('express');
const ExcelJS = require('exceljs');
const prisma = require('./db');
const { wajibLogin, cakupanUnitKerja } = require('./auth');

const router = express.Router();
router.use(wajibLogin);

const galat = (status, message) => Object.assign(new Error(message), { status, expose: true });
const tgl = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const angka = (v) => (v == null ? null : Number(v));
const penilaian = (r, jenis) => r.penilaian.find((p) => p.jenis === jenis);

const LAPORAN = {
  register: {
    judul: 'Risk Register',
    kolom: [
      ['Kode', 14], ['Unit', 22], ['Risiko Utama', 14], ['Risiko', 40], ['Kategori', 18], ['Sumber', 10], ['Penyebab', 40], ['Dampak', 40],
      ['K Inheren', 9], ['D Inheren', 9], ['Skor Inheren', 10], ['Level Inheren', 14], ['Kontrol Eksisting', 30], ['Efektivitas', 16],
      ['K Residual', 9], ['D Residual', 9], ['Skor Residual', 10], ['Level Residual', 14], ['Jumlah Mitigasi', 10], ['Status Persetujuan', 16],
    ],
    async baris(periode_id, p) {
      const data = await prisma.risiko.findMany({
        where: { periode_id, ...cakupanUnitKerja(p) },
        include: {
          unit_kerja: true, kategori: true, risiko_utama: true, penyebab: true, dampak: true,
          penilaian: { include: { level: true } }, _count: { select: { mitigasi: true } },
        },
        orderBy: [{ unit_kerja_id: 'asc' }, { kode: 'asc' }],
      });
      return data.map((r) => {
        const i = penilaian(r, 'INHEREN'), s = penilaian(r, 'RESIDUAL');
        return [r.kode, r.unit_kerja.nama, r.risiko_utama?.kode || 'Spesifik', r.deskripsi || r.nama, r.kategori?.nama || '', r.sumber,
          r.penyebab.map((x) => x.uraian).join('\n'), r.dampak.map((x) => x.uraian).join('\n'),
          i?.kemungkinan, i?.dampak, i?.skor, i?.level.nama, r.kontrol_eksisting || '', r.efektivitas_kontrol || '',
          s?.kemungkinan, s?.dampak, s?.skor, s?.level.nama, r._count.mitigasi, r.status_persetujuan];
      });
    },
  },
  mitigasi: {
    judul: 'Rencana & Progres Mitigasi',
    kolom: [['Kode Risiko', 14], ['Unit', 22], ['Risiko', 36], ['Rencana Mitigasi', 40], ['Jenis', 12], ['Prioritas', 11], ['PIC', 20], ['Target', 12], ['Anggaran (Rp)', 16], ['Status', 14], ['Progres (%)', 10]],
    async baris(periode_id, p) {
      const data = await prisma.mitigasi.findMany({
        where: { risiko: { periode_id, ...cakupanUnitKerja(p) } },
        include: { risiko: { include: { unit_kerja: true } }, penanggung_jawab: true },
        orderBy: [{ risiko_id: 'asc' }, { id: 'asc' }],
      });
      return data.map((m) => [m.risiko.kode, m.risiko.unit_kerja.nama, m.risiko.deskripsi || m.risiko.nama, m.uraian, m.jenis, m.prioritas,
        m.penanggung_jawab?.nama || '', tgl(m.target_waktu), angka(m.anggaran), m.status, m.progres]);
    },
  },
  kri: {
    judul: 'Key Risk Indicator',
    kolom: [['Kode Risiko', 14], ['Unit', 22], ['Indikator', 36], ['Satuan', 10], ['Arah', 14], ['Ambang Hijau', 12], ['Ambang Kuning', 12], ['Ambang Merah', 12], ['Frekuensi', 12], ['Nilai Terakhir', 12], ['Nilai Sebelumnya', 12], ['Tren', 10], ['Status', 12]],
    async baris(periode_id, p) {
      const data = await prisma.kri.findMany({
        where: { risiko: { periode_id, ...cakupanUnitKerja(p) } },
        include: { risiko: { include: { unit_kerja: true } } },
        orderBy: [{ risiko_id: 'asc' }, { id: 'asc' }],
      });
      return data.map((k) => [k.risiko.kode, k.risiko.unit_kerja.nama, k.nama, k.satuan || '', k.arah_target,
        angka(k.ambang_hijau), angka(k.ambang_kuning), angka(k.ambang_merah), k.frekuensi, angka(k.nilai_sekarang), angka(k.nilai_sebelumnya), k.tren, k.status]);
    },
  },
  peristiwa: {
    judul: 'Register Peristiwa Risiko',
    kolom: [['Tanggal', 12], ['Kode Risiko', 14], ['Unit', 22], ['Uraian Kejadian', 44], ['Dampak', 30], ['Kerugian (Rp)', 16], ['Tindakan', 30], ['Laporan Bulan', 12], ['Status Laporan', 16]],
    async baris(periode_id, p) {
      const data = await prisma.insiden.findMany({
        where: { risiko: { periode_id, ...cakupanUnitKerja(p) } },
        include: { risiko: true, unit_kerja: true, pemantauan_bulanan: true },
        orderBy: { tanggal_kejadian: 'asc' },
      });
      return data.map((i) => [tgl(i.tanggal_kejadian), i.risiko?.kode || '', i.unit_kerja?.nama || '', i.deskripsi, i.dampak || '', angka(i.kerugian),
        i.tindakan_segera || '', i.pemantauan_bulanan ? `${i.pemantauan_bulanan.tahun}-${String(i.pemantauan_bulanan.bulan).padStart(2, '0')}` : '', i.pemantauan_bulanan?.status_persetujuan || '']);
    },
  },
  bulanan: {
    judul: 'Laporan Pemantauan Bulanan',
    kolom: [['Bulan', 10], ['Kode Risiko', 14], ['Unit', 22], ['Status Laporan', 16], ['Peristiwa Terjadi', 10], ['Catatan Perkembangan', 44], ['Mitigasi (status/progres)', 50], ['KRI (nilai/status)', 40]],
    async baris(periode_id, p, q) {
      const where = { risiko: { periode_id, ...cakupanUnitKerja(p) } };
      if (q.tahun && q.bulan) Object.assign(where, { tahun: Number(q.tahun), bulan: Number(q.bulan) });
      const data = await prisma.pemantauan_bulanan.findMany({
        where,
        include: {
          risiko: { include: { unit_kerja: true } },
          realisasi_mitigasi: { include: { mitigasi: true } },
          pengukuran_kri: { include: { kri: true } },
        },
        orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }, { risiko_id: 'asc' }],
      });
      return data.map((l) => [`${l.tahun}-${String(l.bulan).padStart(2, '0')}`, l.risiko.kode, l.risiko.unit_kerja.nama, l.status_persetujuan, l.peristiwa_terjadi ? 'Ya' : 'Tidak', l.catatan || '',
        l.realisasi_mitigasi.map((r) => `${r.mitigasi.uraian}: ${r.status} ${r.progres}%${r.keterangan ? ` (${r.keterangan})` : ''}`).join('\n'),
        l.pengukuran_kri.map((k) => `${k.kri.nama}: ${Number(k.nilai)}${k.kri.satuan ? ` ${k.kri.satuan}` : ''} ${k.status}` +
          (k.pembilang != null ? ` (${k.kri.label_pembilang} ${Number(k.pembilang)} / ${k.kri.label_penyebut} ${Number(k.penyebut)})` : '')).join('\n')]);
    },
  },
};

router.get('/', (req, res) => res.json(Object.entries(LAPORAN).map(([kode, l]) => ({ kode, judul: l.judul }))));

// GET /api/laporan/:jenis.xlsx?periode_id=..[&tahun&bulan untuk bulanan]
router.get('/:jenis.xlsx', async (req, res) => {
  const L = LAPORAN[req.params.jenis];
  if (!L) throw galat(404, 'Jenis laporan tidak dikenal');
  const periode = await prisma.periode.findUnique({ where: { id: Number(req.query.periode_id) || -1 } });
  if (!periode) throw galat(400, 'periode_id wajib dan harus valid');
  const [baris, perusahaan] = await Promise.all([
    L.baris(periode.id, req.pengguna, req.query),
    prisma.pengaturan.findUnique({ where: { kunci: 'nama_perusahaan' } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = req.pengguna.nama;
  const ws = wb.addWorksheet(L.judul.slice(0, 31));
  ws.addRow([`${perusahaan?.nilai || ''} — ${L.judul}`]).font = { bold: true, size: 14 };
  ws.addRow([`Periode ${periode.nama} · dicetak ${new Date().toLocaleString('id-ID')} oleh ${req.pengguna.nama}`]).font = { color: { argb: 'FF52514E' } };
  ws.addRow([]);
  const kepala = ws.addRow(L.kolom.map(([h]) => h));
  kepala.font = { bold: true };
  kepala.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } }; });
  L.kolom.forEach(([, w], i) => { ws.getColumn(i + 1).width = w; });
  for (const b of baris) ws.addRow(b).alignment = { vertical: 'top', wrapText: true };
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: L.kolom.length } };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.jenis}-${periode.nama}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router, LAPORAN };
