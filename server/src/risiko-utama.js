// Risiko utama + pustaka penyebab/dampak (handoff 5.1, 5.3) dan pembentukan entri draf otomatis untuk cabang.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, wajibPeran } = require('./auth');
const { catat } = require('./audit');

const router = express.Router();
router.use(wajibLogin);

const PENULIS = ['ADMIN', 'PENGELOLA_RISIKO'];
const galat = (status, message) => Object.assign(new Error(message), { status, expose: true });

const sertakan = {
  kategori: { select: { id: true, kode: true, nama: true } },
  direktorat_pemilik: { select: { id: true, kode: true, nama: true } },
  pustaka_penyebab: { where: { aktif: true }, orderBy: { id: 'asc' }, select: { id: true, uraian: true } },
  pustaka_dampak: { where: { aktif: true }, orderBy: { id: 'asc' }, select: { id: true, uraian: true } },
  kri_baku: { where: { aktif: true }, orderBy: { id: 'asc' } },
  _count: { select: { risiko: true } },
};

// Kolom definisi yang disalin dari KRI baku ke KRI unit kerja.
const KOLOM_KRI = ['nama', 'deskripsi', 'satuan', 'rumus', 'label_pembilang', 'label_penyebut', 'pengali', 'arah_target', 'frekuensi', 'ambang_hijau', 'ambang_kuning', 'ambang_merah'];

// Salin KRI baku aktif ke setiap entri risiko utama ini (buat yang belum ada, samakan definisi yang sudah ada).
// KRI baku yang dinonaktifkan dibiarkan di entri (riwayat pemantauannya tetap), tapi tidak lagi disamakan.
// Periode DITUTUP tidak disentuh agar batas warna riwayatnya tetap seperti saat dilaporkan.
async function sinkronKriBaku(tx, risiko_utama_id) {
  const baku = await tx.kri_baku.findMany({ where: { risiko_utama_id, aktif: true } });
  if (!baku.length) return;
  const entri = await tx.risiko.findMany({ where: { risiko_utama_id, periode: { status: { not: 'DITUTUP' } } }, select: { id: true, kri: { where: { kri_baku_id: { not: null } }, select: { id: true, kri_baku_id: true } } } });
  for (const e of entri) for (const kb of baku) {
    const def = Object.fromEntries(KOLOM_KRI.map((k) => [k, kb[k]]));
    const ada = e.kri.find((k) => k.kri_baku_id === kb.id);
    if (ada) await tx.kri.update({ where: { id: ada.id }, data: def });
    else await tx.kri.create({ data: { ...def, risiko_id: e.id, kri_baku_id: kb.id } });
  }
}

// Sinkron daftar KRI baku dari form risiko utama (by id). KRI baku yang sudah dipakai entri dinonaktifkan, bukan dihapus.
async function simpanKriBaku(tx, risiko_utama_id, daftar) {
  const lama = await tx.kri_baku.findMany({ where: { risiko_utama_id, aktif: true }, select: { id: true, _count: { select: { kri: true } } } });
  const dikirim = new Set(daftar.filter((x) => x.id).map((x) => x.id));
  for (const l of lama) {
    if (dikirim.has(l.id)) continue;
    if (l._count.kri) await tx.kri_baku.update({ where: { id: l.id }, data: { aktif: false } });
    else await tx.kri_baku.delete({ where: { id: l.id } });
  }
  const idLama = new Set(lama.map((l) => l.id));
  for (const { id, pemilik_id, ...data } of daftar) {
    if (id && !idLama.has(id)) throw galat(400, `KRI baku #${id} bukan milik risiko utama ini`);
    if (id) await tx.kri_baku.update({ where: { id }, data });
    else await tx.kri_baku.create({ data: { ...data, risiko_utama_id } });
  }
  await sinkronKriBaku(tx, risiko_utama_id);
}

