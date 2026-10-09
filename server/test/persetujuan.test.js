// Uji alur persetujuan dengan peran nyata: petugas -> pimpinan -> pengelola risiko.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const prisma = require('../src/db');

let base, server, admin, periode, unitA, unitB, bagianS, subS;
const ck = {};
const ids = {};
const sufiks = Date.now() % 100000;
const SANDI = 'sandi-uji-panjang';

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
  unitA = await prisma.unit_kerja.create({ data: { kode: `SA${sufiks}`, nama: 'Cabang SA', jenis: 'CABANG' } });
  unitB = await prisma.unit_kerja.create({ data: { kode: `SB${sufiks}`, nama: 'Unit SB', jenis: 'UNIT' } });
  // Bagian satu tingkat (seperti SPI) dengan sub-bagian tempat petugas terdaftar.
  bagianS = await prisma.unit_kerja.create({ data: { kode: `SS${sufiks}`, nama: 'Bagian Satu Tingkat', jenis: 'BAGIAN', alur_persetujuan: 'SATU_TINGKAT' } });
  subS = await prisma.unit_kerja.create({ data: { kode: `SS${sufiks}-1`, nama: 'Sub Satu Tingkat', jenis: 'SUB_BAGIAN', induk_id: bagianS.id, pemilik_risiko: false } });
  const akun = [
    ['petugas', 'PETUGAS', unitA.id],
    ['pimpinan', 'PIMPINAN', unitA.id],
    ['pimpinanB', 'PIMPINAN', unitB.id],
    ['pengelola', 'PENGELOLA_RISIKO', null],
    ['petugasS', 'PETUGAS', subS.id],
    ['pimpinanS', 'PIMPINAN', bagianS.id],
    ['auditor', 'AUDITOR', null],
  ];
  for (const [nama, peran, unit_kerja_id] of akun) {
    const email = `${nama}-${sufiks}@erm.local`;
    ids[nama] = (await req('POST', '/pengguna', { nama, email, kata_sandi: SANDI, peran: [peran], unit_kerja_id })).body.id;
    ck[nama] = await login(email, SANDI);
  }
});

test.after(async () => {
  const semua = Object.values(ids);
  // Bukti yang diunggah tes: hapus file & barisnya.
  const { DIR } = require('../src/lampiran');
  for (const l of await prisma.lampiran.findMany({ where: { diunggah_oleh_id: { in: semua } } }))
    require('fs').rmSync(require('path').join(DIR, require('path').basename(l.lokasi_file)), { force: true });
  await prisma.lampiran.deleteMany({ where: { diunggah_oleh_id: { in: semua } } });
  await prisma.risiko.deleteMany({ where: { unit_kerja_id: { in: [unitA.id, unitB.id, bagianS.id] } } });
  await prisma.riwayat_persetujuan.deleteMany({ where: { pengguna_id: { in: semua } } });
  await prisma.jejak_audit.deleteMany({ where: { pengguna_id: { in: semua } } });
  await prisma.pengguna.deleteMany({ where: { id: { in: semua } } });
  await prisma.unit_kerja.delete({ where: { id: subS.id } });
  await prisma.unit_kerja.deleteMany({ where: { id: { in: [unitA.id, unitB.id, bagianS.id] } } });
  server.close();
  await prisma.$disconnect();
});

test('alur lengkap risiko: ajukan -> kembalikan -> ajukan -> setujui -> final -> buka', async () => {
  const r = (await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: unitA.id, kode: `PS-${sufiks}`, nama: 'Risiko persetujuan' }, ck.petugas)).body;
  const aksi = (a, who, catatan) => req('POST', `/persetujuan/risiko/${r.id}/${a}`, catatan ? { catatan } : {}, ck[who]);

  assert.equal((await aksi('setujui', 'pimpinan')).status, 400); // belum diajukan
  assert.equal((await aksi('ajukan', 'pimpinanB')).status, 404); // unit lain: tidak terlihat
  assert.equal((await aksi('ajukan', 'petugas')).status, 200);
  assert.equal((await req('PATCH', `/risiko/${r.id}`, { nama: 'ubah' }, ck.petugas)).status, 403); // terkunci

  // Antrean pimpinan memuat risiko ini; antrean pimpinan unit lain tidak.
  assert.ok((await req('GET', '/persetujuan/antrean', null, ck.pimpinan)).body.risiko.some((x) => x.id === r.id));
  assert.ok(!(await req('GET', '/persetujuan/antrean', null, ck.pimpinanB)).body.risiko.some((x) => x.id === r.id));
  // Notifikasi ke pimpinan.
  assert.ok((await req('GET', '/persetujuan/notifikasi', null, ck.pimpinan)).body.some((n) => n.pesan.includes(`PS-${sufiks}`)));

  assert.equal((await aksi('kembalikan', 'pimpinan')).status, 400); // catatan wajib
  assert.equal((await aksi('kembalikan', 'pimpinan', 'Lengkapi penyebab')).status, 200);
  assert.equal((await req('PATCH', `/risiko/${r.id}`, { nama: 'diperbaiki' }, ck.petugas)).status, 200); // terbuka lagi
  assert.equal((await aksi('ajukan', 'petugas')).status, 200);

  assert.equal((await aksi('setujui', 'petugas')).status, 403); // petugas tidak boleh menyetujui
  assert.equal((await aksi('finalkan', 'pengelola')).status, 400); // belum disetujui pimpinan
  assert.equal((await aksi('setujui', 'pimpinan')).status, 200);
  assert.equal((await aksi('finalkan', 'pimpinan')).status, 403);
  assert.equal((await aksi('finalkan', 'pengelola')).status, 200);

  assert.equal((await aksi('buka', 'pimpinan', 'x')).status, 403);
  assert.equal((await aksi('buka', 'pengelola', 'Revisi kontrol')).status, 200);

  const riwayat = (await req('GET', `/persetujuan/risiko/${r.id}/riwayat`, null, ck.petugas)).body;
  assert.equal(riwayat.length, 6);
  assert.equal(riwayat[0].ke_status, 'DIKEMBALIKAN');
});

