# ERM App — panduan kerja

Aplikasi manajemen risiko on-premise untuk Perumda Air Minum Tirta Tuah Benua Kutai Timur.
Kebutuhan: `HANDOFF_spesifikasi_aplikasi_risiko.md` (v1) + `ADENDUM_v2_spesifikasi_aplikasi_risiko.md` (berlaku di atas v1).
Cara menjalankan & memasang: `README.md`.

## Arsitektur

- `server/` — Express + Prisma + MySQL/MariaDB. `src/app.js` memasang router; satu file per modul API
  (`risiko.js`, `persetujuan.js`, `pemantauan.js`, `master.js` untuk data master & pengaturan, `pelengkap.js`
  untuk kontrol/selera/budaya/RACI). `crud.js` = router CRUD generik. `auth.js` = sesi cookie & `cakupanUnitKerja`.
- `src/` — React (Vite) + MUI. `services/api.js` klien HTTP; `services/risiko.js` adaptor data & label bersama.
  Menu tunggal di `components/EnhancedNavigation.jsx` (disaring per peran).
- Server menyajikan `dist/` (hasil `npm run build`) di port 3001; dev frontend `npm start` (port 3000, proxy `/api`).

## Aturan bisnis yang sering terlupa

- Unit kerja: BAGIAN / SUB_BAGIAN / CABANG / UNIT. Hanya `pemilik_risiko` yang memegang register; pengguna
  sub-bagian memakai bagian induknya. CABANG dan UNIT diperlakukan sama (risiko utama `berlaku_untuk = CABANG`).
- Peran: ADMIN, DIREKSI, PENGELOLA_RISIKO, AUDITOR (hanya baca), PIMPINAN, PETUGAS. Hak akses ditegakkan di server.
- Persetujuan: DUA_TINGKAT (pimpinan -> pengelola risiko) atau SATU_TINGKAT per unit kerja (SPI: pimpinan langsung FINAL).
- Penilaian hanya Inheren + Residual (tidak ada Target). Skor & level dihitung server.
- Pemantauan: frekuensi dari pengaturan `frekuensi_pemantauan` (1/2/3 bulan). Laporan disimpan di (tahun, bulan terakhir masa).
- Mitigasi & KRI didefinisikan di form Register Risiko; halaman Rencana Mitigasi/KRI/Peristiwa hanya baca.

## Cara kerja

- Jangan menghapus fitur/modul tanpa persetujuan eksplisit pemilik proyek.
- Utamakan sederhana & mudah dipakai: label bahasa Indonesia, modul sejenis jadi satu halaman bertab.
- Setiap perubahan backend: `cd server && npm test` (node:test, memakai DB di `server/.env`, data uji dibersihkan sendiri).
  Setiap perubahan frontend: `npm run build`, lalu cek halaman terkait di browser.
- Migrasi DB baru: tulis manual di `server/prisma/migrations/NNNN_nama/` bila perlu mempertahankan data (RENAME, bukan drop).
  MariaDB 10.4 (dev) tidak mendukung `RENAME INDEX`: pakai DROP + ADD INDEX. Backup DB dulu sebelum `migrate deploy`.
- Commit per langkah dengan pesan yang menjelaskan apa & mengapa; `git log` adalah catatan progres.

## Status terbuka

- Menunggu klien: daftar Cabang/Unit; pemegang peran Admin; konfirmasi asumsi Asisten Manajer menginput & Manajer menyetujui tingkat 1.
- Belum diuji: instalasi native & Docker serta prosedur backup/restore di server klien.