// Bentuk entri draf: setiap Cabang/Unit aktif x setiap risiko utama CABANG aktif dalam daftar periode TERBUKA.
// Idempoten (unique periode+unit+risiko_utama). Kembalikan jumlah entri baru.
async function bentukEntriCabang(periode_id) {
  const periode = await prisma.periode.findMany({ where: { status: 'TERBUKA', ...(periode_id ? { id: periode_id } : {}) } });
  const cabang = await prisma.unit_kerja.findMany({ where: { jenis: { in: ['CABANG', 'UNIT'] }, pemilik_risiko: true, aktif: true }, select: { id: true, kode: true } });
  let dibuat = 0;
  for (const p of periode) {
    const utama = await prisma.risiko_utama.findMany({ where: { berlaku_untuk: 'CABANG', aktif: true, periode: { some: { periode_id: p.id } } } });
    const ada = new Set((await prisma.risiko.findMany({
      where: { periode_id: p.id, risiko_utama_id: { not: null } }, select: { unit_kerja_id: true, risiko_utama_id: true },
    })).map((r) => `${r.unit_kerja_id}-${r.risiko_utama_id}`));
    const data = [];
    for (const u of cabang) for (const ru of utama) {
      if (ada.has(`${u.id}-${ru.id}`)) continue;
      data.push({ periode_id: p.id, unit_kerja_id: u.id, risiko_utama_id: ru.id, kode: `${ru.kode}-${u.kode}`.slice(0, 50), nama: ru.nama, deskripsi: ru.deskripsi, kategori_id: ru.kategori_id });
    }
    if (data.length) dibuat += (await prisma.risiko.createMany({ data, skipDuplicates: true })).count;
    for (const ru of utama) await sinkronKriBaku(prisma, ru.id);
  }
  return dibuat;
}

const bersihkanKri = (...a) => require('./risiko').bersihkanKri(...a);

const daftarUraian = (arr, nama) => {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw galat(400, `${nama} harus daftar`);
  return arr.map((x) => ({ id: x.id ? Number(x.id) : undefined, uraian: String(x.uraian ?? '').trim() })).filter((x) => x.uraian);
};

async function bersihkan(b, baru) {
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
  let kri;
  if (b.kri !== undefined) {
    const h = await bersihkanKri(b.kri);
    if (h.error) throw galat(400, h.error);
    kri = h.daftar;
  }
  return { data, penyebab: daftarUraian(b.penyebab, 'penyebab'), dampak: daftarUraian(b.dampak, 'dampak'), kri };
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
  if (h.kri) await simpanKriBaku(tx, id, h.kri);
  return tx.risiko_utama.findUnique({ where: { id }, include: sertakan });
}

router.get('/', async (req, res) => {
  const periode_id = Number(req.query.periode_id) || null;
  const where = {
    ...(req.query.berlaku_untuk ? { berlaku_untuk: req.query.berlaku_untuk } : {}),
    ...(req.query.semua ? {} : { aktif: true }),
    ...(periode_id ? { periode: { some: { periode_id } } } : {}),
  };
  const list = await prisma.risiko_utama.findMany({
    where,
    include: { ...sertakan, periode: { select: { periode_id: true } } },
    orderBy: [{ berlaku_untuk: 'asc' }, { kode: 'asc' }],
  });
  res.json(list.map(({ periode, ...r }) => ({ ...r, periode_ids: periode.map((p) => p.periode_id) })));
});

// Atur daftar risiko utama satu periode (ganti seluruhnya). Entri unit yang sudah ada tidak dihapus.
router.put('/periode/:periodeId', wajibPeran(...PENULIS), async (req, res) => {
  const periode_id = Number(req.params.periodeId);
  const periode = await prisma.periode.findUnique({ where: { id: periode_id } });
  if (!periode) throw galat(404, 'Periode tidak ditemukan');
  if (periode.status === 'DITUTUP') throw galat(400, 'Periode sudah ditutup');
  const ids = [...new Set((Array.isArray(req.body?.risiko_utama_ids) ? req.body.risiko_utama_ids : []).map(Number))];
  if ((await prisma.risiko_utama.count({ where: { id: { in: ids } } })) !== ids.length) throw galat(400, 'Ada risiko utama yang tidak dikenal');
  await prisma.$transaction([
    prisma.periode_risiko_utama.deleteMany({ where: { periode_id, risiko_utama_id: { notIn: ids } } }),
    prisma.periode_risiko_utama.createMany({ data: ids.map((risiko_utama_id) => ({ periode_id, risiko_utama_id })), skipDuplicates: true }),
  ]);
  await catat({ req, nama_tabel: 'periode_risiko_utama', id_data: periode_id, aksi: 'ATUR_DAFTAR', nilai_baru: { risiko_utama_ids: ids } });
  const entri_dibuat = periode.status === 'TERBUKA' ? await bentukEntriCabang(periode_id) : 0;
  res.json({ jumlah: ids.length, entri_dibuat });
});

