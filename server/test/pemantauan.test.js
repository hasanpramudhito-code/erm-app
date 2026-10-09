// Uji API pemantauan bulanan terhadap DB lokal.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');
const { statusKri } = require('../src/pemantauan');

let base, server, admin, periode, unit, risiko;
const sufiks = Date.now() % 100000;
const req = async (method, url, body) => {
  const r = await fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', cookie: admin }, body: body && JSON.stringify(body) });
  return { status: r.status, body: r.status === 204 ? null : await r.json() };
};
// Bulan lalu: pasti sudah lewat dan (untuk periode tahun berjalan) masih dalam periode bila bukan Januari.
const kini = new Date();
const T = kini.getMonth() === 0 ? kini.getFullYear() : kini.getFullYear();
const B = kini.getMonth() === 0 ? 1 : kini.getMonth();

test.before(async () => {
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, kata_sandi: process.env.SEED_ADMIN_PASSWORD }) });
  admin = l.headers.get('set-cookie').split(';')[0];
  periode = await prisma.periode.findFirst({ where: { status: 'TERBUKA', nama: String(T) } });
  unit = await prisma.unit_kerja.create({ data: { kode: `PM${sufiks}`, nama: 'Cabang Pantau', jenis: 'CABANG' } });
  risiko = (await req('POST', '/risiko', {
    periode_id: periode.id, unit_kerja_id: unit.id, kode: `PM-${sufiks}`, nama: 'Risiko dipantau',
    inheren: { kemungkinan: 4, dampak: 4 }, residual: { kemungkinan: 2, dampak: 3 },
    mitigasi: [{ uraian: 'Ganti pipa' }],
    kri: [
      { nama: 'Kebocoran', satuan: '%', ambang_hijau: 10, ambang_kuning: 20, ambang_merah: 30 },
      { nama: 'Kepuasan', satuan: '%', ambang_hijau: 90, ambang_kuning: 80, ambang_merah: 70, arah_target: 'LEBIH_TINGGI', frekuensi: 'TRIWULANAN' },
    ],
  })).body;
});

test.after(async () => {
  await prisma.risiko.deleteMany({ where: { unit_kerja_id: unit.id } });
  await prisma.insiden.deleteMany({ where: { unit_kerja_id: unit.id } });
  await prisma.unit_kerja.delete({ where: { id: unit.id } });
  server.close();
  await prisma.$disconnect();
});

test('statusKri sesuai arah', () => {
  const turun = { ambang_hijau: 10, ambang_kuning: 20, ambang_merah: 30, arah_target: 'LEBIH_RENDAH' };
  assert.deepEqual([5, 10, 15, 29, 30, 50].map((v) => statusKri(turun, v)), ['HIJAU', 'HIJAU', 'KUNING', 'KUNING', 'MERAH', 'MERAH']);
  const naik = { ambang_hijau: 90, ambang_kuning: 80, ambang_merah: 70, arah_target: 'LEBIH_TINGGI' };
  assert.deepEqual([95, 90, 85, 71, 70, 50].map((v) => statusKri(naik, v)), ['HIJAU', 'HIJAU', 'KUNING', 'KUNING', 'MERAH', 'MERAH']);
});

test('residual tersimpan sebagai penilaian periode', () => {
  assert.ok(risiko.penilaian.some((p) => p.jenis === 'RESIDUAL' && p.kemungkinan === 2));
});

