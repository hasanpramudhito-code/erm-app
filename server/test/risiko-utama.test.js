// Uji risiko utama, pustaka, dan pembentukan entri otomatis cabang.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, periode;
const sufiks = Date.now() % 100000;
const dibuat = { unit: [], ru: [] };
const req = async (method, url, body) => {
  const r = await fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', cookie: admin }, body: body && JSON.stringify(body) });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};

test.before(async () => {
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, kata_sandi: process.env.SEED_ADMIN_PASSWORD }) });
  admin = l.headers.get('set-cookie').split(';')[0];
  periode = await prisma.periode.findFirst({ where: { status: 'TERBUKA' } });
});

test.after(async () => {
  await prisma.risiko.deleteMany({ where: { OR: [{ unit_id: { in: dibuat.unit } }, { risiko_utama_id: { in: dibuat.ru } }] } });
  await prisma.pustaka_penyebab.deleteMany({ where: { risiko_utama_id: { in: dibuat.ru } } });
  await prisma.pustaka_dampak.deleteMany({ where: { risiko_utama_id: { in: dibuat.ru } } });
  await prisma.risiko_utama.deleteMany({ where: { id: { in: dibuat.ru } } });
  await prisma.unit.deleteMany({ where: { id: { in: dibuat.unit } } });
  server.close();
  await prisma.$disconnect();
});

test('risiko utama CABANG membentuk entri draf untuk setiap cabang aktif; cabang baru ikut dapat', async () => {
  const c1 = (await req('POST', '/unit', { kode: `C1${sufiks}`, nama: 'Cabang Satu', jenis: 'CABANG' })).body;
  dibuat.unit.push(c1.id);
  const ru = await req('POST', '/risiko-utama', {
    kode: `RU${sufiks}`, nama: 'Kehilangan air (NRW) tinggi', berlaku_untuk: 'CABANG',
    penyebab: [{ uraian: 'Pipa tua' }, { uraian: 'Sambungan ilegal' }], dampak: [{ uraian: 'Pendapatan turun' }],
  });
  assert.equal(ru.status, 201, JSON.stringify(ru.body));
  dibuat.ru.push(ru.body.id);
  assert.equal(ru.body.pustaka_penyebab.length, 2);
  assert.ok(ru.body.entri_dibuat >= 1);
  const e1 = await prisma.risiko.findFirst({ where: { unit_id: c1.id, risiko_utama_id: ru.body.id, periode_id: periode.id } });
  assert.ok(e1 && e1.status_persetujuan === 'DRAF');

  // Cabang baru setelah risiko utama ada -> otomatis dapat entri.
  const c2 = (await req('POST', '/unit', { kode: `C2${sufiks}`, nama: 'Cabang Dua', jenis: 'CABANG' })).body;
  dibuat.unit.push(c2.id);
  assert.ok(await prisma.risiko.findFirst({ where: { unit_id: c2.id, risiko_utama_id: ru.body.id } }));

  // Idempoten: bentuk ulang tidak menggandakan.
  const lagi = await req('POST', '/risiko-utama/bentuk-entri', {});
  const jumlah = await prisma.risiko.count({ where: { unit_id: c1.id, risiko_utama_id: ru.body.id } });
  assert.equal(jumlah, 1);
  assert.equal(lagi.status, 200);

  // Satu unit satu entri per risiko utama per periode (handoff 5.4).
  assert.equal((await req('POST', '/risiko', { periode_id: periode.id, unit_id: c1.id, risiko_utama_id: ru.body.id, kode: `DBL${sufiks}`, nama: 'dobel' })).status, 409);
});

test('pustaka: pilih dari pustaka (teks disalin) & tolak pustaka risiko utama lain', async () => {
  const ru = await prisma.risiko_utama.findUnique({ where: { id: dibuat.ru[0] }, include: { pustaka_penyebab: true } });
  const entri = await prisma.risiko.findFirst({ where: { risiko_utama_id: ru.id, unit_id: dibuat.unit[0] } });
  const pp = ru.pustaka_penyebab[0];
  const ok = await req('PATCH', `/risiko/${entri.id}`, { penyebab: [{ uraian: pp.uraian, pustaka_penyebab_id: pp.id }, { uraian: 'Penyebab khas cabang' }] });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.penyebab[0].pustaka_penyebab_id, pp.id);

  const ruLain = (await req('POST', '/risiko-utama', { kode: `RL${sufiks}`, nama: 'Lain', berlaku_untuk: 'PUSAT', penyebab: [{ uraian: 'x' }] })).body;
  dibuat.ru.push(ruLain.id);
  assert.equal((await req('PATCH', `/risiko/${entri.id}`, { penyebab: [{ uraian: 'x', pustaka_penyebab_id: ruLain.pustaka_penyebab[0].id }] })).status, 400);

  // Hapus item pustaka yang sudah dipakai -> dinonaktifkan, rujukan tetap.
  const r = await req('PATCH', `/risiko-utama/${ru.id}`, { penyebab: ru.pustaka_penyebab.slice(1).map(({ id, uraian }) => ({ id, uraian })) });
  assert.equal(r.body.pustaka_penyebab.length, 1);
  assert.equal((await prisma.pustaka_penyebab.findUnique({ where: { id: pp.id } })).aktif, false);
});

test('risiko utama PUSAT tidak membentuk entri cabang; tidak bisa dipakai unit CABANG; hapus yang terpakai ditolak', async () => {
  const ruPusat = dibuat.ru[1];
  assert.equal(await prisma.risiko.count({ where: { risiko_utama_id: ruPusat } }), 0);
  assert.equal((await req('POST', '/risiko', { periode_id: periode.id, unit_id: dibuat.unit[0], risiko_utama_id: ruPusat, kode: `X${sufiks}`, nama: 'x' })).status, 400);
  assert.equal((await req('DELETE', `/risiko-utama/${dibuat.ru[0]}`)).status, 409);
  assert.equal((await req('PATCH', `/risiko-utama/${dibuat.ru[0]}`, { berlaku_untuk: 'PUSAT' })).status, 400);
});