test('laporan bulanan hanya bisa diajukan setelah risiko FINAL', async () => {
  const r = (await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: unitA.id, kode: `PL-${sufiks}`, nama: 'Risiko laporan', mitigasi: [{ uraian: 'm' }] }, ck.petugas)).body;
  const kini = new Date();
  const [t, b] = kini.getMonth() === 0 ? [kini.getFullYear(), 1] : [kini.getFullYear(), kini.getMonth()];
  const lap = (await req('PUT', `/pemantauan/risiko/${r.id}/${t}/${b}`, { mitigasi: [{ mitigasi_id: r.mitigasi[0].id, status: 'BERJALAN', progres: 20 }] }, ck.petugas)).body;
  const aksiLap = (a, who) => req('POST', `/persetujuan/pemantauan/${lap.id}/${a}`, {}, ck[who]);

  assert.equal((await aksiLap('ajukan', 'petugas')).status, 400);
  for (const [a, who] of [['ajukan', 'petugas'], ['setujui', 'pimpinan'], ['finalkan', 'pengelola']])
    assert.equal((await req('POST', `/persetujuan/risiko/${r.id}/${a}`, {}, ck[who])).status, 200);

  // Tanpa bukti pelaksanaan mitigasi: ditolak dengan nama mitigasi yang kurang.
  const tolak = await aksiLap('ajukan', 'petugas');
  assert.equal(tolak.status, 400);
  assert.match(tolak.body.error, /bukti/);
  const fd = new FormData(); fd.append('file', new Blob(['foto']), 'bukti.jpg');
  const up = await fetch(`${base}/api/pemantauan/laporan/${lap.id}/mitigasi/${r.mitigasi[0].id}/bukti`, { method: 'POST', headers: { cookie: ck.petugas }, body: fd });
  assert.equal(up.status, 201);
  assert.equal((await aksiLap('ajukan', 'petugas')).status, 200);
  const ringkas = (await req('GET', `/pemantauan/ringkasan?periode_id=${periode.id}&tahun=${t}&bulan=${b}`, null, ck.petugas)).body;
  assert.ok(ringkas.risiko.find((x) => x.id === r.id).laporan.diajukan_pada);
  assert.equal((await req('PUT', `/pemantauan/risiko/${r.id}/${t}/${b}`, {}, ck.petugas)).status, 403);

  // Proses massal oleh pimpinan.
  const massal = (await req('POST', '/persetujuan/massal', { entitas: 'pemantauan', aksi: 'setujui', ids: [lap.id, 999999] }, ck.pimpinan)).body;
  assert.deepEqual(massal.map((h) => h.ok), [true, false]);
});

test('alur satu tingkat: pimpinan langsung FINAL & membuka kunci; petugas sub-bagian memakai register bagian', async () => {
  // Petugas sub-bagian: cakupan = bagian induk; sub-bagian sendiri tidak boleh memegang register.
  assert.equal((await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: subS.id, kode: `SX-${sufiks}`, nama: 'x' })).status, 400);
  const r = (await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: bagianS.id, kode: `ST-${sufiks}`, nama: 'Risiko SPI' }, ck.petugasS)).body;
  assert.ok(r.id, JSON.stringify(r));
  const aksi = (a, who, catatan) => req('POST', `/persetujuan/risiko/${r.id}/${a}`, catatan ? { catatan } : {}, ck[who]);
  assert.equal((await aksi('ajukan', 'petugasS')).status, 200);
  const s = await aksi('setujui', 'pimpinanS');
  assert.equal(s.body.status_persetujuan, 'FINAL');
  assert.equal((await aksi('buka', 'pengelola', 'x')).status, 403); // pengelola bawahan pimpinan SPI
  assert.equal((await aksi('buka', 'pimpinanS', 'Revisi')).status, 200);
});

