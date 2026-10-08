// Uji alur persetujuan dengan peran nyata: petugas -> pimpinan -> pengelola risiko.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, periode, unitA, unitB;
const ck = {};
const ids = {};
const sufiks = Date.now() % 100000;
const SANDI = 'sandi-uji-panjang';

const login = async (email, kata_sandi) =>
  (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, kata_sandi }) }))
    .headers.get('set-cookie').split(';')[0];
const req = async (method, url, body, cookie = admin) => {
  const r = await fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', cookie }, body: body && JSON.stringify(body) });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};

test.before(async () => {
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  admin = await login(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  periode = await prisma.periode.findFirst({ where: { status: 'TERBUKA' } });
  unitA = await prisma.unit.create({ data: { kode: `SA${sufiks}`, nama: 'Cabang SA', jenis: 'CABANG' } });
  unitB = await prisma.unit.create({ data: { kode: `SB${sufiks}`, nama: 'Cabang SB', jenis: 'CABANG' } });
  const akun = [
    ['petugas', 'PETUGAS_RISIKO_CABANG', unitA.id],
    ['pimpinan', 'PIMPINAN_CABANG', unitA.id],
    ['pimpinanB', 'PIMPINAN_CABANG', unitB.id],
    ['pengelola', 'PENGELOLA_RISIKO', null],
  ];
  for (const [nama, peran, unit_id] of akun) {
    const email = `${nama}-${sufiks}@erm.local`;
    ids[nama] = (await req('POST', '/pengguna', { nama, email, kata_sandi: SANDI, peran: [peran], unit_id })).body.id;
    ck[nama] = await login(email, SANDI);
  }
});

test.after(async () => {
  const semua = Object.values(ids);
  await prisma.risiko.deleteMany({ where: { unit_id: { in: [unitA.id, unitB.id] } } });
  await prisma.riwayat_persetujuan.deleteMany({ where: { pengguna_id: { in: semua } } });
  await prisma.jejak_audit.deleteMany({ where: { pengguna_id: { in: semua } } });
  await prisma.pengguna.deleteMany({ where: { id: { in: semua } } });
  await prisma.unit.deleteMany({ where: { id: { in: [unitA.id, unitB.id] } } });
  server.close();
  await prisma.$disconnect();
});

test('alur lengkap risiko: ajukan -> kembalikan -> ajukan -> setujui -> final -> buka', async () => {
  const r = (await req('POST', '/risiko', { periode_id: periode.id, unit_id: unitA.id, kode: `PS-${sufiks}`, nama: 'Risiko persetujuan' }, ck.petugas)).body;
  const aksi = (a, who, catatan) => req('POST', `/persetujuan/risiko/${r.id}/${a}`, catatan ? { catatan } : {}, ck[who]);

  assert.equal((await aksi('setujui', 'pimpinan')).status, 400); // belum diajukan
  assert.equal((await aksi('ajukan', 'pimpinanB')).status, 404); // unit lain: tidak terlihat
  assert.equal((await aksi('ajukan', 'petugas')).status, 200);
  assert.equal((await req('PATCH', `/risiko/${r.id}`, { nama: 'ubah' }, ck.petugas)).status, 403); // terkunci

  // Antrean pimpinan memuat risiko ini; antrean pimpinan unit lain tidak.
  assert.ok((await req('GET', '/persetujuan/antrean', null, ck.pimpinan)).body.risiko.some((x) => x.id === r.id));
  assert.ok(!(await req('GET', '/persetujuan/antrean', null, ck.pimpinanB)).body.risiko.some((x) => x.id === r.id));
  // Notifikasi ke pimpinan.
  assert.ok((await req('GET', '/persetujuan/notifikasi', null, ck.pimpinan)).body.some((n) => n.pesan.includes(`PS-${sufiks}`)));

  assert.equal((await aksi('kembalikan', 'pimpinan')).status, 400); // catatan wajib
  assert.equal((await aksi('kembalikan', 'pimpinan', 'Lengkapi penyebab')).status, 200);
  assert.equal((await req('PATCH', `/risiko/${r.id}`, { nama: 'diperbaiki' }, ck.petugas)).status, 200); // terbuka lagi
  assert.equal((await aksi('ajukan', 'petugas')).status, 200);

  assert.equal((await aksi('setujui', 'petugas')).status, 403); // petugas tidak boleh menyetujui
  assert.equal((await aksi('finalkan', 'pengelola')).status, 400); // belum disetujui pimpinan
  assert.equal((await aksi('setujui', 'pimpinan')).status, 200);
  assert.equal((await aksi('finalkan', 'pimpinan')).status, 403);
  assert.equal((await aksi('finalkan', 'pengelola')).status, 200);

  assert.equal((await aksi('buka', 'pimpinan', 'x')).status, 403);
  assert.equal((await aksi('buka', 'pengelola', 'Revisi kontrol')).status, 200);

  const riwayat = (await req('GET', `/persetujuan/risiko/${r.id}/riwayat`, null, ck.petugas)).body;
  assert.equal(riwayat.length, 6);
  assert.equal(riwayat[0].ke_status, 'DIKEMBALIKAN');
});

test('laporan bulanan hanya bisa diajukan setelah risiko FINAL', async () => {
  const r = (await req('POST', '/risiko', { periode_id: periode.id, unit_id: unitA.id, kode: `PL-${sufiks}`, nama: 'Risiko laporan', mitigasi: [{ uraian: 'm' }] }, ck.petugas)).body;
  const kini = new Date();
  const [t, b] = kini.getMonth() === 0 ? [kini.getFullYear(), 1] : [kini.getFullYear(), kini.getMonth()];
  const lap = (await req('PUT', `/pemantauan/risiko/${r.id}/${t}/${b}`, { mitigasi: [{ mitigasi_id: r.mitigasi[0].id, status: 'BERJALAN', progres: 20 }] }, ck.petugas)).body;
  const aksiLap = (a, who) => req('POST', `/persetujuan/pemantauan/${lap.id}/${a}`, {}, ck[who]);

  assert.equal((await aksiLap('ajukan', 'petugas')).status, 400);
  for (const [a, who] of [['ajukan', 'petugas'], ['setujui', 'pimpinan'], ['finalkan', 'pengelola']])
    assert.equal((await req('POST', `/persetujuan/risiko/${r.id}/${a}`, {}, ck[who])).status, 200);

  assert.equal((await aksiLap('ajukan', 'petugas')).status, 200);
  const ringkas = (await req('GET', `/pemantauan/ringkasan?periode_id=${periode.id}&tahun=${t}&bulan=${b}`, null, ck.petugas)).body;
  assert.ok(ringkas.risiko.find((x) => x.id === r.id).laporan.diajukan_pada);
  assert.equal((await req('PUT', `/pemantauan/risiko/${r.id}/${t}/${b}`, {}, ck.petugas)).status, 403);

  // Proses massal oleh pimpinan.
  const massal = (await req('POST', '/persetujuan/massal', { entitas: 'pemantauan', aksi: 'setujui', ids: [lap.id, 999999] }, ck.pimpinan)).body;
  assert.deepEqual(massal.map((h) => h.ok), [true, false]);
});
