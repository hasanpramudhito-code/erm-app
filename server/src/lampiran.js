const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const prisma = require('./db');
const { wajibLogin } = require('./auth');
const { catat } = require('./audit');

const DIR = path.resolve(process.env.DIR_UNGGAHAN || path.join(__dirname, '..', 'unggahan'));
fs.mkdirSync(DIR, { recursive: true });

const ENTITAS = ['mitigasi', 'realisasi_mitigasi', 'pemantauan_bulanan', 'insiden', 'hasil_pengujian', 'defisiensi', 'risiko'];
const EKSTENSI = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|csv|txt|zip)$/i;

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    // Nama acak: nama asli tidak dipakai di disk untuk mencegah path traversal.
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, EKSTENSI.test(file.originalname)),
});

const router = express.Router();
router.use(wajibLogin);

// ponytail: hak akses lampiran = siapa pun yang login. Batasi per unit pemilik entitas saat modulnya dipindahkan (Tahap 5).
router.post('/:entitas/:id', upload.single('file'), async (req, res) => {
  const { entitas } = req.params;
  const entitas_id = Number(req.params.id);
  if (!ENTITAS.includes(entitas) || !Number.isInteger(entitas_id)) return res.status(400).json({ error: 'Entitas tidak valid' });
  if (!req.file) return res.status(400).json({ error: 'File tidak ada atau jenisnya tidak diizinkan' });

  const l = await prisma.lampiran.create({
    data: {
      entitas,
      entitas_id,
      nama_file: req.file.originalname,
      lokasi_file: req.file.filename,
      tipe_mime: req.file.mimetype,
      ukuran: req.file.size,
      diunggah_oleh_id: req.pengguna.id,
    },
  });
  await catat({ req, nama_tabel: 'lampiran', id_data: l.id, aksi: 'UNGGAH', nilai_baru: { entitas, entitas_id, nama_file: l.nama_file } });
  res.status(201).json(l);
});

router.get('/unduh/:lampiranId', async (req, res) => {
  const l = await prisma.lampiran.findUnique({ where: { id: Number(req.params.lampiranId) || -1 } });
  if (!l) return res.status(404).json({ error: 'Lampiran tidak ditemukan' });
  res.download(path.join(DIR, path.basename(l.lokasi_file)), l.nama_file);
});

router.get('/:entitas/:id', async (req, res) => {
  res.json(await prisma.lampiran.findMany({
    where: { entitas: req.params.entitas, entitas_id: Number(req.params.id) || -1 },
    orderBy: { dibuat_pada: 'desc' },
  }));
});

router.delete('/:lampiranId', async (req, res) => {
  const l = await prisma.lampiran.findUnique({ where: { id: Number(req.params.lampiranId) || -1 } });
  if (!l) return res.status(404).json({ error: 'Lampiran tidak ditemukan' });
  if (l.diunggah_oleh_id !== req.pengguna.id && !req.pengguna.peran.includes('ADMIN'))
    return res.status(403).json({ error: 'Hanya pengunggah atau admin yang boleh menghapus' });
  await prisma.lampiran.delete({ where: { id: l.id } });
  fs.rm(path.join(DIR, path.basename(l.lokasi_file)), { force: true }, () => {});
  await catat({ req, nama_tabel: 'lampiran', id_data: l.id, aksi: 'HAPUS', nilai_lama: l });
  res.status(204).end();
});

module.exports = { router };
