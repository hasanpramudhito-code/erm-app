// Alur persetujuan tetap (handoff bagian 7), dipakai untuk risiko dan laporan pemantauan bulanan:
//   DRAF/DIKEMBALIKAN --ajukan(petugas unit)--> DIAJUKAN --setujui(pimpinan unit)--> DISETUJUI_PIMPINAN
//   --finalkan(pengelola risiko)--> FINAL. Kembalikan (dengan catatan) dari DIAJUKAN/DISETUJUI_PIMPINAN;
//   buka kunci FINAL -> DIKEMBALIKAN oleh pengelola risiko.
const express = require('express');
const prisma = require('./db');
const { wajibLogin, cakupanUnit } = require('./auth');
const { catat } = require('./audit');

const router = express.Router();
router.use(wajibLogin);

const PIMPINAN = ['PIMPINAN_UNIT_PUSAT', 'PIMPINAN_CABANG'];
const PETUGAS = ['PETUGAS_RISIKO_PUSAT', 'PETUGAS_RISIKO_CABANG'];
const PENGELOLA = ['PENGELOLA_RISIKO'];
const ADMIN = ['ADMIN_SISTEM', 'DIREKSI'];

const galat = (status, message) => Object.assign(new Error(message), { status, expose: true });
const punya = (p, daftar) => p.peran.some((x) => daftar.includes(x));
const diUnit = (p, unit_id) => p.unit_id === unit_id;

// Aksi -> status asal yang sah, status tujuan, dan siapa yang boleh.
const AKSI = {
  ajukan: {
    dari: ['DRAF', 'DIKEMBALIKAN'], ke: 'DIAJUKAN',
    boleh: (p, unit_id) => punya(p, ADMIN) || ((punya(p, PETUGAS) || punya(p, PIMPINAN)) && diUnit(p, unit_id)),
  },
  setujui: {
    dari: ['DIAJUKAN'], ke: 'DISETUJUI_PIMPINAN',
    boleh: (p, unit_id) => punya(p, ADMIN) || (punya(p, PIMPINAN) && diUnit(p, unit_id)),
  },
  finalkan: {
    dari: ['DISETUJUI_PIMPINAN'], ke: 'FINAL',
    boleh: (p) => punya(p, ADMIN) || punya(p, PENGELOLA),
  },
  kembalikan: {
    dari: ['DIAJUKAN', 'DISETUJUI_PIMPINAN'], ke: 'DIKEMBALIKAN', wajibCatatan: true,
    // Pimpinan mengembalikan yang baru diajukan; pengelola mengembalikan yang sudah disetujui pimpinan.
    boleh: (p, unit_id, status) => punya(p, ADMIN) ||
      (status === 'DIAJUKAN' && punya(p, PIMPINAN) && diUnit(p, unit_id)) ||
      (status === 'DISETUJUI_PIMPINAN' && punya(p, PENGELOLA)),
  },
  buka: {
    dari: ['FINAL'], ke: 'DIKEMBALIKAN', wajibCatatan: true,
    boleh: (p) => punya(p, ADMIN) || punya(p, PENGELOLA),
  },
};

// Entitas yang bisa disetujui: cara ambil (dengan unit untuk cek hak) dan nama tabel.
const ENTITAS = {
  risiko: {
    jenis: 'RISIKO', tabel: 'risiko',
    ambil: (id, p) => prisma.risiko.findFirst({ where: { id, ...cakupanUnit(p) }, select: { id: true, kode: true, unit_id: true, status_persetujuan: true } }),
    label: (e) => `Risiko ${e.kode}`,
    tautan: () => '/risk-register',
  },
  pemantauan: {
    jenis: 'PEMANTAUAN', tabel: 'pemantauan_bulanan',
    ambil: async (id, p) => {
      const e = await prisma.pemantauan_bulanan.findFirst({
        where: { id, risiko: cakupanUnit(p) },
        select: { id: true, tahun: true, bulan: true, status_persetujuan: true, risiko: { select: { kode: true, unit_id: true, status_persetujuan: true } } },
      });
      return e && { ...e, unit_id: e.risiko.unit_id, kode: e.risiko.kode, status_risiko: e.risiko.status_persetujuan };
    },
    label: (e) => `Laporan ${e.bulan}/${e.tahun} risiko ${e.kode}`,
    tautan: () => '/pemantauan-bulanan',
  },
};