test('auditor: lihat semua, tidak bisa menulis atau memverifikasi', async () => {
  const r = (await req('POST', '/risiko', { periode_id: periode.id, unit_kerja_id: unitB.id, kode: `AU-${sufiks}`, nama: 'Risiko unit' })).body;
  assert.equal((await req('GET', `/risiko/${r.id}`, null, ck.auditor)).status, 200);
  assert.equal((await req('PATCH', `/risiko/${r.id}`, { nama: 'x' }, ck.auditor)).status, 403);
  assert.equal((await req('POST', `/persetujuan/risiko/${r.id}/ajukan`, {}, ck.auditor)).status, 403);
  assert.equal((await req('GET', `/risiko/${r.id}/riwayat`, null, ck.auditor)).status, 200);
});

test('revisi risiko FINAL: usulan disimpan terpisah, data berlaku tetap sampai revisi final', async () => {
  const r = (await req('POST', '/risiko', {
    periode_id: periode.id, unit_kerja_id: unitA.id, kode: `RV-${sufiks}`, nama: 'Risiko revisi',
    penyebab: [{ uraian: 'Penyebab awal' }], inheren: { kemungkinan: 2, dampak: 2 }, mitigasi: [{ uraian: 'Mitigasi awal' }],
  }, ck.petugas)).body;
  // Belum FINAL: revisi ditolak (ubah langsung saja).
  assert.equal((await req('PUT', `/risiko/${r.id}/revisi`, { alasan: 'x', inheren: { kemungkinan: 5, dampak: 5 } }, ck.petugas)).status, 400);
  for (const [a, who] of [['ajukan', 'petugas'], ['setujui', 'pimpinan'], ['finalkan', 'pengelola']])
    assert.equal((await req('POST', `/persetujuan/risiko/${r.id}/${a}`, {}, ck[who])).status, 200);

  assert.equal((await req('PUT', `/risiko/${r.id}/revisi`, { inheren: { kemungkinan: 5, dampak: 5 } }, ck.petugas)).status, 400); // alasan wajib
  const usul = { alasan: 'Ada kejadian baru', inheren: { kemungkinan: 5, dampak: 5 }, penyebab: [{ uraian: 'Penyebab awal' }, { uraian: 'Penyebab baru' }], mitigasi: [{ id: r.mitigasi[0].id, uraian: 'Mitigasi diperketat' }] };
  const rev = await req('PUT', `/risiko/${r.id}/revisi`, usul, ck.petugas);
  assert.equal(rev.status, 201, JSON.stringify(rev.body));
  assert.equal(rev.body.nomor_revisi, 1);
  assert.equal(rev.body.salinan_data.sebelum.inheren.kemungkinan, 2);
  assert.equal((await req('PUT', `/risiko/${r.id}/revisi`, { ...usul, alasan: 'Diperbarui' }, ck.petugas)).status, 200); // ubah draf yang sama

  const aksiRev = (a, who, catatan) => req('POST', `/persetujuan/revisi/${rev.body.id}/${a}`, catatan ? { catatan } : {}, ck[who]);
  assert.equal((await aksiRev('ajukan', 'petugas')).status, 200);
  assert.equal((await req('PUT', `/risiko/${r.id}/revisi`, usul, ck.petugas)).status, 400); // sedang diproses
  assert.equal((await aksiRev('setujui', 'pimpinan')).status, 200);
  // Belum final: data berlaku masih versi lama.
  let kini = (await req('GET', `/risiko/${r.id}`)).body;
  assert.equal(kini.penilaian.find((p) => p.jenis === 'INHEREN').kemungkinan, 2);
  assert.equal(kini.status_persetujuan, 'FINAL');

  assert.equal((await aksiRev('finalkan', 'pengelola')).status, 200);
  kini = (await req('GET', `/risiko/${r.id}`)).body;
  assert.equal(kini.penilaian.find((p) => p.jenis === 'INHEREN').kemungkinan, 5);
  assert.equal(kini.penyebab.length, 2);
  assert.equal(kini.mitigasi[0].uraian, 'Mitigasi diperketat');
  assert.equal(kini.mitigasi[0].id, r.mitigasi[0].id); // mitigasi yang sama (riwayat pemantauan tetap terkait)
  assert.equal(kini.versi_aktif, 2);
  assert.equal(kini.status_persetujuan, 'FINAL');
  assert.equal((await aksiRev('buka', 'pengelola', 'x')).status, 400); // revisi final tidak dibuka

  // Revisi berikutnya bernomor 2; bisa dibatalkan selagi draf.
  assert.equal((await req('PUT', `/risiko/${r.id}/revisi`, { alasan: 'Lagi', catatan_penilaian: 'baru' }, ck.petugas)).body.nomor_revisi, 2);
  assert.equal((await req('DELETE', `/risiko/${r.id}/revisi`, null, ck.petugas)).status, 204);
  assert.equal((await req('GET', `/risiko/${r.id}/revisi`, null, ck.petugas)).body.length, 1);
});
