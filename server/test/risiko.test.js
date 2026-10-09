// Uji API Risk Register: validasi, skor, cakupan unit, penguncian.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, periode, unitA, unitB, petugasA, petugasId;
const sufiks = Date.now() % 100000;

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
  unitA = await prisma.unit_kerja.create({ data: { kode: `RA${sufiks}`, nama: 'Cabang A', jenis: 'CABANG' } });
  unitB = await prisma.unit_kerja.create({ data: { kode: `RB${sufiks}`, nama: 'Cabang B', jenis: 'CABANG' } });
  const email = `petugas-a-${sufiks}@erm.local`;
  const p = await req('POST', '/pengguna', { nama: 'Petugas A', email, kata_sandi: 'sandi-uji-panjang', peran: ['PETUGAS'], unit_kerja_id: unitA.id });
  petugasId = p.body.id;
  petugasA = await login(email, 'sandi-uji-panjang');
});

test.after(async () => {
  await prisma.risiko.deleteMany({ where: { unit_kerja_id: { in: [unitA.id, unitB.id] } } });
  await prisma.jejak_audit.deleteMany({ where: { pengguna_id: petugasId } });
  await prisma.pengguna.delete({ where: { id: petugasId } });
  await prisma.unit_kerja.deleteMany({ where: { id: { in: [unitA.id, unitB.id] } } });
  server.close();
  await prisma.$disconnect();
});

test('buat risiko lengkap: skor & level dihitung server', async () => {
  const r = await req('POST', '/risiko', {
    periode_id: periode.id, unit_kerja_id: unitA.id, kode: `rx-${sufiks}`, nama: 'Kebocoran pipa distribusi', sumber: 'INTERNAL',
    penyebab: [{ uraian: 'Pipa tua' }, { uraian: '  ' }], dampak: [{ uraian: 'Kehilangan air' }],
    inheren: { kemungkinan: 4, dampak: 5 }, residual: { kemungkinan: 3, dampak: 4 },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.kode, `RX-${sufiks}`);
  assert.equal(r.body.penyebab.length, 1);
  const inheren = r.body.penilaian.find((p) => p.jenis === 'INHEREN');
  assert.ok(inheren.skor > 0 && inheren.level.nama);
  assert.ok(r.body.penilaian.some((p) => p.jenis === 'RESIDUAL'));
  assert.equal(r.body.status_persetujuan, 'DRAF');
});

test('validasi: skala di luar rentang, kode duplikat, periode wajib', async () => {
  const dasar = { periode_id: periode.id, unit_kerja_id: unitA.id, nama: 'x' };
  assert.equal((await req('POST', '/risiko', { ...dasar, kode: `V1-${sufiks}`, inheren: { kemungkinan: 9, dampak: 1 } })).status, 400);
  assert.equal((await req('POST', '/risiko', { ...dasar, kode: `RX-${sufiks}` })).status, 409);
  assert.equal((await req('POST', '/risiko', { unit_kerja_id: unitA.id, kode: 'V2', nama: 'x' })).status, 400);
  assert.equal((await req('GET', '/risiko')).status, 400);
});

test('cakupan unit kerja: petugas hanya lihat & tulis unitnya', async () => {
  await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: unitB.id, kode: `RB-${sufiks}`, nama: 'Risiko B' });
  const daftar = (await req('GET', `/risiko?periode_id=${periode.id}`, null, petugasA)).body;
  assert.ok(daftar.length >= 1 && daftar.every((r) => r.unit_kerja_id === unitA.id));
  assert.equal((await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: unitB.id, kode: `X-${sufiks}`, nama: 'x' }, petugasA)).status, 400);
  const rb = await prisma.risiko.findFirst({ where: { kode: `RB-${sufiks}` } });
  assert.equal((await req('PATCH', `/risiko/${rb.id}`, { nama: 'diubah' }, petugasA)).status, 404);
  const ok = await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: unitA.id, kode: `PA-${sufiks}`, nama: 'Milik A' }, petugasA);
  assert.equal(ok.status, 201);
});

test('terkunci setelah diajukan: tidak bisa ubah/hapus', async () => {
  const r = await prisma.risiko.findFirst({ where: { kode: `RX-${sufiks}` } });
  await prisma.risiko.update({ where: { id: r.id }, data: { status_persetujuan: 'DIAJUKAN' } });
  assert.equal((await req('PATCH', `/risiko/${r.id}`, { nama: 'baru' }, petugasA)).status, 403);
  assert.equal((await req('DELETE', `/risiko/${r.id}`)).status, 400);
  const riwayat = await req('GET', `/risiko/${r.id}/riwayat`);
  assert.ok(riwayat.body.some((x) => x.aksi === 'BUAT'));
});

test('mitigasi & KRI ikut tersimpan lewat risiko, sinkron by id', async () => {
  const buat = await req('POST', '/risiko', {
    periode_id: periode.id, unit_kerja_id: unitA.id, kode: `MK-${sufiks}`, nama: 'Risiko dgn mitigasi',
    mitigasi: [{ uraian: 'Ganti pipa', jenis: 'MITIGASI', anggaran: 1000, target_waktu: '2026-12-31' }, { uraian: 'Asuransi', jenis: 'TRANSFER' }],
    kri: [{ nama: 'Tingkat kebocoran', satuan: '%', ambang_hijau: 10, ambang_kuning: 20, ambang_merah: 30 }],
  });
  assert.equal(buat.status, 201, JSON.stringify(buat.body));
  assert.equal(buat.body.mitigasi.length, 2);
  assert.equal(buat.body.kri.length, 1);

  // Ubah mitigasi #1, hapus #2, tambah baru; KRI tidak dikirim = tidak berubah.
  const [m1] = buat.body.mitigasi;
  const ubah = await req('PATCH', `/risiko/${buat.body.id}`, { mitigasi: [{ id: m1.id, uraian: 'Ganti pipa tahap 1' }, { uraian: 'Pelatihan' }] });
  assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
  assert.deepEqual(ubah.body.mitigasi.map((m) => m.uraian), ['Ganti pipa tahap 1', 'Pelatihan']);
  assert.equal(ubah.body.mitigasi[0].id, m1.id);
  assert.equal(ubah.body.kri.length, 1);

  // Validasi
  assert.equal((await req('PATCH', `/risiko/${buat.body.id}`, { kri: [{ nama: 'x', ambang_hijau: 30, ambang_kuning: 20, ambang_merah: 10 }] })).status, 400);
  assert.equal((await req('PATCH', `/risiko/${buat.body.id}`, { mitigasi: [{ uraian: '' }] })).status, 400);
  assert.equal((await req('PATCH', `/risiko/${buat.body.id}`, { mitigasi: [{ id: 999999, uraian: 'x' }] })).status, 400);

  // Mitigasi yang sudah punya realisasi tidak boleh dihapus.
  const lap = await prisma.pemantauan_bulanan.create({ data: { risiko_id: buat.body.id, tahun: 2026, bulan: 1 } });
  await prisma.realisasi_mitigasi.create({ data: { mitigasi_id: m1.id, pemantauan_bulanan_id: lap.id, status: 'BERJALAN', progres: 10 } });
  assert.equal((await req('PATCH', `/risiko/${buat.body.id}`, { mitigasi: [] })).status, 400);
});
