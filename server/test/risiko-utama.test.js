// Uji risiko utama, pustaka, daftar per periode, entri cabang otomatis, dan impor/ekspor Excel.
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, periode, periodeBaru;
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
  periodeBaru = (await req('POST', '/periode', { nama: `Uji ${sufiks}`, tanggal_mulai: '2099-01-01', tanggal_selesai: '2099-12-31', status: 'PERSIAPAN' })).body;
});

test.after(async () => {
  const ruUji = (await prisma.risiko_utama.findMany({ where: { kode: { contains: String(sufiks) } }, select: { id: true } })).map((r) => r.id);
  const semuaRu = [...new Set([...dibuat.ru, ...ruUji])];
  await prisma.risiko.deleteMany({ where: { OR: [{ unit_kerja_id: { in: dibuat.unit } }, { risiko_utama_id: { in: semuaRu } }] } });
  await prisma.pustaka_penyebab.deleteMany({ where: { risiko_utama_id: { in: semuaRu } } });
  await prisma.pustaka_dampak.deleteMany({ where: { risiko_utama_id: { in: semuaRu } } });
  await prisma.risiko_utama.deleteMany({ where: { id: { in: semuaRu } } });
  await prisma.unit_kerja.deleteMany({ where: { id: { in: dibuat.unit } } });
  await prisma.periode.delete({ where: { id: periodeBaru.id } });
  server.close();
  await prisma.$disconnect();
});

test('risiko utama masuk daftar periode -> entri draf tiap cabang; cabang baru ikut; idempoten', async () => {
  const c1 = (await req('POST', '/unit-kerja', { kode: `C1${sufiks}`, nama: 'Cabang Satu', jenis: 'CABANG' })).body;
  dibuat.unit.push(c1.id);
  const ru = await req('POST', '/risiko-utama', {
    kode: `RU${sufiks}`, nama: 'Kehilangan air (NRW) tinggi', berlaku_untuk: 'CABANG', periode_id: periode.id,
    penyebab: [{ uraian: 'Pipa tua' }, { uraian: 'Sambungan ilegal' }], dampak: [{ uraian: 'Pendapatan turun' }],
  });
  assert.equal(ru.status, 201, JSON.stringify(ru.body));
  dibuat.ru.push(ru.body.id);
  assert.ok(ru.body.entri_dibuat >= 1);
  assert.ok(await prisma.risiko.findFirst({ where: { unit_kerja_id: c1.id, risiko_utama_id: ru.body.id, periode_id: periode.id, status_persetujuan: 'DRAF' } }));

  const c2 = (await req('POST', '/unit-kerja', { kode: `C2${sufiks}`, nama: 'Cabang Dua', jenis: 'CABANG' })).body;
  dibuat.unit.push(c2.id);
  assert.ok(await prisma.risiko.findFirst({ where: { unit_kerja_id: c2.id, risiko_utama_id: ru.body.id } }));

  await req('POST', '/risiko-utama/bentuk-entri', {});
  assert.equal(await prisma.risiko.count({ where: { unit_kerja_id: c1.id, risiko_utama_id: ru.body.id } }), 1);
  assert.equal((await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: c1.id, risiko_utama_id: ru.body.id, kode: `DBL${sufiks}`, nama: 'dobel' })).status, 409);
});

test('risiko utama tanpa periode tidak membentuk entri; tidak bisa dipakai di periode yang tidak memuatnya', async () => {
  const ru = (await req('POST', '/risiko-utama', { kode: `NP${sufiks}`, nama: 'Tanpa periode', berlaku_untuk: 'CABANG' })).body;
  dibuat.ru.push(ru.id);
  assert.equal(ru.entri_dibuat, 0);
  assert.equal(await prisma.risiko.count({ where: { risiko_utama_id: ru.id } }), 0);
  assert.equal((await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: dibuat.unit[0], risiko_utama_id: ru.id, kode: `NP-${sufiks}`, nama: 'x' })).status, 400);
});

test('periode baru: salin daftar (PERSIAPAN tanpa entri), ubah daftar, buka -> entri terbentuk', async () => {
  const salin = await req('POST', `/risiko-utama/periode/${periodeBaru.id}/salin`, { dari_periode_id: periode.id });
  assert.equal(salin.status, 200);
  assert.ok(salin.body.ditambahkan >= 1);
  assert.equal(salin.body.entri_dibuat, 0);
  assert.equal(await prisma.risiko.count({ where: { periode_id: periodeBaru.id } }), 0);

  // Ganti daftar: buang RU lama, pakai RU tanpa periode. Periode berjalan tidak tersentuh.
  const atur = await req('PUT', `/risiko-utama/periode/${periodeBaru.id}`, { risiko_utama_ids: [dibuat.ru[1]] });
  assert.equal(atur.status, 200);
  const daftarBaru = (await req('GET', `/risiko-utama?periode_id=${periodeBaru.id}`)).body.map((r) => r.id);
  assert.deepEqual(daftarBaru, [dibuat.ru[1]]);
  assert.ok((await req('GET', `/risiko-utama?periode_id=${periode.id}`)).body.some((r) => r.id === dibuat.ru[0]));

  await req('PATCH', `/periode/${periodeBaru.id}`, { status: 'TERBUKA' });
  assert.ok(await prisma.risiko.count({ where: { periode_id: periodeBaru.id, risiko_utama_id: dibuat.ru[1] } }) >= 2);
  assert.equal(await prisma.risiko.count({ where: { periode_id: periodeBaru.id, risiko_utama_id: dibuat.ru[0] } }), 0);
});

