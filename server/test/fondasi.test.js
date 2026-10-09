// Uji fondasi terhadap DB lokal: node --test (butuh DB sudah migrate + seed, .env berisi SEED_ADMIN_*).
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server;
test.before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(async () => { server.close(); await prisma.$disconnect(); });

const login = (email, kata_sandi) =>
  fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, kata_sandi }) });

test('tanpa login ditolak', async () => {
  assert.equal((await fetch(`${base}/api/auth/saya`)).status, 401);
  assert.equal((await fetch(`${base}/api/lampiran/mitigasi/1`)).status, 401);
});

test('kata sandi salah ditolak', async () => {
  assert.equal((await login(process.env.SEED_ADMIN_EMAIL, 'salah-sekali')).status, 401);
});

test('login, akses, unggah, unduh, hapus, logout', async () => {
  const r = await login(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  assert.match(r.headers.get('set-cookie'), /HttpOnly/i);
  const h = { cookie };

  const saya = await (await fetch(`${base}/api/auth/saya`, { headers: h })).json();
  assert.ok(saya.peran.includes('ADMIN'));

  const fd = new FormData();
  fd.append('file', new Blob(['halo']), 'bukti.txt');
  const up = await fetch(`${base}/api/lampiran/mitigasi/999`, { method: 'POST', headers: h, body: fd });
  assert.equal(up.status, 201);
  const l = await up.json();

  const dl = await fetch(`${base}/api/lampiran/unduh/${l.id}`, { headers: h });
  assert.equal(await dl.text(), 'halo');

  const exe = new FormData();
  exe.append('file', new Blob(['x']), 'jahat.exe');
  assert.equal((await fetch(`${base}/api/lampiran/mitigasi/999`, { method: 'POST', headers: h, body: exe })).status, 400);

  assert.equal((await fetch(`${base}/api/lampiran/${l.id}`, { method: 'DELETE', headers: h })).status, 204);
  assert.ok(await prisma.jejak_audit.findFirst({ where: { nama_tabel: 'lampiran', id_data: String(l.id), aksi: 'HAPUS' } }));

  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: h });
  assert.equal((await fetch(`${base}/api/auth/saya`, { headers: h })).status, 401);
});

test('kelola pengguna: buat, login, ubah peran memutus sesi, non-admin ditolak', async () => {
  const admin = (await login(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD)).headers.get('set-cookie').split(';')[0];
  const json = (method, url, body, cookie) =>
    fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', cookie }, body: body && JSON.stringify(body) });

  const email = `uji-${Date.now()}@erm.local`;
  assert.equal((await json('POST', '/pengguna', { nama: 'Uji', email, kata_sandi: 'pendek', peran: ['PETUGAS'] }, admin)).status, 400);
  assert.equal((await json('POST', '/pengguna', { nama: 'Uji', email, kata_sandi: 'sandi-uji-panjang', peran: ['TIDAK_ADA'] }, admin)).status, 400);
  const r = await json('POST', '/pengguna', { nama: 'Uji', email, kata_sandi: 'sandi-uji-panjang', peran: ['PETUGAS'] }, admin);
  assert.equal(r.status, 201);
  const baru = await r.json();
  assert.deepEqual(baru.peran, ['PETUGAS']);
  assert.equal(baru.kata_sandi_hash, undefined);

  const petugas = (await login(email, 'sandi-uji-panjang')).headers.get('set-cookie').split(';')[0];
  assert.equal((await json('GET', '/pengguna', null, petugas)).status, 403);
  assert.equal((await json('POST', '/pengguna', { nama: 'x', email: 'x@x.id', kata_sandi: 'xxxxxxxxxxxx', peran: ['ADMIN'] }, petugas)).status, 403);
  assert.equal((await json('GET', '/pengguna/ringkas', null, petugas)).status, 200);

  assert.equal((await json('PATCH', `/pengguna/${baru.id}`, { peran: ['PIMPINAN'] }, admin)).status, 200);
  assert.equal((await json('GET', '/auth/saya', null, petugas)).status, 401);

  assert.equal((await json('PATCH', `/pengguna/${baru.id}`, { aktif: false }, admin)).status, 200);
  assert.equal((await login(email, 'sandi-uji-panjang')).status, 401);

  const saya = await (await json('GET', '/auth/saya', null, admin)).json();
  assert.equal((await json('PATCH', `/pengguna/${saya.id}`, { aktif: false }, admin)).status, 400);

  await prisma.pengguna.delete({ where: { id: baru.id } });
});
