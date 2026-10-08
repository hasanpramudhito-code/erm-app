const express = require('express');
const prisma = require('./db');
const { wajibLogin } = require('./auth');

const router = express.Router();
router.use(wajibLogin);

// ponytail: baca saja. CRUD unit & direktorat menyusul di modul Organisasi.
router.get('/', async (req, res) => {
  res.json(await prisma.unit.findMany({
    where: req.query.semua ? {} : { aktif: true },
    select: { id: true, kode: true, nama: true, jenis: true, parent_id: true, direktorat_id: true, aktif: true },
    orderBy: [{ jenis: 'asc' }, { kode: 'asc' }],
  }));
});

module.exports = { router };
