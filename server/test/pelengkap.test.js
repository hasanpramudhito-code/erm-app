// Uji API modul pelengkap: pengujian kontrol, selera risiko, budaya risiko, RACI.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, petugas, petugasId, unit, kontrolId, surveiId;
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
  unit = await prisma.unit.create({ data: { kode: `PL${sufiks}`, nama: 'Cabang Uji Pelengkap', jenis: 'CABANG' } });
  const email = `petugas-pl-${sufiks}@erm.local`;
  petugasId = (await req('POST', '/pengguna', { nama: 'Petugas PL', email, kata_sandi: 'sandi-uji-panjang', peran: ['PETUGAS_RISIKO_CABANG'], unit_id: unit.id })).body.id;
  petugas = await login(email, 'sandi-uji-panjang');
});

test.after(async () => {
  if (kontrolId) await prisma.kontrol.delete({ where: { id: kontrolId } }).catch(() => {});
  if (surveiId) await prisma.survei_budaya.delete({ where: { id: surveiId } }).catch(() => {});
  await prisma.risiko.deleteMany({ where: { unit_id: unit.id } });
  await prisma.jejak_audit.deleteMany({ where: { pengguna_id: petugasId } });
  await prisma.pengguna.delete({ where: { id: petugasId } });
  await prisma.unit.delete({ where: { id: unit.id } });
  server.close();
  await prisma.$disconnect();
});

test('kontrol, jadwal, hasil, defisiensi', async () => {
  assert.equal((await req('POST', '/kontrol', { nama: 'x', jenis: 'ACAK' })).status, 400);
  assert.equal((await req('POST', '/kontrol', { nama: 'x', jenis: 'PREVENTIF' }, petugas)).status, 403);
  const k = await req('POST', '/kontrol', { nama: `Rekonsiliasi kas ${sufiks}`, jenis: 'DETEKTIF', frekuensi: 'BULANAN' });
  assert.equal(k.status, 201, JSON.stringify(k.body));
  kontrolId = k.body.id;
  const j = await req('POST', '/jadwal-pengujian', { kontrol_id: kontrolId, tanggal_jadwal: '2026-11-01', jenis_pengujian: 'DESAIN' });
  assert.equal(j.status, 201);
  assert.equal((await req('POST', '/hasil-pengujian', { kontrol_id: kontrolId, tanggal_uji: '2026-11-02', jenis_pengujian: 'DESAIN', hasil: 'EFEKTIF', peringkat_efektivitas: 7 })).status, 400);
  const h = await req('POST', '/hasil-pengujian', { kontrol_id: kontrolId, jadwal_id: j.body.id, tanggal_uji: '2026-11-02', jenis_pengujian: 'DESAIN', hasil: 'SEBAGIAN_EFEKTIF', peringkat_efektivitas: 3 });
  assert.equal(h.status, 201);
  assert.equal((await prisma.jadwal_pengujian.findUnique({ where: { id: j.body.id } })).status, 'SELESAI');
  const d = await req('POST', '/defisiensi', { kontrol_id: kontrolId, hasil_pengujian_id: h.body.id, judul: 'Bukti tidak lengkap', tanggal_identifikasi: '2026-11-02', tingkat_keparahan: 'TINGGI' });
  assert.equal(d.status, 201);
  const daftar = (await req('GET', '/kontrol', null, petugas)).body;
  assert.equal(daftar.find((x) => x.id === kontrolId).hasil_pengujian[0].hasil, 'SEBAGIAN_EFEKTIF');
  await prisma.defisiensi.delete({ where: { id: d.body.id } });
});

test('pernyataan selera risiko: validasi batas', async () => {
  assert.equal((await req('POST', '/pernyataan-selera-risiko', { pernyataan: 'x', batas_toleransi: { rendah: { min: 3, maks: 1 } } })).status, 400);
  const batas = { rendah: { min: 1, maks: 4 }, sedang: { min: 5, maks: 12 }, tinggi: { min: 13, maks: 25 } };
  const p = await req('POST', '/pernyataan-selera-risiko', { pernyataan: 'Toleransi rendah terhadap kehilangan air', batas_toleransi: batas });
  assert.equal(p.status, 201);
  assert.equal((await req('DELETE', `/pernyataan-selera-risiko/${p.body.id}`)).status, 204);
});

test('survei budaya: hanya terbit yang bisa diisi, skor dihitung server', async () => {
  const opsi = [1, 2, 3, 4, 5].map((nilai) => ({ nilai, label: String(nilai) }));
  const s = await req('POST', '/survei-budaya', { judul: `Survei ${sufiks}`, pertanyaan: [
    { id: 'q1', kategori: 'Kepemimpinan', pertanyaan: 'A?', opsi }, { id: 'q2', kategori: 'Kesadaran', pertanyaan: 'B?', opsi },
  ] });
  assert.equal(s.status, 201);
  surveiId = s.body.id;
  assert.equal((await req('POST', `/survei-budaya/${surveiId}/respons`, { jawaban: { q1: 5, q2: 5 } }, petugas)).status, 400); // masih draf
  await req('PATCH', `/survei-budaya/${surveiId}`, { status: 'TERBIT' });
  assert.equal((await req('POST', `/survei-budaya/${surveiId}/respons`, { jawaban: { q1: 9, q2: 5 } }, petugas)).status, 400);
  const r = await req('POST', `/survei-budaya/${surveiId}/respons`, { jawaban: { q1: 5, q2: 3 } }, petugas);
  assert.equal(r.status, 201);
  assert.equal(Number(r.body.skor), 80);
  assert.equal((await req('POST', `/survei-budaya/${surveiId}/respons`, { jawaban: { q1: 1, q2: 1 } }, petugas)).status, 409);
  assert.equal((await req('GET', `/survei-budaya/${surveiId}/hasil`, null, petugas)).status, 403);
  const h = (await req('GET', `/survei-budaya/${surveiId}/hasil`)).body;
  assert.deepEqual(h.kategori, { Kepemimpinan: 100, Kesadaran: 60 });
  assert.equal(h.skor_rata, 80);
  assert.equal(h.respons[0].jawaban, undefined);
});

test('RACI: isi, ganti, kosongkan; petugas tidak boleh menulis', async () => {
  const periode = await prisma.periode.findFirst({ where: { status: 'TERBUKA' } });
  const risiko = await prisma.risiko.create({ data: { periode_id: periode.id, unit_id: unit.id, kode: `RC-${sufiks}`, nama: 'Risiko RACI' } });
  assert.equal((await req('PUT', `/raci/${risiko.id}/R`, { pengguna_id: petugasId }, petugas)).status, 403);
  assert.equal((await req('PUT', `/raci/${risiko.id}/X`, { pengguna_id: petugasId })).status, 400);
  assert.equal((await req('PUT', `/raci/${risiko.id}/R`, { pengguna_id: petugasId })).status, 200);
  const baris = (await req('GET', `/raci?periode_id=${periode.id}`, null, petugas)).body;
  assert.ok(baris.every((b) => b.unit.id === unit.id)); // cakupan unit petugas
  assert.equal(baris.find((b) => b.id === risiko.id).raci[0].pengguna.id, petugasId);
  assert.equal((await req('PUT', `/raci/${risiko.id}/R`, { pengguna_id: null })).status, 204);
  assert.equal(await prisma.raci.count({ where: { risiko_id: risiko.id } }), 0);
});