test('pustaka: pilih dari pustaka & tolak pustaka risiko utama lain; item terpakai dinonaktifkan', async () => {
  const ru = await prisma.risiko_utama.findUnique({ where: { id: dibuat.ru[0] }, include: { pustaka_penyebab: true } });
  const entri = await prisma.risiko.findFirst({ where: { risiko_utama_id: ru.id, unit_kerja_id: dibuat.unit[0] } });
  const pp = ru.pustaka_penyebab[0];
  const ok = await req('PATCH', `/risiko/${entri.id}`, { penyebab: [{ uraian: pp.uraian, pustaka_penyebab_id: pp.id }, { uraian: 'Khas cabang' }] });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const lain = (await req('POST', '/risiko-utama', { kode: `RL${sufiks}`, nama: 'Lain', berlaku_untuk: 'PUSAT', penyebab: [{ uraian: 'x' }] })).body;
  dibuat.ru.push(lain.id);
  assert.equal((await req('PATCH', `/risiko/${entri.id}`, { penyebab: [{ uraian: 'x', pustaka_penyebab_id: lain.pustaka_penyebab[0].id }] })).status, 400);
  await req('PATCH', `/risiko-utama/${ru.id}`, { penyebab: ru.pustaka_penyebab.slice(1).map(({ id, uraian }) => ({ id, uraian })) });
  assert.equal((await prisma.pustaka_penyebab.findUnique({ where: { id: pp.id } })).aktif, false);
  assert.equal((await req('DELETE', `/risiko-utama/${ru.id}`)).status, 409);
});

test('Excel: ekspor, simulasi impor, impor upsert + pustaka sinkron, tolak baris salah', async () => {
  const eks = await fetch(`${base}/api/risiko-utama/excel/ekspor?periode_id=${periode.id}`, { headers: { cookie: admin } });
  assert.equal(eks.status, 200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await eks.arrayBuffer()));
  const ws = wb.getWorksheet('Risiko Utama');
  assert.equal(ws.getRow(1).getCell(1).value, 'Kode');

  // Ubah: nama RU lama + tambah penyebab; tambah RU baru.
  const barisRu = [...Array(ws.rowCount).keys()].map((i) => ws.getRow(i + 1)).find((r) => r.getCell(1).value === `RU${sufiks}`);
  barisRu.getCell(2).value = 'NRW tinggi (diubah)';
  barisRu.getCell(7).value = `${barisRu.getCell(7).value}\nMeter rusak`;
  ws.addRow([`IX${sufiks}`, 'Kualitas air tidak memenuhi baku mutu', '', 'CABANG', 'OPR', '', 'Sumber air tercemar\nKlorinasi kurang', 'Keluhan pelanggan', 'Y']);
  const kirim = async (buku, sim) => {
    const fd = new FormData();
    fd.append('file', new Blob([await buku.xlsx.writeBuffer()]), 'ru.xlsx');
    fd.append('periode_id', String(periode.id));
    const r = await fetch(`${base}/api/risiko-utama/excel/impor${sim ? '?simulasi=1' : ''}`, { method: 'POST', headers: { cookie: admin }, body: fd });
    return { status: r.status, body: await r.json() };
  };
  const sim = await kirim(wb, true);
  assert.equal(sim.status, 200, JSON.stringify(sim.body));
  assert.equal(sim.body.baru, 1);
  assert.equal(await prisma.risiko_utama.count({ where: { kode: `IX${sufiks}` } }), 0);

  const imp = await kirim(wb, false);
  assert.equal(imp.status, 200, JSON.stringify(imp.body));
  assert.ok(imp.body.entri_dibuat >= 2);
  const ru = await prisma.risiko_utama.findUnique({ where: { kode: `RU${sufiks}` }, include: { pustaka_penyebab: { where: { aktif: true } } } });
  assert.equal(ru.nama, 'NRW tinggi (diubah)');
  assert.ok(ru.pustaka_penyebab.some((p) => p.uraian === 'Meter rusak'));
  const ix = await prisma.risiko_utama.findUnique({ where: { kode: `IX${sufiks}` }, include: { pustaka_penyebab: true } });
  assert.equal(ix.pustaka_penyebab.length, 2);

  // Baris salah ditolak seluruhnya, tidak ada yang tersimpan.
  ws.addRow([`BAD${sufiks}`, 'Salah', '', 'LAIN', 'TIDAKADA', '', '', '', 'Y']);
  const salah = await kirim(wb, false);
  assert.equal(salah.status, 400);
  assert.equal(salah.body.kesalahan.length, 1);
  assert.equal(await prisma.risiko_utama.count({ where: { kode: `BAD${sufiks}` } }), 0);
});
