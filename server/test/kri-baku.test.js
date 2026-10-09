// Uji KRI baku: definisi di risiko utama tersalin terkunci ke entri cabang, dan agregasi pusat dari angka nyata.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, periode, ru, cabang = [];
const sufiks = Date.now() % 100000;
const req = async (method, url, body) => {
  const r = await fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', cookie: admin }, body: body && JSON.stringify(body) });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};
const kini = new Date();
const T = kini.getFullYear(), B = kini.getMonth() === 0 ? 1 : kini.getMonth();
const NRW = { nama: 'NRW', satuan: '%', rumus: 'RASIO', label_pembilang: 'Air hilang', label_penyebut: 'Air didistribusikan', ambang_hijau: 20, ambang_kuning: 25, ambang_merah: 30 };

test.before(async () => {
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, kata_sandi: process.env.SEED_ADMIN_PASSWORD }) });
  admin = l.headers.get('set-cookie').split(';')[0];
  periode = await prisma.periode.findFirst({ where: { status: 'TERBUKA', nama: String(T) } });
  for (const i of [1, 2, 3]) cabang.push(await prisma.unit_kerja.create({ data: { kode: `KB${i}${sufiks}`, nama: `Cabang KB${i}`, jenis: i === 3 ? 'UNIT' : 'CABANG' } }));
});

test.after(async () => {
  // Hapus juga entri risiko utama uji di unit kerja lain (entri otomatis untuk semua cabang).
  await prisma.risiko.deleteMany({ where: { OR: [{ unit_kerja_id: { in: cabang.map((c) => c.id) } }, ...(ru ? [{ risiko_utama_id: ru.id }] : [])] } });
  if (ru) await prisma.risiko_utama.delete({ where: { id: ru.id } }).catch(() => {});
  await prisma.unit_kerja.deleteMany({ where: { id: { in: cabang.map((c) => c.id) } } });
  server.close();
  await prisma.$disconnect();
});

test('KRI baku tersalin ke entri cabang & unit, terkunci, dan diagregasi dari angka nyata', async () => {
  const r = await req('POST', '/risiko-utama', { kode: `KB${sufiks}`, nama: 'Kehilangan air', berlaku_untuk: 'CABANG', periode_id: periode.id, kri: [NRW] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  ru = r.body;
  assert.equal(ru.kri_baku.length, 1);

  const entri = await prisma.risiko.findMany({ where: { risiko_utama_id: ru.id, unit_kerja_id: { in: cabang.map((c) => c.id) } }, include: { kri: true }, orderBy: { unit_kerja_id: 'asc' } });
  assert.equal(entri.length, 3); // dua cabang + satu unit
  assert.ok(entri.every((e) => e.kri.length === 1 && e.kri[0].kri_baku_id === ru.kri_baku[0].id));

  // Terkunci: ubah nama & hapus dari register diabaikan.
  const kriLama = entri[0].kri[0];
  const u = await req('PATCH', `/risiko/${entri[0].id}`, { kri: [{ ...NRW, id: kriLama.id, nama: 'Diubah cabang' }] });
  assert.equal(u.status, 200, JSON.stringify(u.body));
  assert.equal(u.body.kri.find((k) => k.id === kriLama.id).nama, 'NRW');
  assert.equal((await req('PATCH', `/risiko/${entri[0].id}`, { kri: [] })).body.kri.length, 1);

  // Ubah batas di risiko utama -> tersinkron ke semua entri.
  await req('PATCH', `/risiko-utama/${ru.id}`, { kri: [{ ...NRW, id: ru.kri_baku[0].id, ambang_merah: 35 }] });
  assert.equal(Number((await prisma.kri.findUnique({ where: { id: kriLama.id } })).ambang_merah), 35);

  // Isi pemantauan: cabang 1 & unit 3 final, cabang 2 masih draf (tidak dihitung).
  const angka = [[10000, 100000], [30000, 100000], [2000, 10000]];
  for (const [i, e] of entri.entries()) {
    const k = e.kri[0];
    const l = await req('PUT', `/pemantauan/risiko/${e.id}/${T}/${B}`, { kri: [{ kri_id: k.id, pembilang: angka[i][0], penyebut: angka[i][1] }] });
    assert.equal(l.status, 200, JSON.stringify(l.body));
    if (i !== 1) await prisma.pemantauan_bulanan.update({ where: { id: l.body.id }, data: { status_persetujuan: 'FINAL' } });
  }

  const a = await req('GET', `/agregasi/kri?periode_id=${periode.id}&tahun=${T}&bulan=${B}`);
  assert.equal(a.status, 200);
  const g = a.body.find((x) => x.id === ru.kri_baku[0].id);
  // (10.000 + 2.000) / (100.000 + 10.000) x 100 = 10,91%
  assert.deepEqual([g.gabungan.pembilang, g.gabungan.penyebut, g.gabungan.nilai, g.gabungan.status], [12000, 110000, 10.91, 'HIJAU']);
  // Cabang lain di DB juga mendapat KRI ini; yang dihitung hanya yang final.
  assert.ok(g.jumlah_unit >= 3);
  assert.deepEqual([g.jumlah_final, g.sebaran.HIJAU], [2, 2]);
  assert.equal(g.unit.find((x) => x.unit_kerja === 'Cabang KB2').status_laporan, 'DRAF');
});

test('ringkasan eksekutif: peringkat risiko utama (agregasi final) & 10 teratas hanya risiko spesifik', async () => {
  const entri = await prisma.risiko.findMany({ where: { risiko_utama_id: ru.id, unit_kerja_id: { in: cabang.map((c) => c.id) } } });
  // Dua entri final: residual (4,5) & (4,5) -> nilai utama 4x5.
  for (const e of entri.slice(0, 2)) {
    await req('PATCH', `/risiko/${e.id}`, { inheren: { kemungkinan: 5, dampak: 5 }, residual: { kemungkinan: 4, dampak: 5 } });
    await prisma.risiko.update({ where: { id: e.id }, data: { status_persetujuan: 'FINAL' } });
  }
  const spesifik = await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: cabang[0].id, kode: `SP-${sufiks}`, nama: 'Risiko spesifik', inheren: { kemungkinan: 5, dampak: 5 }, residual: { kemungkinan: 5, dampak: 5 } });
  assert.equal(spesifik.status, 201, JSON.stringify(spesifik.body));
  const d = (await req('GET', `/ringkasan/eksekutif?periode_id=${periode.id}`)).body;
  const r = d.risiko_utama.find((x) => x.id === ru.id);
  assert.equal(r.jumlah_final, 2);
  assert.ok(r.residual.skor > 0 && r.inheren.skor >= r.residual.skor);
  // Urut menurun skor residual (yang belum punya data di bawah).
  const skor = d.risiko_utama.map((x) => x.residual?.skor ?? x.inheren?.skor ?? -1);
  assert.deepEqual(skor, [...skor].sort((a, b) => b - a));
  assert.ok(d.teratas.some((t) => t.kode === `SP-${sufiks}`));
  assert.ok(d.teratas.every((t) => !entri.some((e) => e.id === t.id))); // entri risiko utama tidak masuk 10 teratas
});