test('isi laporan: mitigasi, KRI (boleh kosong), peristiwa -> insiden', async () => {
  const [m] = risiko.mitigasi, [k1, k2] = risiko.kri;
  const tgl = `${T}-${String(B).padStart(2, '0')}-05`;
  const r = await req('PUT', `/pemantauan/risiko/${risiko.id}/${T}/${B}`, {
    catatan: 'Perbaikan berjalan',
    mitigasi: [{ mitigasi_id: m.id, status: 'BERJALAN', progres: 40 }],
    kri: [{ kri_id: k1.id, nilai: 25 }, { kri_id: k2.id, nilai: '' }],
    peristiwa_terjadi: true,
    peristiwa: [{ tanggal_kejadian: tgl, deskripsi: 'Pipa pecah', kerugian: 2500000 }],
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.pengukuran_kri.length, 1);
  assert.equal(r.body.pengukuran_kri[0].status, 'KUNING');
  assert.equal(r.body.insiden.length, 1);

  const terkini = (await req('GET', `/risiko/${risiko.id}`)).body;
  assert.equal(terkini.mitigasi[0].progres, 40);
  assert.equal(terkini.kri[0].status, 'KUNING');

  // Simpan ulang tanpa peristiwa: insiden dari laporan ini ikut terhapus.
  const r2 = await req('PUT', `/pemantauan/risiko/${risiko.id}/${T}/${B}`, { mitigasi: [{ mitigasi_id: m.id, status: 'SELESAI', progres: 100 }] });
  assert.equal(r2.body.insiden.length, 0);
});

test('validasi laporan', async () => {
  const [m] = risiko.mitigasi;
  const url = `/pemantauan/risiko/${risiko.id}/${T}/${B}`;
  assert.equal((await req('PUT', url, { mitigasi: [{ mitigasi_id: m.id, status: 'BERJALAN', progres: 150 }] })).status, 400);
  assert.equal((await req('PUT', url, { mitigasi: [{ mitigasi_id: 999999, status: 'BERJALAN', progres: 10 }] })).status, 400);
  assert.equal((await req('PUT', url, { peristiwa_terjadi: true, peristiwa: [] })).status, 400);
  assert.equal((await req('PUT', url, { peristiwa_terjadi: true, peristiwa: [{ tanggal_kejadian: '2001-01-01', deskripsi: 'x' }] })).status, 400);
  assert.equal((await req('PUT', `/pemantauan/risiko/${risiko.id}/${T + 1}/1`, {})).status, 400);
});

test('ringkasan bulan & penanda terlambat; terkunci setelah diajukan', async () => {
  const r = await req('GET', `/pemantauan/ringkasan?periode_id=${periode.id}&tahun=${T}&bulan=${B}`);
  assert.equal(r.status, 200);
  const baris = r.body.risiko.find((x) => x.id === risiko.id);
  assert.ok(baris.laporan);
  assert.equal(baris.terlambat, new Date() > new Date(r.body.tenggat));

  const lap = await prisma.pemantauan_bulanan.findFirst({ where: { risiko_id: risiko.id } });
  await prisma.pemantauan_bulanan.update({ where: { id: lap.id }, data: { status_persetujuan: 'DIAJUKAN' } });
  // Admin bukan Direksi -> terkunci.
  assert.equal((await req('PUT', `/pemantauan/risiko/${risiko.id}/${T}/${B}`, {})).status, 403);
});

test('frekuensi triwulanan: laporan per triwulan, peristiwa boleh di bulan mana pun dalam triwulan', async () => {
  const lama = (await prisma.pengaturan.findUnique({ where: { kunci: 'frekuensi_pemantauan' } }))?.nilai ?? 1;
  assert.equal((await req('PUT', '/pengaturan/frekuensi_pemantauan', { nilai: 4 })).status, 400);
  assert.equal((await req('PUT', '/pengaturan/frekuensi_pemantauan', { nilai: 3 })).status, 200);
  try {
    // Triwulan I: disimpan sebagai bulan 3. Bulan 2 bukan akhir triwulan -> ditolak.
    assert.equal((await req('GET', `/pemantauan/risiko/${risiko.id}/${T}/2`)).status, 400);
    const g = await req('GET', `/pemantauan/risiko/${risiko.id}/${T}/3`);
    assert.equal(g.status, 200);
    assert.deepEqual([g.body.frekuensi, g.body.bulan_awal], [3, 1]);
    const isi = (tgl) => req('PUT', `/pemantauan/risiko/${risiko.id}/${T}/3`, {
      peristiwa_terjadi: true, peristiwa: [{ tanggal_kejadian: tgl, deskripsi: 'Pipa pecah' }],
    });
    assert.equal((await isi(`${T}-04-01`)).status, 400); // di luar triwulan
    assert.equal((await isi(`${T}-01-15`)).status, 200); // bulan pertama triwulan
    assert.equal((await req('GET', `/pemantauan/ringkasan?periode_id=${periode.id}&tahun=${T}&bulan=3`)).body.frekuensi, 3);
  } finally {
    await prisma.pemantauan_bulanan.deleteMany({ where: { risiko_id: risiko.id, tahun: T, bulan: 3 } });
    await req('PUT', '/pengaturan/frekuensi_pemantauan', { nilai: lama });
  }
});

test('KRI rasio (NRW): nilai dihitung dari angka nyata yang diinput', async () => {
  const dasar = { periode_id: periode.id, unit_kerja_id: unit.id, nama: 'Kehilangan air tinggi', inheren: { kemungkinan: 3, dampak: 3 } };
  const nrw = { nama: 'NRW', satuan: '%', rumus: 'RASIO', ambang_hijau: 20, ambang_kuning: 25, ambang_merah: 30 };
  assert.equal((await req('POST', '/risiko', { ...dasar, kode: `NRW0-${sufiks}`, kri: [nrw] })).status, 400); // nama angka wajib
  const r = await req('POST', '/risiko', { ...dasar, kode: `NRW-${sufiks}`, kri: [{ ...nrw, label_pembilang: 'Air hilang (m³)', label_penyebut: 'Air didistribusikan (m³)' }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const k = r.body.kri[0];
  assert.deepEqual([k.rumus, k.label_penyebut], ['RASIO', 'Air didistribusikan (m³)']);
  const isi = (pembilang, penyebut) => req('PUT', `/pemantauan/risiko/${r.body.id}/${T}/${B}`, { kri: [{ kri_id: k.id, pembilang, penyebut }] });
  assert.equal((await isi(1000, 0)).status, 400); // penyebut nol
  const l = await isi(27500, 100000);
  assert.equal(l.status, 200, JSON.stringify(l.body));
  const p = l.body.pengukuran_kri[0];
  assert.deepEqual([Number(p.nilai), Number(p.pembilang), Number(p.penyebut), p.status], [27.5, 27500, 100000, 'KUNING']);
});
