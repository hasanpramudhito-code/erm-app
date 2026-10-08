# Keamanan Role — Cloud Functions (Belum Deploy)

Modul keamanan sudah disiapkan di `functions/` tetapi **sengaja tidak di-deploy**.
Aplikasi tetap berjalan mode legacy sampai Anda mengaktifkannya manual.

## Apa yang sudah dibuat

### Backend (`functions/`)

| Function | Tipe | Fungsi |
|----------|------|--------|
| `onUserCreated` | Auth trigger | Set role `STAFF` + custom claims saat user baru |
| `createUserWithRole` | Callable | Admin buat user + sync claims |
| `updateUserRole` | Callable | Admin ubah role + sync claims |
| `updateUserSecure` | Callable | Admin update profil + role + status |
| `deactivateUser` | Callable | Admin nonaktifkan user di Auth & Firestore |
| `deleteUser` | Callable | SUPER_ADMIN hapus user permanen |
| `refreshMyClaims` | Callable | User sync JWT claims dari Firestore |
| `getAuditLogs` | Callable | Admin baca audit log |
| `setAdminClaims` | HTTP | SUPER_ADMIN promote ke ADMIN |
| `cleanupRateLimits` | Scheduled | Bersihkan rate limit records |

Modul pendukung:
- `functions/shared/roles.js` — definisi role terpusat
- `functions/shared/securityHelpers.js` — validasi, audit, sync claims
- `functions/security/userFunctions.js` — callable user management

### Frontend (`src/`)

| File | Fungsi |
|------|--------|
| `config/securityConfig.js` | Feature flag & daftar role per halaman |
| `services/userSecurityService.js` | Wrapper `httpsCallable` ke functions |
| `components/RoleProtectedRoute.js` | Guard route berdasarkan role |
| `pages/UserManagement.js` | Dual mode: legacy / secure |

## Status saat ini

```
REACT_APP_USE_SECURE_FUNCTIONS=false   ← default, functions TIDAK dipanggil
```

- User management tetap langsung ke Firebase Auth + Firestore (seperti sebelumnya)
- `RoleProtectedRoute` sudah aktif untuk halaman admin (tanpa perlu deploy functions)
- Banner peringatan muncul di halaman User Management

## Cara deploy (nanti, saat siap)

### 1. Siapkan service account

```bash
# Simpan private key sebagai:
functions/serviceAccountKey.json
```

### 2. Deploy functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 3. Aktifkan mode aman di frontend

Tambahkan ke `.env.local` atau `.env.production`:

```env
REACT_APP_USE_SECURE_FUNCTIONS=true
REACT_APP_FUNCTIONS_REGION=asia-southeast2
```

Rebuild & deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

### 4. (Opsional) Test lokal dengan emulator

```bash
# Terminal 1
firebase emulators:start --only functions

# .env.local
REACT_APP_USE_SECURE_FUNCTIONS=true
REACT_APP_USE_FUNCTIONS_EMULATOR=true
```

## Sinkronisasi role

Setelah deploy, alur yang benar:

1. Admin ubah role via User Management → `updateUserSecure` / `createUserWithRole`
2. Cloud Function menulis Firestore **dan** `setCustomUserClaims`
3. Firestore rules (`request.auth.token.role`) dan UI selaras
4. User yang diubah role-nya bisa panggil `refreshMyClaims` atau login ulang

## Role yang didukung

`STAFF`, `RISK_OWNER`, `RISK_MANAGER`, `DIRECTOR`, `COMPLIANCE_OFFICER`, `ADMIN`, `SUPER_ADMIN`

- **ADMIN** boleh assign semua role kecuali `SUPER_ADMIN`
- **SUPER_ADMIN** boleh assign semua role termasuk `SUPER_ADMIN`

## Halaman dengan proteksi route

| Route | Role yang diizinkan |
|-------|---------------------|
| `/user-management` | ADMIN, SUPER_ADMIN |
| `/database-management` | ADMIN, SUPER_ADMIN |
| `/api-integration` | ADMIN, SUPER_ADMIN |
| `/executive-dashboard` | ADMIN, SUPER_ADMIN, DIRECTOR, RISK_MANAGER |
