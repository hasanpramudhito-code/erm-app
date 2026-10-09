// Ekspor/impor risiko utama + pustaka via Excel. Satu baris = satu risiko utama; penyebab/dampak dipisah baris baru di sel.
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const prisma = require('./db');
const { wajibPeran } = require('./auth');
const { catat } = require('./audit');

const router = express.Router();
const PENULIS = ['ADMIN', 'PENGELOLA_RISIKO'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const galat = (status, message) => Object.assign(new Error(message), { status, expose: true });

const KOLOM = [
  { header: 'Kode', key: 'kode', width: 14 },
  { header: 'Nama Risiko', key: 'nama', width: 40 },
  { header: 'Deskripsi', key: 'deskripsi', width: 40 },
  { header: 'Berlaku Untuk (CABANG/PUSAT)', key: 'berlaku_untuk', width: 16 },
  { header: 'Kode Kategori', key: 'kategori', width: 14 },
  { header: 'Kode Direktorat Pemilik', key: 'direktorat', width: 16 },
  { header: 'Pustaka Penyebab (satu per baris)', key: 'penyebab', width: 50 },
  { header: 'Pustaka Dampak (satu per baris)', key: 'dampak', width: 50 },
  { header: 'Aktif (Y/T)', key: 'aktif', width: 10 },
];

const teksSel = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return v.richText ? v.richText.map((r) => r.text).join('') : String(v.text ?? v.result ?? '');
  return String(v);
};
const baris = (v) => teksSel(v).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

