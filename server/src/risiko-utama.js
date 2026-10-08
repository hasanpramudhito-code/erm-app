// Risiko utama + pustaka penyebab/dampak (handoff 5.1, 5.3) dan pembentukan entri draf otomatis untuk cabang.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran } = require('./auth');
const { catat } = require('./audit');

const router = express.Router();
router.use(wajibLogin);

const PENULIS = ['ADMIN_SISTEM', 'PENGELOLA_RISIKO'];
const galat = (status, message) => Object.assign(new Error(message), { status, expose: true });

const sertakan = {
  kategori: { select: { id: true, kode: true, nama: true } },
  direktorat_pemilik: { select: { id: true, kode: true, nama: true } },
  pustaka_penyebab: { where: { aktif: true }, orderBy: { id: 'asc' }, select: { id: true, uraian: true } },
  pustaka_dampak: { where: { aktif: true }, orderBy: { id: 'asc' }, select: { id: true, uraian: true } },
  _count: { select: { risiko: true } },
};

// Bentuk entri draf: setiap cabang aktif x setiap risiko utama CABANG aktif, pada periode TERBUKA.
// Idempoten (unique periode+unit+risiko_utama). Kembalikan jumlah entri baru.
async function bentukEntriCabang(periode_id) {
  const periode = await prisma.periode.findMany({ where: { status: 'TERBUKA', ...(periode_id ? { id: periode_id } : {}) } });
  const [cabang, utama] = await Promise.all([
    prisma.unit.findMany({ where: { jenis: 'CABANG', aktif: true }, select: { id: true, kode: true } }),
    prisma.risiko_utama.findMany({ where: { berlaku_untuk: 'CABANG', aktif: true } }),
  ]);
  let dibuat = 0;
  for (const p of periode) {
    const ada = new Set((await prisma.risiko.findMany({
      where: { periode_id: p.id, risiko_utama_id: { not: null } }, select: { unit_id: true, risiko_utama_id: true },
    })).map((r) => `${r.unit_id}-${r.risiko_utama_id}`));
    const data = [];
    for (const u of cabang) for (const ru of utama) {
      if (ada.has(`${u.id}-${ru.id}`)) continue;
      data.push({ periode_id: p.id, unit_id: u.id, risiko_utama_id: ru.id, kode: `${ru.kode}-${u.kode}`.slice(0, 50), nama: ru.nama, deskripsi: ru.deskripsi, kategori_id: ru.kategori_id });
    }
    if (data.length) dibuat += (await prisma.risiko.createMany({ data, skipDuplicates: true })).count;
  }
  return dibuat;
}

const daftarUraian = (arr, nama) => {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw galat(400, `${nama} harus daftar`);
  return arr.map((x) => ({ id: x.id ? Number(x.id) : undefined, uraian: String(x.uraian ?? '').trim() })).filter((x) => x.uraian);
};

function bersihkan(b, baru) {
  const t = (v) => (v === undefined ? undefined : String(v ?? '').trim() || null);
  const data = Object.fromEntries(Object.entries({
    kode: t(b.kode)?.toUpperCase(),
    nama: t(b.nama),
    deskripsi: t(b.deskripsi),
    berlaku_untuk: b.berlaku_untuk,
    kategori_id: b.kategori_id === undefined ? undefined : Number(b.kategori_id) || null,
    direktorat_pemilik_id: b.direktorat_pemilik_id === undefined ? undefined : Number(b.direktorat_pemilik_id) || null,
    aktif: b.aktif === undefined ? undefined : Boolean(b.aktif),
  }).filter(([, v]) => v !== undefined));
  if (baru) for (const k of ['kode', 'nama', 'berlaku_untuk']) if (!data[k]) throw galat(400, `${k} wajib diisi`);
  if (data.kode === null || data.nama === null) throw galat(400, 'Kode dan nama tidak boleh kosong');
  if (data.berlaku_untuk && !['CABANG', 'PUSAT'].includes(data.berlaku_untuk)) throw galat(400, 'Berlaku untuk harus CABANG atau PUSAT');
  return { data, penyebab: daftarUraian(b.penyebab, 'penyebab'), dampak: daftarUraian(b.dampak, 'dampak') };
}

