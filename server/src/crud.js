const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran } = require('./auth');
const { catat } = require('./audit');

// Router CRUD sederhana untuk tabel master. Baca: semua yang login. Tulis: peran `penulis`.
// `bersihkan(body)` mengembalikan {data} atau {error}; hanya kolom yang dikembalikan yang ditulis.
function crud({ model, penulis, bersihkan, orderBy, include }) {
  const router = express.Router();
  const tabel = prisma[model];
  router.use(wajibLogin);

  router.get('/', async (req, res) => res.json(await tabel.findMany({ orderBy, include })));

  router.use(wajibPeran(...penulis));

  router.post('/', async (req, res) => {
    const { data, error } = await bersihkan(req.body || {}, true);
    if (error) return res.status(400).json({ error });
    const r = await tabel.create({ data, include });
    await catat({ req, nama_tabel: model, id_data: r.id, aksi: 'BUAT', nilai_baru: r });
    res.status(201).json(r);
  });

  router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const lama = await tabel.findUnique({ where: { id } });
    if (!lama) return res.status(404).json({ error: 'Data tidak ditemukan' });
    const { data, error } = await bersihkan(req.body || {}, false, lama);
    if (error) return res.status(400).json({ error });
    const r = await tabel.update({ where: { id }, data, include });
    await catat({ req, nama_tabel: model, id_data: id, aksi: 'UBAH', nilai_lama: lama, nilai_baru: r });
    res.json(r);
  });

  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const lama = await tabel.findUnique({ where: { id } });
    if (!lama) return res.status(404).json({ error: 'Data tidak ditemukan' });
    await tabel.delete({ where: { id } });
    await catat({ req, nama_tabel: model, id_data: id, aksi: 'HAPUS', nilai_lama: lama });
    res.status(204).end();
  });

  return router;
}

// Ubah error Prisma yang umum jadi pesan 400/409 yang jelas.
function errorPrisma(err, req, res, next) {
  if (err.code === 'P2002') return res.status(409).json({ error: 'Data dengan kode/nilai tersebut sudah ada' });
  if (err.code === 'P2003') return res.status(409).json({ error: 'Data masih dipakai oleh data lain, tidak dapat dihapus' });
  next(err);
}

// Helper validasi teks/angka.
const teks = (v) => (v === undefined ? undefined : String(v ?? '').trim() || null);
const angka = (v) => (v === undefined || v === '' || v === null ? undefined : Number(v));

module.exports = { crud, errorPrisma, teks, angka };