// Penerima notifikasi untuk status baru.
async function penerima(status, unit_id) {
  const peran = status === 'DIAJUKAN' ? PIMPINAN : status === 'DISETUJUI_PIMPINAN' ? PENGELOLA : [...PETUGAS, ...PIMPINAN];
  const lingkupUnit = status === 'DISETUJUI_PIMPINAN' ? {} : { unit_id };
  return prisma.pengguna.findMany({
    where: { aktif: true, ...lingkupUnit, peran: { some: { peran: { kode: { in: peran } } } } },
    select: { id: true },
  });
}

async function jalankan(req, jenisEntitas, id, aksi, catatan) {
  const E = ENTITAS[jenisEntitas], A = AKSI[aksi];
  if (!E || !A) throw galat(404, 'Aksi tidak dikenal');
  const e = await E.ambil(id, req.pengguna);
  if (!e) throw galat(404, 'Data tidak ditemukan');
  if (!A.dari.includes(e.status_persetujuan)) throw galat(400, `Tidak dapat ${aksi} dari status ${e.status_persetujuan}`);
  if (!A.boleh(req.pengguna, e.unit_id, e.status_persetujuan)) throw galat(403, 'Anda tidak berwenang untuk aksi ini');
  if (A.wajibCatatan && !catatan) throw galat(400, 'Catatan wajib diisi');
  // Laporan bulanan hanya bisa diajukan setelah risikonya FINAL, agar yang dipantau adalah register yang sah.
  if (jenisEntitas === 'pemantauan' && aksi === 'ajukan' && e.status_risiko !== 'FINAL')
    throw galat(400, 'Risiko belum FINAL; ajukan dan finalkan risiko di Risk Register terlebih dahulu');

  const sekarang = new Date();
  await prisma.$transaction(async (tx) => {
    // updateMany dengan syarat status lama: mencegah dua orang memproses data yang sama bersamaan.
    const data = { status_persetujuan: A.ke, ...(jenisEntitas === 'pemantauan' && aksi === 'ajukan' ? { diajukan_pada: sekarang } : {}) };
    const n = await tx[E.tabel].updateMany({ where: { id, status_persetujuan: e.status_persetujuan }, data });
    if (n.count !== 1) throw galat(409, 'Data sudah diproses orang lain, muat ulang halaman');
    await tx.riwayat_persetujuan.create({
      data: { entitas: E.jenis, entitas_id: id, dari_status: e.status_persetujuan, ke_status: A.ke, pengguna_id: req.pengguna.id, catatan },
    });
    const ke = (await penerima(A.ke, e.unit_id)).filter((p) => p.id !== req.pengguna.id);
    await tx.notifikasi.createMany({
      data: ke.map((p) => ({
        penerima_id: p.id, jenis: 'PERSETUJUAN', tautan: E.tautan(e),
        pesan: `${E.label(e)}: ${e.status_persetujuan} -> ${A.ke}${catatan ? ` (${catatan})` : ''}`,
      })),
    });
  });
  await catat({ req, nama_tabel: E.tabel, id_data: id, aksi: `PERSETUJUAN_${aksi.toUpperCase()}`, nilai_lama: { status: e.status_persetujuan }, nilai_baru: { status: A.ke, catatan } });
  return { id, status_persetujuan: A.ke };
}

router.post('/:entitas/:id/:aksi', async (req, res) => {
  const catatan = String(req.body?.catatan ?? '').trim() || null;
  res.json(await jalankan(req, req.params.entitas, Number(req.params.id), req.params.aksi, catatan));
});

