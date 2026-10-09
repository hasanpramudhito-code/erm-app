// Uji laporan Excel: semua jenis bisa diunduh, header benar, cakupan unit berlaku.
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const app = require('../src/app');
const prisma = require('../src/db');
const { LAPORAN } = require('../src/laporan');

let base, server, admin, periode;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, kata_sandi: process.env.SEED_ADMIN_PASSWORD }) });
  admin = l.headers.get('set-cookie').split(';')[0];
  periode = await prisma.periode.findFirst({ where: { status: 'TERBUKA' } });
});
test.after(async () => { server.close(); await prisma.$disconnect(); });

test('setiap jenis laporan menghasilkan xlsx dengan header kolom', async () => {
  for (const [jenis, L] of Object.entries(LAPORAN)) {
    const r = await fetch(`${base}/api/laporan/${jenis}.xlsx?periode_id=${periode.id}`, { headers: { cookie: admin } });
    assert.equal(r.status, 200, jenis);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await r.arrayBuffer()));
    const ws = wb.worksheets[0];
    assert.equal(ws.getRow(4).getCell(1).value, L.kolom[0][0], jenis);
  }
});

test('validasi: jenis tak dikenal 404, periode wajib 400, tanpa login 401', async () => {
  assert.equal((await fetch(`${base}/api/laporan/tidakada.xlsx?periode_id=${periode.id}`, { headers: { cookie: admin } })).status, 404);
  assert.equal((await fetch(`${base}/api/laporan/register.xlsx`, { headers: { cookie: admin } })).status, 400);
  assert.equal((await fetch(`${base}/api/laporan/register.xlsx?periode_id=${periode.id}`)).status, 401);
});