// Sinkron pustaka by id. Item yang sudah dipakai risiko dinonaktifkan (bukan dihapus) agar rujukan analisis tetap ada.
async function sinkronPustaka(tx, model, relasi, risiko_utama_id, daftar) {
  const lama = await tx[model].findMany({ where: { risiko_utama_id, aktif: true }, select: { id: true, _count: { select: { [relasi]: true } } } });
  const dikirim = new Set(daftar.filter((x) => x.id).map((x) => x.id));
  for (const l of lama) {
    if (dikirim.has(l.id)) continue;
    if (l._count[relasi]) await tx[model].update({ where: { id: l.id }, data: { aktif: false } });
    else await tx[model].delete({ where: { id: l.id } });
  }
  const idLama = new Set(lama.map((l) => l.id));
  for (const { id, uraian } of daftar) {
    if (id && !idLama.has(id)) throw galat(400, `Item pustaka #${id} bukan milik risiko utama ini`);
    if (id) await tx[model].update({ where: { id }, data: { uraian } });
    else await tx[model].create({ data: { risiko_utama_id, uraian } });
  }
}

async function simpan(tx, id, h) {
  if (h.penyebab) await sinkronPustaka(tx, 'pustaka_penyebab', 'risiko_penyebab', id, h.penyebab);
  if (h.dampak) await sinkronPustaka(tx, 'pustaka_dampak', 'risiko_dampak', id, h.dampak);
  return tx.risiko_utama.findUnique({ where: { id }, include: sertakan });
}

router.get('/', async (req, res) => {
  const where = {
    ...(req.query.berlaku_untuk ? { berlaku_untuk: req.query.berlaku_untuk } : {}),
    ...(req.query.semua ? {} : { aktif: true }),
  };
  res.json(await prisma.risiko_utama.findMany({ where, include: sertakan, orderBy: [{ berlaku_untuk: 'asc' }, { kode: 'asc' }] }));
});

router.post('/bentuk-entri', wajibPeran(...PENULIS), async (req, res) => {
  const dibuat = await bentukEntriCabang(req.body?.periode_id ? Number(req.body.periode_id) : undefined);
  await catat({ req, nama_tabel: 'risiko', id_data: '-', aksi: 'BENTUK_ENTRI_CABANG', nilai_baru: { dibuat } });
  res.json({ dibuat });
});

router.post('/', wajibPeran(...PENULIS), async (req, res) => {
  const h = bersihkan(req.body || {}, true);
  const r = await prisma.$transaction(async (tx) => simpan(tx, (await tx.risiko_utama.create({ data: h.data })).id, h));
  await catat({ req, nama_tabel: 'risiko_utama', id_data: r.id, aksi: 'BUAT', nilai_baru: r });
  const entri = r.berlaku_untuk === 'CABANG' && r.aktif ? await bentukEntriCabang() : 0;
  res.status(201).json({ ...r, entri_dibuat: entri });
});

router.patch('/:id', wajibPeran(...PENULIS), async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko_utama.findUnique({ where: { id }, include: sertakan });
  if (!lama) throw galat(404, 'Risiko utama tidak ditemukan');
  const h = bersihkan(req.body || {}, false);
  if (h.data.berlaku_untuk && h.data.berlaku_untuk !== lama.berlaku_untuk && lama._count.risiko)
    throw galat(400, 'Tidak dapat mengubah "berlaku untuk" karena sudah dipakai di risk register');
  const r = await prisma.$transaction(async (tx) => {
    await tx.risiko_utama.update({ where: { id }, data: h.data });
    return simpan(tx, id, h);
  });
  await catat({ req, nama_tabel: 'risiko_utama', id_data: id, aksi: 'UBAH', nilai_lama: lama, nilai_baru: r });
  const entri = r.berlaku_untuk === 'CABANG' && r.aktif && !lama.aktif ? await bentukEntriCabang() : 0;
  res.json({ ...r, entri_dibuat: entri });
});

router.delete('/:id', wajibPeran(...PENULIS), async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko_utama.findUnique({ where: { id }, include: sertakan });
  if (!lama) throw galat(404, 'Risiko utama tidak ditemukan');
  // Menghapus akan mengubah entri unit diam-diam menjadi risiko spesifik; tolak dan sarankan nonaktif.
  if (lama._count.risiko) throw galat(409, `Sudah dipakai ${lama._count.risiko} entri risk register. Nonaktifkan saja.`);
  await prisma.$transaction([
    prisma.pustaka_penyebab.deleteMany({ where: { risiko_utama_id: id } }),
    prisma.pustaka_dampak.deleteMany({ where: { risiko_utama_id: id } }),
    prisma.risiko_utama.delete({ where: { id } }),
  ]);
  await catat({ req, nama_tabel: 'risiko_utama', id_data: id, aksi: 'HAPUS', nilai_lama: lama });
  res.status(204).end();
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router, bentukEntriCabang };