// Proses banyak sekaligus (antrean verifikasi). Hasil per item; satu gagal tidak menggagalkan yang lain.
router.post('/massal', async (req, res) => {
  const { entitas, aksi, ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length || ids.length > 200) throw galat(400, 'ids harus daftar 1-200 item');
  const catatan = String(req.body?.catatan ?? '').trim() || null;
  const hasil = [];
  for (const id of ids) {
    try {
      hasil.push({ id, ok: true, ...(await jalankan(req, entitas, Number(id), aksi, catatan)) });
    } catch (err) {
      if (!err.expose) throw err;
      hasil.push({ id, ok: false, error: err.message });
    }
  }
  res.json(hasil);
});

router.get('/:entitas/:id/riwayat', async (req, res) => {
  const E = ENTITAS[req.params.entitas];
  if (!E) throw galat(404, 'Entitas tidak dikenal');
  const id = Number(req.params.id);
  if (!(await E.ambil(id, req.pengguna))) throw galat(404, 'Data tidak ditemukan');
  res.json(await prisma.riwayat_persetujuan.findMany({
    where: { entitas: E.jenis, entitas_id: id },
    select: { id: true, dari_status: true, ke_status: true, catatan: true, dibuat_pada: true, pengguna: { select: { nama: true } } },
    orderBy: { dibuat_pada: 'desc' },
  }));
});

// Antrean: hal-hal yang menunggu aksi pengguna ini.
router.get('/antrean', async (req, res) => {
  const p = req.pengguna;
  const status = [];
  if (punya(p, [...PIMPINAN, ...ADMIN])) status.push('DIAJUKAN');
  if (punya(p, [...PENGELOLA, ...ADMIN])) status.push('DISETUJUI_PIMPINAN');
  if (!status.length) return res.json({ risiko: [], pemantauan: [] });
  // Pimpinan hanya untuk unitnya; pengelola/admin semua unit.
  const unitFilter = (s) => (s === 'DIAJUKAN' && !punya(p, [...ADMIN])) ? { unit_id: p.unit_id ?? -1 } : {};
  const or = status.map((s) => ({ status_persetujuan: s, ...unitFilter(s) }));
  const [risiko, pemantauan] = await Promise.all([
    prisma.risiko.findMany({
      where: { OR: or },
      select: { id: true, kode: true, nama: true, deskripsi: true, status_persetujuan: true, diubah_pada: true, unit_id: true, unit: { select: { nama: true } }, periode: { select: { nama: true } } },
      orderBy: { diubah_pada: 'asc' },
    }),
    prisma.pemantauan_bulanan.findMany({
      where: { OR: or.map(({ unit_id, ...s }) => ({ ...s, ...(unit_id !== undefined ? { risiko: { unit_id } } : {}) })) },
      select: {
        id: true, tahun: true, bulan: true, status_persetujuan: true, diajukan_pada: true, peristiwa_terjadi: true,
        risiko: { select: { id: true, kode: true, nama: true, deskripsi: true, unit_id: true, unit: { select: { nama: true } } } },
      },
      orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
    }),
  ]);
  res.json({ risiko, pemantauan });
});

// ---- Notifikasi ----
router.get('/notifikasi', async (req, res) => {
  res.json(await prisma.notifikasi.findMany({ where: { penerima_id: req.pengguna.id }, orderBy: { dibuat_pada: 'desc' }, take: 50 }));
});
router.post('/notifikasi/baca', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : undefined;
  await prisma.notifikasi.updateMany({ where: { penerima_id: req.pengguna.id, ...(ids ? { id: { in: ids } } : {}) }, data: { dibaca: true } });
  res.status(204).end();
});

router.use((err, req, res, next) => (err.expose ? res.status(err.status).json({ error: err.message }) : next(err)));

module.exports = { router, AKSI };