router.get('/ekspor', wajibPeran(...PENULIS), async (req, res) => {
  const periode_id = Number(req.query.periode_id) || null;
  const daftar = await prisma.risiko_utama.findMany({
    where: periode_id ? { periode: { some: { periode_id } } } : {},
    include: {
      kategori: true, direktorat_pemilik: true,
      pustaka_penyebab: { where: { aktif: true }, orderBy: { id: 'asc' } },
      pustaka_dampak: { where: { aktif: true }, orderBy: { id: 'asc' } },
    },
    orderBy: [{ berlaku_untuk: 'asc' }, { kode: 'asc' }],
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Risiko Utama');
  ws.columns = KOLOM;
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const r of daftar) {
    ws.addRow({
      kode: r.kode, nama: r.nama, deskripsi: r.deskripsi || '', berlaku_untuk: r.berlaku_untuk,
      kategori: r.kategori?.kode || '', direktorat: r.direktorat_pemilik?.kode || '',
      penyebab: r.pustaka_penyebab.map((p) => p.uraian).join('\n'),
      dampak: r.pustaka_dampak.map((p) => p.uraian).join('\n'),
      aktif: r.aktif ? 'Y' : 'T',
    });
  }
  ws.eachRow((row) => { row.alignment = { vertical: 'top', wrapText: true }; });
  // Lembar referensi kode agar pengisi tidak salah ketik.
  const ref = wb.addWorksheet('Referensi');
  ref.columns = [{ header: 'Kode Kategori', key: 'k', width: 14 }, { header: 'Nama Kategori', key: 'kn', width: 30 }, { header: '', key: 'x', width: 3 }, { header: 'Kode Direktorat', key: 'd', width: 16 }, { header: 'Nama Direktorat', key: 'dn', width: 30 }];
  ref.getRow(1).font = { bold: true };
  const [kat, dir] = await Promise.all([prisma.kategori_risiko.findMany({ orderBy: { kode: 'asc' } }), prisma.direktorat.findMany({ orderBy: { kode: 'asc' } })]);
  for (let i = 0; i < Math.max(kat.length, dir.length); i++) ref.addRow({ k: kat[i]?.kode, kn: kat[i]?.nama, d: dir[i]?.kode, dn: dir[i]?.nama });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="risiko-utama.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// Impor: upsert berdasarkan kode. Pustaka disinkronkan berdasarkan teks (item yang sama dipertahankan agar rujukan tetap).
// ?simulasi=1 hanya memvalidasi dan melaporkan rencana perubahan tanpa menyimpan.
router.post('/impor', wajibPeran(...PENULIS), upload.single('file'), async (req, res) => {
  if (!req.file) throw galat(400, 'File Excel wajib diunggah');
  const simulasi = req.query.simulasi === '1';
  const periode_id = Number(req.body?.periode_id) || null;
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(req.file.buffer); } catch { throw galat(400, 'File bukan Excel (.xlsx) yang valid'); }
  const ws = wb.getWorksheet('Risiko Utama') || wb.worksheets[0];
  if (!ws) throw galat(400, 'Lembar kerja tidak ditemukan');

  const kepala = KOLOM.map((k, i) => teksSel(ws.getRow(1).getCell(i + 1).value).trim());
  if (kepala[0] !== 'Kode' || kepala[1] !== 'Nama Risiko') throw galat(400, 'Format kolom tidak sesuai template. Unduh template dari tombol Ekspor.');

  const [kat, dir] = await Promise.all([prisma.kategori_risiko.findMany(), prisma.direktorat.findMany()]);
  const katByKode = new Map(kat.map((k) => [k.kode.toUpperCase(), k.id]));
  const dirByKode = new Map(dir.map((d) => [d.kode.toUpperCase(), d.id]));

  const kesalahan = [];
  const data = [];
  const kodeDilihat = new Set();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const v = (i) => teksSel(row.getCell(i).value).trim();
    if (!v(1) && !v(2)) return; // baris kosong
    const kode = v(1).toUpperCase();
    const berlaku = v(4).toUpperCase();
    const kodeKat = v(5).toUpperCase();
    const kodeDir = v(6).toUpperCase();
    const salah = [];
    if (!kode) salah.push('kode kosong');
    if (kode.length > 30) salah.push('kode > 30 karakter');
    if (kodeDilihat.has(kode)) salah.push('kode dobel di file');
    if (!v(2)) salah.push('nama kosong');
    if (!['CABANG', 'PUSAT'].includes(berlaku)) salah.push('berlaku untuk harus CABANG/PUSAT');
    if (kodeKat && !katByKode.has(kodeKat)) salah.push(`kategori "${kodeKat}" tidak dikenal`);
    if (kodeDir && !dirByKode.has(kodeDir)) salah.push(`direktorat "${kodeDir}" tidak dikenal`);
    kodeDilihat.add(kode);
    if (salah.length) return kesalahan.push({ baris: n, kode, kesalahan: salah.join('; ') });
    data.push({
      kode, nama: v(2), deskripsi: v(3) || null, berlaku_untuk: berlaku,
      kategori_id: kodeKat ? katByKode.get(kodeKat) : null,
      direktorat_pemilik_id: kodeDir ? dirByKode.get(kodeDir) : null,
      aktif: !/^(t|n|tidak|no)$/i.test(v(9)),
      penyebab: baris(row.getCell(7).value), dampak: baris(row.getCell(8).value),
    });
  });
  if (!data.length && !kesalahan.length) throw galat(400, 'Tidak ada baris data');

  const lama = new Map((await prisma.risiko_utama.findMany({
    where: { kode: { in: data.map((d) => d.kode) } },
    include: { pustaka_penyebab: { where: { aktif: true } }, pustaka_dampak: { where: { aktif: true } }, _count: { select: { risiko: true } } },
  })).map((r) => [r.kode, r]));
  for (const d of data) {
    const l = lama.get(d.kode);
    if (l && l.berlaku_untuk !== d.berlaku_untuk && l._count.risiko) kesalahan.push({ kode: d.kode, kesalahan: '"berlaku untuk" tidak dapat diubah karena sudah dipakai' });
  }
  const rencana = { baru: data.filter((d) => !lama.has(d.kode)).length, diubah: data.filter((d) => lama.has(d.kode)).length };
  if (simulasi || kesalahan.length) return res.status(kesalahan.length ? 400 : 200).json({ simulasi: true, ...rencana, kesalahan });

  await prisma.$transaction(async (tx) => {
    for (const { penyebab, dampak, ...isi } of data) {
      const l = lama.get(isi.kode);
      const ru = l ? await tx.risiko_utama.update({ where: { id: l.id }, data: isi }) : await tx.risiko_utama.create({ data: isi });
      for (const [model, relasi, daftar, ada] of [
        ['pustaka_penyebab', 'risiko_penyebab', penyebab, l?.pustaka_penyebab || []],
        ['pustaka_dampak', 'risiko_dampak', dampak, l?.pustaka_dampak || []],
      ]) {
        const tetap = new Set(daftar);
        for (const p of ada) {
          if (tetap.has(p.uraian)) continue;
          const dipakai = await tx[relasi].count({ where: { [`${model}_id`]: p.id } });
          if (dipakai) await tx[model].update({ where: { id: p.id }, data: { aktif: false } });
          else await tx[model].delete({ where: { id: p.id } });
        }
        const sudah = new Set(ada.map((p) => p.uraian));
        const baruP = daftar.filter((u) => !sudah.has(u));
        if (baruP.length) await tx[model].createMany({ data: baruP.map((uraian) => ({ risiko_utama_id: ru.id, uraian })) });
      }
      if (periode_id) await tx.periode_risiko_utama.upsert({
        where: { periode_id_risiko_utama_id: { periode_id, risiko_utama_id: ru.id } }, update: {}, create: { periode_id, risiko_utama_id: ru.id },
      });
    }
  }, { timeout: 60000 });
  await catat({ req, nama_tabel: 'risiko_utama', id_data: '-', aksi: 'IMPOR_EXCEL', nilai_baru: { ...rencana, periode_id } });
  const periode = periode_id && await prisma.periode.findUnique({ where: { id: periode_id } });
  const entri_dibuat = periode?.status === 'TERBUKA' ? await require('./risiko-utama').bentukEntriCabang(periode_id) : 0;
  res.json({ ...rencana, entri_dibuat, kesalahan: [] });
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router };
