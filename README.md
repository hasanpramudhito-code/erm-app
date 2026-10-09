# ERM App

Aplikasi **Enterprise Risk Management (ERM)** on-premise: frontend React, backend Express, database MySQL. Tidak bergantung pada layanan cloud.

## Fitur Utama

- Risk Register, Risiko Utama & Pustaka, penilaian inheren/residual, mitigasi, KRI
- Alur persetujuan berjenjang dan Pemantauan Bulanan (realisasi mitigasi, KRI, peristiwa risiko)
- Dashboard, Dashboard Korporat (agregasi Cabang/Unit), Executive Dashboard
- Alur persetujuan dua tingkat (default) atau satu tingkat per unit kerja (mis. SPI)
- Laporan Excel (dari server) dan PDF
- Control Testing, Selera & Toleransi Risiko, Budaya Risiko, Matriks RACI
- Manajemen organisasi, pengguna, parameter penilaian, pengaturan sistem

## Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 18, Vite, Material UI |
| Backend | Node.js 22, Express, sesi cookie httpOnly |
| Database | MySQL 8 / MariaDB, Prisma ORM |
| File lampiran | Disk server (`DIR_UNGGAHAN`) |
| Deployment | Native (Node.js + MySQL + Nginx/IIS) atau Docker Compose |

## Struktur Folder

```
src/                # Frontend React
├── components/
├── contexts/       # AuthContext (sesi dari /api/auth/saya)
├── pages/
└── services/       # api.js (klien HTTP), adaptor data
server/             # Backend Express
├── prisma/         # schema.prisma, migrations, seed.js
├── src/            # app.js (routing), satu file per modul API
└── test/           # node:test, berjalan terhadap DB lokal
```

## Pengembangan Lokal

Prasyarat: Node.js 22.12+ dan MySQL/MariaDB berjalan di `localhost:3306`.

```bash
# 1. Backend
cd server
cp .env.example .env          # isi DATABASE_URL, SEED_ADMIN_*, SEED_NAMA_PERUSAHAAN
npm install
npm run db:migrate            # buat tabel
npm run db:seed               # admin, peran, parameter penilaian awal
npm run dev                   # http://localhost:3001

# 2. Frontend (terminal lain, dari root repo)
npm install
npm start                     # http://localhost:3000, /api diteruskan ke :3001
```

Tes backend (memakai database di `.env`; data uji dibersihkan sendiri):

```bash
cd server && npm test
```

## Instalasi di Server Klien

Dua opsi; pilih sesuai kebijakan TI klien. Keduanya membaca konfigurasi dari environment variable dan menjalankan migrasi via Prisma.

### Opsi A: Native (tanpa Docker)

Prasyarat: Node.js 22.12+, MySQL 8 atau MariaDB 10.4+, reverse proxy (Nginx di Linux, IIS/Nginx di Windows).

```bash
# Database: buat database & user
mysql -uroot -p -e "CREATE DATABASE erm CHARACTER SET utf8mb4; CREATE USER 'erm'@'localhost' IDENTIFIED BY '<sandi>'; GRANT ALL ON erm.* TO 'erm'@'localhost';"

# Build frontend (hasil di dist/, disajikan oleh server Express)
npm ci && npm run build

# Backend
cd server
cp .env.example .env          # DATABASE_URL, DIR_UNGGAHAN (folder lampiran di luar folder aplikasi), SEED_*
npm ci
npm run db:migrate
npm run db:seed               # sekali saja, instalasi pertama
NODE_ENV=production npm start # http://localhost:3001
```

Jalankan sebagai layanan agar hidup kembali setelah restart:
- **Linux**: `pm2 start src/index.js --name erm` lalu `pm2 save && pm2 startup`, atau unit systemd dengan `WorkingDirectory=/opt/erm-app/server` dan `Environment=NODE_ENV=production`.
- **Windows**: daftarkan `node src\index.js` sebagai Windows Service (mis. dengan NSSM), set `NODE_ENV=production`.

Reverse proxy meneruskan `https://<domain>/` ke `http://127.0.0.1:3001` dengan sertifikat TLS. Cookie sesi bertanda `Secure` saat `NODE_ENV=production`, jadi aplikasi wajib diakses lewat HTTPS.

Backup: `mysqldump --single-transaction erm > erm-YYYY-MM-DD.sql` dan salin folder `DIR_UNGGAHAN`. Restore: `mysql erm < erm-YYYY-MM-DD.sql` dan kembalikan folder tersebut.

### Opsi B: Docker Compose

```bash
cp .env.docker.example .env   # isi DB_PASSWORD, DB_ROOT_PASSWORD, SEED_ADMIN_PASSWORD
docker compose up -d          # migrasi database berjalan otomatis saat start
docker compose exec app npm run db:seed    # sekali saja, instalasi pertama
```

Aplikasi terbuka di `http://<server>:8080` (ubah lewat `APP_PORT`). Port ini **tanpa HTTPS**: pasang reverse proxy (nginx/IIS) dengan sertifikat di depannya sebelum dibuka ke jaringan luar.

#### Backup & Restore (Docker)

Data ada di dua volume: database (`db_data`) dan lampiran (`unggahan`).

```bash
# Backup
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction erm' > erm-$(date +%F).sql
docker compose run --rm -v "$PWD":/backup app tar czf /backup/unggahan-$(date +%F).tgz -C /data unggahan

# Restore
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" erm' < erm-YYYY-MM-DD.sql
docker compose run --rm -v "$PWD":/backup app tar xzf /backup/unggahan-YYYY-MM-DD.tgz -C /data
```

## Peran Pengguna

Sesuai adendum v2 (struktur Perbup Kutai Timur No. 53/2021):

| Kode | Pemegang (contoh) | Akses utama |
|------|-------------------|-------------|
| `ADMIN` | Ditunjuk klien | Pengguna, unit kerja, periode, parameter |
| `DIREKSI` | Direktur Utama/Umum/Teknik | Seluruh data, termasuk mengubah |
| `PENGELOLA_RISIKO` | Asmen Manajemen Risiko (SPI) | Risiko utama & pustaka, verifikasi final (kecuali alur satu tingkat), buka kunci |
| `AUDITOR` | Asmen Auditor (SPI) | Seluruh data, hanya baca |
| `PIMPINAN` | Manajer Bagian, Kepala Cabang/Unit | Persetujuan tingkat 1 (alur satu tingkat: langsung final) |
| `PETUGAS` | Asmen/staf bagian, petugas Cabang/Unit | Input risiko, mitigasi, pemantauan |

Hak akses ditegakkan di server. Selain `ADMIN`, `DIREKSI`, `PENGELOLA_RISIKO`, `AUDITOR`, pengguna hanya melihat data unit kerjanya. Pengguna yang terdaftar di sub-bagian memakai register bagian induknya.

## Lisensi

Proyek internal.