// Salin daftar risiko utama dari periode lain (ditambahkan, tidak menghapus yang sudah ada).
router.post('/periode/:periodeId/salin', wajibPeran(...PENULIS), async (req, res) => {
  const periode_id = Number(req.params.periodeId);
  const dari = Number(req.body?.dari_periode_id);
  const [tujuan, asal] = await Promise.all([prisma.periode.findUnique({ where: { id: periode_id } }), prisma.periode.findUnique({ where: { id: dari } })]);
  if (!tujuan || !asal) throw galat(404, 'Periode tidak ditemukan');
  if (tujuan.status === 'DITUTUP') throw galat(400, 'Periode tujuan sudah ditutup');
  if (dari === periode_id) throw galat(400, 'Periode asal dan tujuan sama');
  const daftar = await prisma.periode_risiko_utama.findMany({ where: { periode_id: dari, risiko_utama: { aktif: true } }, select: { risiko_utama_id: true } });
  const { count } = await prisma.periode_risiko_utama.createMany({ data: daftar.map((d) => ({ periode_id, risiko_utama_id: d.risiko_utama_id })), skipDuplicates: true });
  await catat({ req, nama_tabel: 'periode_risiko_utama', id_data: periode_id, aksi: 'SALIN_DAFTAR', nilai_baru: { dari_periode_id: dari, ditambahkan: count } });
  const entri_dibuat = tujuan.status === 'TERBUKA' ? await bentukEntriCabang(periode_id) : 0;
  res.json({ ditambahkan: count, entri_dibuat });
});

router.post('/bentuk-entri', wajibPeran(...PENULIS), async (req, res) => {
  const dibuat = await bentukEntriCabang(req.body?.periode_id ? Number(req.body.periode_id) : undefined);
  await catat({ req, nama_tabel: 'risiko', id_data: '-', aksi: 'BENTUK_ENTRI_CABANG', nilai_baru: { dibuat } });
  res.json({ dibuat });
});

router.post('/', wajibPeran(...PENULIS), async (req, res) => {
  const h = await bersihkan(req.body || {}, true);
  const periode_id = Number(req.body?.periode_id) || null;
  const r = await prisma.$transaction(async (tx) => {
    const baru = await tx.risiko_utama.create({ data: h.data });
    if (periode_id) await tx.periode_risiko_utama.create({ data: { periode_id, risiko_utama_id: baru.id } });
    return simpan(tx, baru.id, h);
  });
  await catat({ req, nama_tabel: 'risiko_utama', id_data: r.id, aksi: 'BUAT', nilai_baru: r });
  const entri = periode_id && r.berlaku_untuk === 'CABANG' && r.aktif ? await bentukEntriCabang(periode_id) : 0;
  res.status(201).json({ ...r, entri_dibuat: entri });
});

router.patch('/:id', wajibPeran(...PENULIS), async (req, res) => {
  const id = Number(req.params.id);
  const lama = await prisma.risiko_utama.findUnique({ where: { id }, include: sertakan });
  if (!lama) throw galat(404, 'Risiko utama tidak ditemukan');
  const h = await bersihkan(req.body || {}, false);
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
    prisma.kri_baku.deleteMany({ where: { risiko_utama_id: id } }),
    prisma.risiko_utama.delete({ where: { id } }),
  ]);
  await catat({ req, nama_tabel: 'risiko_utama', id_data: id, aksi: 'HAPUS', nilai_lama: lama });
  res.status(204).end();
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router, bentukEntriCabang, sinkronKriBaku };
