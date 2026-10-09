# ERM App

Aplikasi **Enterprise Risk Management (ERM)** on-premise: frontend React, backend Express, database MySQL. Tidak bergantung pada layanan cloud.

## Fitur Utama

- Risk Register, Risiko Utama & Pustaka, penilaian inheren/residual, mitigasi, KRI
- Alur persetujuan berjenjang dan Pemantauan Bulanan (realisasi mitigasi, KRI, peristiwa risiko)
- Dashboard, Dashboard Korporat (agregasi cabang), Executive Dashboard
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
| Deployment | Docker Compose (aplikasi + MySQL) |

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

## Instalasi di Server Klien (Docker)

```bash
cp .env.docker.example .env   # isi DB_PASSWORD, DB_ROOT_PASSWORD, SEED_ADMIN_PASSWORD
docker compose up -d          # migrasi database berjalan otomatis saat start
docker compose exec app npm run db:seed    # sekali saja, instalasi pertama
```

Aplikasi terbuka di `http://<server>:8080` (ubah lewat `APP_PORT`). Port ini **tanpa HTTPS**: pasang reverse proxy (nginx/IIS) dengan sertifikat di depannya sebelum dibuka ke jaringan luar.

### Backup & Restore

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

| Kode | Akses utama |
|------|-------------|
| `ADMIN_SISTEM` | Penuh, termasuk pengguna & pengaturan |
| `DIREKSI` | Lihat semua, persetujuan akhir |
| `PENGELOLA_RISIKO` | Kelola parameter, risiko utama, verifikasi, modul pelengkap |
| `PIMPINAN_UNIT_PUSAT` / `PIMPINAN_CABANG` | Persetujuan tingkat unit |
| `PETUGAS_RISIKO_PUSAT` / `PETUGAS_RISIKO_CABANG` | Isi risiko & pemantauan unitnya |
| `KEPATUHAN` | Lihat seluruh data |

Hak akses ditegakkan di server; pengguna di luar `ADMIN_SISTEM`, `DIREKSI`, `PENGELOLA_RISIKO`, `KEPATUHAN` hanya melihat data unitnya.

## Lisensi

Proyek internal.
