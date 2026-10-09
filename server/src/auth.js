const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const prisma = require('./db');
const { catat } = require('./audit');

const NAMA_COOKIE = 'erm_sesi';
const DURASI_SESI_MS = 8 * 60 * 60 * 1000; // 8 jam
const PERAN_LIHAT_SEMUA = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'AUDITOR'];
const ringkasUK = { id: true, kode: true, nama: true, jenis: true, pemilik_risiko: true, alur_persetujuan: true, induk_id: true };

// Unit kerja pemilik risiko terdekat ke atas (adendum v2 F: sub-bagian memakai cakupan bagian induknya).
async function pemilikRisiko(uk) {
  for (let i = 0; uk && !uk.pemilik_risiko && uk.induk_id && i < 10; i++)
    uk = await prisma.unit_kerja.findUnique({ where: { id: uk.induk_id }, select: ringkasUK });
  return uk?.pemilik_risiko ? uk : null;
}

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

function bacaCookie(req, nama) {
  for (const bagian of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = bagian.trim().split('=');
    if (k === nama) return decodeURIComponent(v.join('='));
  }
  return null;
}

// ponytail: rate limit di memori, hilang saat restart & tidak berbagi antar proses. Pindah ke tabel bila server >1 instance.
const percobaanGagal = new Map();
const BATAS_GAGAL = 5;
const JEDA_MS = 15 * 60 * 1000;

function terkunci(kunci) {
  const p = percobaanGagal.get(kunci);
  if (!p) return false;
  if (Date.now() - p.pertama > JEDA_MS) { percobaanGagal.delete(kunci); return false; }
  return p.jumlah >= BATAS_GAGAL;
}

function catatGagal(kunci) {
  const p = percobaanGagal.get(kunci);
  if (!p || Date.now() - p.pertama > JEDA_MS) percobaanGagal.set(kunci, { jumlah: 1, pertama: Date.now() });
  else p.jumlah++;
}

// unit_kerja_id = unit kerja pemilik risiko yang menjadi cakupan data; unit_kerja_asal = tempat pengguna terdaftar.
async function profil(p) {
  const pemilik = await pemilikRisiko(p.unit_kerja);
  return {
    id: p.id,
    nama: p.nama,
    email: p.email,
    jabatan: p.jabatan,
    unit_kerja_asal: p.unit_kerja && { id: p.unit_kerja.id, kode: p.unit_kerja.kode, nama: p.unit_kerja.nama, jenis: p.unit_kerja.jenis },
    unit_kerja: pemilik && { id: pemilik.id, kode: pemilik.kode, nama: pemilik.nama, jenis: pemilik.jenis, alur_persetujuan: pemilik.alur_persetujuan },
    unit_kerja_id: pemilik?.id ?? null,
    peran: p.peran.map((x) => x.peran.kode),
  };
}

const sertakan = { unit_kerja: { select: ringkasUK }, peran: { include: { peran: true } } };

// Pasang req.pengguna bila cookie sesi valid.
async function sesi(req, res, next) {
  const token = bacaCookie(req, NAMA_COOKIE);
  if (!token) return next();
  const s = await prisma.sesi.findUnique({
    where: { token_hash: hash(token) },
    include: { pengguna: { include: sertakan } },
  });
  if (s && s.kedaluwarsa > new Date() && s.pengguna.aktif) {
    req.pengguna = await profil(s.pengguna);
  }
  next();
}

function wajibLogin(req, res, next) {
  if (!req.pengguna) return res.status(401).json({ error: 'Belum login' });
  next();
}

// Lolos bila pengguna punya salah satu peran yang diminta.
const wajibPeran = (...peran) => (req, res, next) => {
  if (!req.pengguna) return res.status(401).json({ error: 'Belum login' });
  if (!req.pengguna.peran.some((p) => peran.includes(p))) return res.status(403).json({ error: 'Akses ditolak' });
  next();
};

// Filter Prisma untuk membatasi data ke unit kerja pengguna. {} = tanpa batas.
function cakupanUnitKerja(pengguna, kolom = 'unit_kerja_id') {
  if (pengguna.peran.some((p) => PERAN_LIHAT_SEMUA.includes(p))) return {};
  return { [kolom]: pengguna.unit_kerja_id ?? -1 };
}

const router = express.Router();

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const kata_sandi = String(req.body?.kata_sandi || '');
  const kunci = `${req.ip}|${email}`;
  if (!email || !kata_sandi) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi' });
  if (terkunci(kunci)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' });

  const p = await prisma.pengguna.findUnique({ where: { email }, include: sertakan });
  const cocok = p && p.aktif && (await bcrypt.compare(kata_sandi, p.kata_sandi_hash));
  if (!cocok) {
    catatGagal(kunci);
    return res.status(401).json({ error: 'Email atau kata sandi salah' });
  }
  percobaanGagal.delete(kunci);

  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.sesi.create({
    data: { token_hash: hash(token), pengguna_id: p.id, kedaluwarsa: new Date(Date.now() + DURASI_SESI_MS), alamat_ip: req.ip },
  });
  await prisma.pengguna.update({ where: { id: p.id }, data: { login_terakhir: new Date() } });
  await catat({ req, nama_tabel: 'pengguna', id_data: p.id, aksi: 'LOGIN', pengguna_id: p.id });

  res.cookie(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURASI_SESI_MS,
    path: '/',
  });
  res.json(await profil(p));
});

router.post('/logout', async (req, res) => {
  const token = bacaCookie(req, NAMA_COOKIE);
  if (token) await prisma.sesi.deleteMany({ where: { token_hash: hash(token) } });
  res.clearCookie(NAMA_COOKIE, { path: '/' });
  res.status(204).end();
});

router.get('/saya', wajibLogin, (req, res) => res.json(req.pengguna));

module.exports = { router, sesi, wajibLogin, wajibPeran, cakupanUnitKerja, hashKataSandi: (s) => bcrypt.hash(s, 12) };
