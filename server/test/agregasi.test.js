// Uji rumus agregasi handoff 6.1/6.2 (fungsi murni) + endpoint dengan data FINAL nyata.
const test = require('node:test');
const assert = require('node:assert');
const { agregasi, modus } = require('../src/agregasi');

const LEVEL = [
  { id: 1, nama: 'Rendah', warna: '#0f0', skor_min: 1, skor_maks: 5, urutan: 0 },
  { id: 2, nama: 'Sedang', warna: '#ff0', skor_min: 6, skor_maks: 11, urutan: 1 },
  { id: 3, nama: 'Tinggi', warna: '#f80', skor_min: 12, skor_maks: 19, urutan: 2 },
  { id: 4, nama: 'Ekstrim', warna: '#f00', skor_min: 20, skor_maks: 25, urutan: 3 },
];
const ctx = { metode: 'multiplication', level: LEVEL };
const e = (unit, kemungkinan, dampak) => ({ unit, kemungkinan, dampak });

test('modus satu dimensi: seri -> nilai tertinggi', () => {
  assert.equal(modus([2, 2, 3, 3, 1]), 3);
  assert.equal(modus([4]), 4);
  assert.equal(modus([]), null);
});

test('kosong -> null; satu unit -> sama dengan unit itu', () => {
  assert.equal(agregasi([], ctx), null);
  const h = agregasi([e('A', 3, 4)], ctx);
  assert.deepEqual([h.nilai_utama.kemungkinan, h.nilai_utama.dampak, h.nilai_utama.skor], [3, 4, 12]);
  assert.equal(h.nilai_utama.level, 'Tinggi');
});

test('nilai utama = sel paling sering', () => {
  const h = agregasi([e('A', 2, 2), e('B', 2, 2), e('C', 5, 5)], ctx);
  assert.deepEqual([h.nilai_utama.kemungkinan, h.nilai_utama.dampak, h.nilai_utama.frekuensi], [2, 2, 2]);
  assert.deepEqual(h.tertinggi, { skor: 25, unit: ['C'] });
  // C (Ekstrim, urutan 3) jauh di atas modus (Rendah, urutan 0) -> ditandai.
  assert.deepEqual(h.penanda.map((p) => p.unit), ['C']);
});

test('penanda: cukup satu level di atas nilai utama; level sama tidak ditandai', () => {
  // Nilai utama (2,2)=4 Rendah. D (2,3)=6 Sedang -> ditandai; E (1,5)=5 Rendah -> tidak.
  const h = agregasi([e('A', 2, 2), e('B', 2, 2), e('D', 2, 3), e('E', 1, 5)], ctx);
  assert.deepEqual(h.penanda.map((p) => p.unit), ['D']);
});

test('seri frekuensi -> skor terbesar; masih seri -> dampak terbesar', () => {
  // (2,3)=6 vs (3,2)=6 vs (1,4)=4: skor seri 6 -> dampak terbesar (2,3).
  const h = agregasi([e('A', 2, 3), e('B', 3, 2), e('C', 1, 4)], ctx);
  assert.deepEqual([h.nilai_utama.kemungkinan, h.nilai_utama.dampak], [2, 3]);
  // Pendamping (opsi A): modus K dari [2,3,1] seri -> 3; modus D dari [3,2,4] seri -> 4.
  assert.equal(h.modus_kemungkinan, 3);
  assert.equal(h.modus_dampak, 4);
});

test('sebaran per level', () => {
  const h = agregasi([e('A', 1, 1), e('B', 2, 3), e('C', 4, 4)], ctx);
  assert.deepEqual(h.sebaran.map((s) => s.jumlah), [1, 1, 1, 0]);
});

test('metode koordinat dipakai untuk skor & tie-break', () => {
  // Matriks koordinat: (1,5)=20, (5,1)=9.
  const h = agregasi([e('A', 1, 5), e('B', 5, 1)], { ...ctx, metode: 'coordinate' });
  assert.deepEqual([h.nilai_utama.kemungkinan, h.nilai_utama.dampak, h.nilai_utama.skor], [1, 5, 20]);
});

test('endpoint: hanya FINAL dihitung, kelengkapan X dari Y cabang', async () => {
  const app = require('../src/app');
  const prisma = require('../src/db');
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const sufiks = Date.now() % 100000;
  const unit = [];
  let ru, periode;
  try {
    const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, kata_sandi: process.env.SEED_ADMIN_PASSWORD }) });
    const cookie = l.headers.get('set-cookie').split(';')[0];
    const req = async (m, u, b) => (await fetch(`${base}/api${u}`, { method: m, headers: { 'content-type': 'application/json', cookie }, body: b && JSON.stringify(b) })).json();
    // Periode khusus tes agar tidak bergantung/tidak menulis ke periode berjalan.
    periode = await prisma.periode.create({ data: { nama: `AG ${sufiks}`, tanggal_mulai: new Date('2098-01-01'), tanggal_selesai: new Date('2098-12-31'), status: 'TERBUKA' } });
    for (const i of [1, 2, 3]) unit.push(await req('POST', '/unit', { kode: `AG${i}${sufiks}`, nama: `Cabang AG${i}`, jenis: 'CABANG' }));
    ru = await req('POST', '/risiko-utama', { kode: `AG${sufiks}`, nama: 'Agregasi uji', berlaku_untuk: 'CABANG', periode_id: periode.id });
    const entri = await prisma.risiko.findMany({ where: { risiko_utama_id: ru.id }, orderBy: { unit_id: 'asc' } });
    // Dua cabang FINAL dengan (3,3), satu DRAF dengan (5,5) -> tidak dihitung.
    for (const [i, r] of entri.filter((x) => unit.some((u) => u.id === x.unit_id)).entries()) {
      await req('PATCH', `/risiko/${r.id}`, { inheren: i < 2 ? { kemungkinan: 3, dampak: 3 } : { kemungkinan: 5, dampak: 5 } });
      if (i < 2) await prisma.risiko.update({ where: { id: r.id }, data: { status_persetujuan: 'FINAL' } });
    }
    const h = (await req('GET', `/agregasi?periode_id=${periode.id}&jenis=INHEREN`)).risiko_utama.find((x) => x.id === ru.id);
    assert.equal(h.jumlah_final, 2);
    assert.equal(h.jumlah_seharusnya, await prisma.unit.count({ where: { jenis: 'CABANG', aktif: true } }));
    assert.deepEqual([h.hasil.nilai_utama.kemungkinan, h.hasil.nilai_utama.dampak], [3, 3]);
    assert.equal(h.hasil.tertinggi.unit.length, 2);
  } finally {
    if (ru?.id) {
      await prisma.risiko.deleteMany({ where: { risiko_utama_id: ru.id } });
      await prisma.risiko_utama.delete({ where: { id: ru.id } });
    }
    await prisma.unit.deleteMany({ where: { id: { in: unit.map((u) => u.id).filter(Boolean) } } });
    if (periode) await prisma.periode.delete({ where: { id: periode.id } });
    server.close();
    await prisma.$disconnect();
  }
});
