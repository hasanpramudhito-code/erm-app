const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran, hashKataSandi } = require('./auth');
const { catat } = require('./audit');

const router = express.Router();
const MIN_SANDI = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pilih = {
  id: true, nama: true, email: true, jabatan: true, telepon: true, aktif: true, login_terakhir: true, unit_kerja_id: true,
  unit_kerja: { select: { id: true, kode: true, nama: true, jenis: true } },
  peran: { select: { peran: { select: { kode: true } } } },
  dibuat_pada: true, diubah_pada: true,
};
const bentuk = (p) => ({ ...p, peran: p.peran.map((x) => x.peran.kode) });

// Validasi & normalisasi input. Kembalikan {data} atau {error}.
async function validasi(body, baru) {
  const data = {};
  if (baru || body.nama !== undefined) {
    data.nama = String(body.nama || '').trim();
    if (!data.nama) return { error: 'Nama wajib diisi' };
  }
  if (baru) {
    data.email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL.test(data.email)) return { error: 'Email tidak valid' };
  }
  if (baru || body.kata_sandi) {
    if (String(body.kata_sandi || '').length < MIN_SANDI) return { error: `Kata sandi minimal ${MIN_SANDI} karakter` };
    data.kata_sandi_hash = await hashKataSandi(String(body.kata_sandi));
  }
  for (const k of ['jabatan', 'telepon']) if (body[k] !== undefined) data[k] = String(body[k] || '').trim() || null;
  if (body.aktif !== undefined) data.aktif = Boolean(body.aktif);
  if (body.unit_kerja_id !== undefined) {
    data.unit_kerja_id = body.unit_kerja_id ? Number(body.unit_kerja_id) : null;
    if (data.unit_kerja_id && !(await prisma.unit_kerja.findUnique({ where: { id: data.unit_kerja_id } }))) return { error: 'Unit tidak ditemukan' };
  }
  let peranId;
  if (baru || body.peran !== undefined) {
    const kode = [...new Set(Array.isArray(body.peran) ? body.peran : [])];
    if (!kode.length) return { error: 'Minimal satu peran' };
    const ada = await prisma.peran.findMany({ where: { kode: { in: kode } } });
    if (ada.length !== kode.length) return { error: 'Peran tidak dikenal' };
    peranId = ada.map((p) => p.id);
  }
  return { data, peranId };
}

router.get('/peran', wajibLogin, async (req, res) => {
  res.json(await prisma.peran.findMany({ select: { kode: true, nama: true }, orderBy: { id: 'asc' } }));
});

// Daftar ringkas untuk pilihan PIC/penanggung jawab di modul lain.
router.get('/ringkas', wajibLogin, async (req, res) => {
  res.json(await prisma.pengguna.findMany({
    where: { aktif: true },
    select: { id: true, nama: true, email: true, unit_kerja_id: true },
    orderBy: { nama: 'asc' },
  }));
});

router.use(wajibPeran('ADMIN', 'DIREKSI'));

router.get('/', async (req, res) => {
  res.json((await prisma.pengguna.findMany({ select: pilih, orderBy: { nama: 'asc' } })).map(bentuk));
});

router.use(wajibPeran('ADMIN'));

router.post('/', async (req, res) => {
  const { data, peranId, error } = await validasi(req.body || {}, true);
  if (error) return res.status(400).json({ error });
  if (await prisma.pengguna.findUnique({ where: { email: data.email } })) return res.status(409).json({ error: 'Email sudah terdaftar' });
  const p = await prisma.pengguna.create({
    data: { ...data, peran: { create: peranId.map((peran_id) => ({ peran_id })) } },
    select: pilih,
  });
  await catat({ req, nama_tabel: 'pengguna', id_data: p.id, aksi: 'BUAT', nilai_baru: bentuk(p) });
  res.status(201).json(bentuk(p));
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.pengguna.findUnique({ where: { id }, select: pilih });
  if (!lama) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
  const { data, peranId, error } = await validasi(req.body || {}, false);
  if (error) return res.status(400).json({ error });

  if (id === req.pengguna.id) {
    if (data.aktif === false) return res.status(400).json({ error: 'Tidak dapat menonaktifkan akun sendiri' });
    const peranBaru = req.body.peran;
    if (peranBaru && !peranBaru.includes('ADMIN')) return res.status(400).json({ error: 'Tidak dapat mencabut peran Administrator dari akun sendiri' });
  }

  const p = await prisma.$transaction(async (tx) => {
    if (peranId) {
      await tx.pengguna_peran.deleteMany({ where: { pengguna_id: id } });
      await tx.pengguna_peran.createMany({ data: peranId.map((peran_id) => ({ pengguna_id: id, peran_id })) });
    }
    // Paksa login ulang bila akun dinonaktifkan, sandi direset, atau peran berubah.
    if (data.aktif === false || data.kata_sandi_hash || peranId) await tx.sesi.deleteMany({ where: { pengguna_id: id } });
    return tx.pengguna.update({ where: { id }, data, select: pilih });
  });

  await catat({ req, nama_tabel: 'pengguna', id_data: id, aksi: data.kata_sandi_hash ? 'UBAH+RESET_SANDI' : 'UBAH', nilai_lama: bentuk(lama), nilai_baru: bentuk(p) });
  res.json(bentuk(p));
});

module.exports = { router };
