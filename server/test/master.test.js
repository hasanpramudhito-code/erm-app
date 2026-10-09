// Uji API data master & pengaturan terhadap DB lokal.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, kata_sandi: process.env.SEED_ADMIN_PASSWORD }) });
  admin = r.headers.get('set-cookie').split(';')[0];
});
test.after(async () => { server.close(); await prisma.$disconnect(); });

const req = async (method, url, body, cookie = admin) => {
  const r = await fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', cookie }, body: body && JSON.stringify(body) });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};

test('konfigurasi penilaian berisi data seed', async () => {
  const { status, body } = await req('GET', '/konfigurasi-penilaian');
  assert.equal(status, 200);
  assert.equal(body.kemungkinan.length, 5);
  assert.equal(body.dampak.length, 25);
  assert.ok(body.level.length >= 1); // level boleh diubah pengguna; jumlahnya tidak tetap
});

test('unit kerja: buat, cegah siklus induk, kode duplikat 409, hapus', async () => {
  const kode = `T${Date.now() % 100000}`;
  const a = await req('POST', '/unit-kerja', { kode, nama: 'Bagian Uji', jenis: 'BAGIAN' });
  assert.equal(a.status, 201);
  const b = await req('POST', '/unit-kerja', { kode: kode + 'S', nama: 'Sub Uji', jenis: 'SUB_BAGIAN', induk_id: a.body.id });
  assert.equal(b.status, 201);
  assert.equal((await req('PATCH', `/unit-kerja/${a.body.id}`, { induk_id: b.body.id })).status, 400);
  assert.equal((await req('POST', '/unit-kerja', { kode, nama: 'Dobel', jenis: 'BAGIAN' })).status, 409);
  assert.equal((await req('POST', '/unit-kerja', { kode: kode + 'X', nama: 'Salah', jenis: 'LAIN' })).status, 400);
  assert.equal((await req('DELETE', `/unit-kerja/${a.body.id}`)).status, 409); // masih punya sub-unit
  assert.equal((await req('DELETE', `/unit-kerja/${b.body.id}`)).status, 204);
  assert.equal((await req('DELETE', `/unit-kerja/${a.body.id}`)).status, 204);
});

test('level risiko: tolak rentang tumpang tindih & warna salah', async () => {
  assert.equal((await req('POST', '/level-risiko', { nama: 'Uji', skor_min: 5, skor_maks: 8, warna: '#000000' })).status, 400);
  assert.equal((await req('POST', '/level-risiko', { nama: 'Uji', skor_min: 90, skor_maks: 95, warna: 'merah' })).status, 400);
});

test('pengaturan: validasi & hak akses', async () => {
  assert.equal((await req('PUT', '/pengaturan/metode_penilaian', { nilai: 'acak' })).status, 400);
  assert.equal((await req('PUT', '/pengaturan/tidak_ada', { nilai: 1 })).status, 400);
  const lama = (await req('GET', '/pengaturan')).body.ambang_toleransi;
  assert.equal((await req('PUT', '/pengaturan/ambang_toleransi', { nilai: 14 })).status, 200);
  assert.equal((await req('PUT', '/pengaturan/ambang_toleransi', { nilai: lama })).status, 200);
});

test('non-admin tidak boleh menulis data master', async () => {
  const email = `petugas-${Date.now()}@erm.local`;
  const p = await req('POST', '/pengguna', { nama: 'Petugas', email, kata_sandi: 'sandi-uji-panjang', peran: ['PETUGAS'] });
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, kata_sandi: 'sandi-uji-panjang' }) });
  const ck = r.headers.get('set-cookie').split(';')[0];
  assert.equal((await req('GET', '/unit-kerja', null, ck)).status, 200);
  assert.equal((await req('POST', '/unit-kerja', { kode: 'X1', nama: 'x', jenis: 'BAGIAN' }, ck)).status, 403);
  assert.equal((await req('POST', '/level-risiko', { nama: 'x', skor_min: 90, skor_maks: 91, warna: '#000000' }, ck)).status, 403);
  assert.equal((await req('PUT', '/pengaturan/metode_penilaian', { nilai: 'coordinate' }, ck)).status, 403);
  const peng = (await req('GET', '/pengaturan', null, ck)).body;
  assert.equal(peng.umum, undefined); // kunci non-publik tersembunyi
  await prisma.pengguna.delete({ where: { id: p.body.id } });
});
