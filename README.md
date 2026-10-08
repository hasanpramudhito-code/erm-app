# ERM App

Aplikasi **Enterprise Risk Management (ERM)** untuk manajemen risiko organisasi, dibangun dengan React dan Firebase.

## Fitur Utama

- Dashboard & Executive Dashboard
- Risk Register, Assessment, dan Treatment Plans
- KRI Monitoring & Risk Appetite
- Control Testing (register, jadwal, hasil, deficiency)
- Approval workflow
- Laporan (export Excel/PDF/DOCX)
- Manajemen organisasi dan pengguna

## Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 18, Create React App, Material UI |
| Backend | Firebase Auth, Firestore, Storage |
| Serverless | Firebase Cloud Functions (Node.js 18) |
| Hosting | Firebase Hosting |

## Prasyarat

- Node.js 18+
- npm
- Akun Firebase & Firebase CLI (`npm install -g firebase-tools`)

## Setup Lokal

```bash
# Clone & install dependensi frontend
npm install

# Install dependensi Cloud Functions
cd functions && npm install && cd ..

# Salin environment (opsional, untuk override konfigurasi Firebase)
cp .env.production .env.local
# Edit .env.local sesuai project Firebase Anda
```

### Cloud Functions

Cloud Functions membutuhkan service account key:

1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Simpan sebagai `functions/serviceAccountKey.json` (file ini **tidak** boleh di-commit)

## Menjalankan

```bash
# Development server (http://localhost:3000)
npm start

# Unit test
npm test -- --watchAll=false

# Build production
npm run build
```

## Deploy

```bash
firebase login
firebase use <project-id>    # lihat .firebaserc
npm run build
firebase deploy
```

Deploy parsial:

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## Struktur Folder

```
src/
├── components/     # UI reusable (layout, navigasi, chart)
├── config/         # Firebase, roles, theme
├── contexts/       # Auth, approval, settings
├── pages/          # Halaman fitur
├── services/       # Akses Firestore & export
├── hooks/          # usePermissions, useApproval
└── utils/          # Validasi & kalkulasi

functions/          # Cloud Functions (user admin, audit log)
public/             # Asset statis
firestore.rules     # Aturan keamanan Firestore
```

## Model Role

Role disimpan di koleksi Firestore `users/{uid}` dan digunakan UI untuk kontrol akses menu.

| Role | Akses utama |
|------|-------------|
| `STAFF` | Lihat risiko, submit risiko, dashboard |
| `RISK_OWNER` | Assess & review risiko milik sendiri |
| `RISK_MANAGER` | Kelola risiko, KRI, treatment plans |
| `ADMIN` | Akses penuh termasuk user & database management |
| `AUDITOR` | Lihat data & laporan (read-only) |
| `EXECUTIVE` | Executive dashboard & laporan |

> **Catatan:** Firestore rules memeriksa `request.auth.token.role` (custom claims JWT). Pastikan role di-sync saat membuat/mengubah user. Lihat `SECURITY_FIXES_GUIDE.md` untuk panduan keamanan lengkap.

## Environment Variables

Variabel `REACT_APP_*` di `.env.local` / `.env.production`:

| Variabel | Deskripsi |
|----------|-----------|
| `REACT_APP_AUTH_DOMAIN` | Firebase auth domain |
| `REACT_APP_PROJECT_ID` | Firebase project ID |
| `REACT_APP_STORAGE_BUCKET` | Firebase storage bucket |
| `REACT_APP_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `REACT_APP_APP_ID` | Firebase app ID |

## Keamanan Role (Functions — belum deploy)

Cloud Functions untuk manajemen user & sinkronisasi custom claims sudah disiapkan di `functions/`.
**Default: tidak aktif.** Lihat [FUNCTIONS_SECURITY.md](./FUNCTIONS_SECURITY.md) untuk panduan deploy.

```env
# Aktifkan setelah deploy functions:
# REACT_APP_USE_SECURE_FUNCTIONS=true
# REACT_APP_FUNCTIONS_REGION=asia-southeast2
```

## Lisensi

Proyek internal — PT Solusi Kelola Risiko.
