# Adendum Versi 2: Spesifikasi Aplikasi Manajemen Risiko

**Tanggal:** 9 Oktober 2026
**Melengkapi:** `HANDOFF_spesifikasi_aplikasi_risiko.md` (versi 1)

Dokumen ini hanya memuat **perubahan dan tambahan** terhadap versi 1. Untuk bagian yang tidak disebut di sini, versi 1 tetap berlaku. Jika ada isi yang bertentangan, **adendum ini yang berlaku**.

Rujukan nomor bagian mengikuti versi 1.

---

## A. Instruksi Tambahan untuk Agent (menambah bagian 0)

6. Istilah umum untuk pemilik risiko di aplikasi adalah **"Unit Kerja"**. Jangan memakai kata "Unit" saja, karena di organisasi klien "Unit" berarti jenis kantor wilayah tertentu (lihat butir C).
7. Seluruh penyebutan `unit` / `unit_id` di versi 1 dibaca sebagai `unit_kerja` / `unit_kerja_id`.

---

## B. Identitas Klien (menambah bagian 1)

- Calon klien: **Perumda Air Minum Tirta Tuah Benua Kutai Timur**.
- Struktur organisasi mengacu pada **Peraturan Bupati Kutai Timur Nomor 53 Tahun 2021** tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi serta Tata Kerja.
- Kantor wilayah terdiri dari **Cabang** dan **Unit**.
- Fungsi produksi dan distribusi di Pusat bersifat **perencanaan, pembinaan, dan pengawasan**. Operasionalnya ada di Cabang/Unit.

---

## C. Struktur Organisasi (mengganti seluruh bagian 4)

### C.1 Struktur menurut Perbup Kutai Timur No. 53/2021

```
KPM (Kuasa Pemilik Modal)                 ── tidak memiliki akun
Dewan Pengawas                            ── tidak memiliki akun
│
Direktur Utama
├── Manajer Satuan Pengawas Intern (SPI)
│   ├── Asisten Manajer Manajemen Risiko  ── PENGELOLA RISIKO PUSAT
│   └── Asisten Manajer Auditor
├── Tenaga Ahli                           ── tidak memiliki akun
├── Cabang (beberapa)
├── Unit (beberapa)                       ── diperlakukan sama dengan Cabang
├── Direktur Umum
│   ├── Manajer Umum
│   │   ├── Asisten Manajer Umum
│   │   ├── Asisten Manajer Hubungan Langganan
│   │   ├── Asisten Manajer Kepegawaian
│   │   ├── Asisten Manajer Humas dan Protokol
│   │   └── Asisten Manajer Hukum dan Keamanan
│   └── Manajer Keuangan
│       ├── Asisten Manajer Perencanaan Anggaran
│       ├── Asisten Manajer Pembukuan
│       └── Asisten Manajer Kas dan Penagihan
└── Direktur Teknik
    ├── Manajer Teknik
    │   ├── Asisten Manajer Perencanaan dan Pengawasan
    │   ├── Asisten Manajer Transmisi dan Distribusi
    │   └── Asisten Manajer Pengembangan Sistem Informasi Manajemen
    └── Manajer Produksi
        ├── Asisten Manajer Produksi
        ├── Asisten Manajer Perawatan Teknik
        └── Asisten Manajer Laboratorium
```

### C.2 Aturan pemetaan ke aplikasi

- **Unit kerja pemilik risiko di Pusat berada di tingkat Manajer (Bagian).** Ada 5 bagian: SPI, Umum, Keuangan, Teknik, Produksi.
- **Sub-bagian (Asisten Manajer) tetap disimpan dalam hierarki** melalui `induk_id`, tetapi tidak memegang register sendiri. Pengguna dari sub-bagian menginput ke register bagian induknya. Hierarki ini disimpan supaya tingkat pemilik risiko dapat diubah lewat pengaturan di kemudian hari.
- **Cabang dan Unit diperlakukan sama.** Keduanya wajib mengisi risiko utama CABANG, ikut dalam agregasi, dan memakai alur persetujuan yang sama.
- **Fungsi manajemen risiko berada di SPI.** Peran Pengelola Risiko Pusat dipegang oleh Asisten Manajer Manajemen Risiko.

### C.3 Pemilik risiko tingkat direksi

| Direktur (pemilik risiko) | Unit kerja di bawahnya |
|---|---|
| Direktur Utama | Seluruh Cabang, seluruh Unit, Satuan Pengawas Intern |
| Direktur Umum | Bagian Umum, Bagian Keuangan |
| Direktur Teknik | Bagian Teknik, Bagian Produksi |

**Perubahan dari versi 1:** SPI berada di bawah Direktur Utama, tidak di bawah Direktur Umum atau Direktur Teknik.

---

## D. Aturan Bisnis Risiko (mengubah bagian 5)

**D.1 Mengubah 5.1 (Risiko Utama)**
- Risiko utama CABANG wajib diisi oleh seluruh Cabang **dan Unit**. Entri draf otomatis dibentuk untuk setiap kombinasi (Cabang/Unit) × risiko utama CABANG.
- `berlaku_untuk = CABANG` mencakup unit kerja berjenis CABANG dan UNIT.
- Risiko utama PUSAT dipilih oleh **bagian** Pusat.
- **Tambahan:** risiko utama PUSAT untuk Bagian Teknik dan Bagian Produksi dirumuskan dari sisi perencanaan, pembinaan, dan pengawasan. Tujuannya agar tidak tumpang tindih dengan risiko utama CABANG yang bersifat operasional.

**D.2 Mengubah 5.4 (Batasan Entri)**
- Unique constraint menjadi (`periode_id`, `unit_kerja_id`, `risiko_utama_id`).
- `unit_kerja_id` pada tabel `risiko` harus menunjuk ke unit kerja dengan `pemilik_risiko = true`.

---

## E. Alur Persetujuan (mengganti bagian 7)

### E.1 Alur dua tingkat (default)
```
DRAF → DIAJUKAN → DISETUJUI_PIMPINAN → FINAL
           ▲              │                │
           └── DIKEMBALIKAN (dengan catatan) ◄┘
```

| Unit kerja | Penginput | Tingkat 1 (pimpinan) | Tingkat 2 (verifikasi final) |
|---|---|---|---|
| Cabang / Unit | Petugas risiko Cabang/Unit | Kepala Cabang / Kepala Unit | Asisten Manajer Manajemen Risiko |
| Bagian Umum, Keuangan, Teknik, Produksi | Asisten Manajer atau staf di bagian tersebut **[ASUMSI]** | Manajer Bagian | Asisten Manajer Manajemen Risiko |

### E.2 Alur satu tingkat (baru, untuk SPI)
- Asisten Manajer Manajemen Risiko adalah bawahan Manajer SPI, sehingga tidak tepat memverifikasi persetujuan atasannya sendiri.
- **Keputusan klien:** untuk register risiko SPI, persetujuan Manajer SPI langsung menjadi FINAL (`DRAF → DIAJUKAN → FINAL`).
- Diterapkan melalui pengaturan per unit kerja (`alur_persetujuan = SATU_TINGKAT`), bukan ditulis khusus untuk SPI di dalam kode.

### E.3 Ketentuan umum
- Setelah FINAL, data dikunci. Perubahan memerlukan pembukaan kembali oleh Pengelola Risiko Pusat, atau melalui mekanisme revisi. **Untuk SPI, pembukaan kembali dilakukan oleh Manajer SPI.**
- Antrean verifikasi bulanan dan pencatatan riwayat persetujuan tetap seperti versi 1.

---

## F. Peran dan Hak Akses (mengganti tabel peran di bagian 8)

| Peran | Pemegang jabatan (contoh) | Cakupan data | Kewenangan utama |
|---|---|---|---|
| Administrator Sistem | Ditunjuk klien | Seluruh | Kelola pengguna, unit kerja, periode, parameter |
| Direksi | Direktur Utama, Direktur Umum, Direktur Teknik | Seluruh | Akses penuh, termasuk mengubah data |
| Pengelola Risiko Pusat | Asisten Manajer Manajemen Risiko (SPI) | Seluruh unit kerja | Susun risiko utama dan pustaka, verifikasi final (kecuali SPI), buka kunci, lihat agregasi |
| **Auditor Internal (baru)** | Asisten Manajer Auditor (SPI) | Seluruh unit kerja, **hanya baca** | Melihat register, riwayat persetujuan, dan jejak audit; tidak dapat mengubah atau memverifikasi |
| Pimpinan Unit Kerja | Manajer Bagian, Kepala Cabang, Kepala Unit | Unit kerjanya sendiri | Persetujuan tingkat 1 (untuk SPI: persetujuan final) |
| Petugas Risiko | Asisten Manajer/staf di bagian, petugas di Cabang/Unit | Unit kerjanya sendiri | Input penetapan, pemantauan, mitigasi |

**Tambahan ketentuan:**
- Peran Pimpinan Unit Pusat dan Pimpinan Cabang di versi 1 digabung menjadi **Pimpinan Unit Kerja**. Peran Petugas Risiko Unit Pusat dan Petugas Risiko Cabang digabung menjadi **Petugas Risiko**.
- **KPM, Dewan Pengawas, dan Tenaga Ahli tidak memiliki akun.** Kebutuhan informasi mereka dipenuhi melalui laporan yang diekspor.
- Pengguna dari sub-bagian memiliki cakupan data **bagian induknya**.
- Auditor Internal dipisahkan dari Pengelola Risiko agar fungsi audit (lini ketiga) tidak ikut mengubah atau memverifikasi data manajemen risiko (lini kedua), meskipun keduanya berada dalam satu unit SPI.
- Kode peran: `ADMIN`, `DIREKSI`, `PENGELOLA_RISIKO`, `AUDITOR`, `PIMPINAN`, `PETUGAS`.

---

## G. Perubahan Skema Database (mengubah bagian 9)

### G.1 Tabel yang diganti

**`unit` diganti menjadi `unit_kerja`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| kode | teks, unik | |
| nama | teks | |
| jenis | enum: BAGIAN / SUB_BAGIAN / CABANG / UNIT | **Baru** (versi 1: PUSAT/CABANG) |
| induk_id | FK ke `unit_kerja`, nullable | **Baru**, self-reference untuk hierarki Bagian → Sub-bagian |
| direktorat_id | FK ke `direktorat` | |
| pemilik_risiko | boolean | **Baru**, menandai unit kerja yang memegang register |
| adalah_pengelola_risiko | boolean | |
| alur_persetujuan | enum: DUA_TINGKAT / SATU_TINGKAT, nullable | **Baru**, hanya diisi untuk unit kerja pemilik risiko |
| aktif | boolean | |

### G.2 Tabel yang diubah

| Tabel | Perubahan |
|---|---|
| `pengguna` | `unit_id` → `unit_kerja_id` (boleh sub-bagian); tambahan kolom `jabatan`. Cakupan data mengikuti unit kerja pemilik risiko terdekat ke atas |
| `peran` | Isi sesuai kode peran pada butir F |
| `risiko` | `unit_id` → `unit_kerja_id` |

### G.3 Data awal (seed)

**Direktorat**

| Kode | Nama | Jabatan direktur |
|---|---|---|
| DIR-UT | Direktorat Utama | Direktur Utama |
| DIR-UM | Direktorat Umum | Direktur Umum |
| DIR-TK | Direktorat Teknik | Direktur Teknik |

**Unit kerja** (kode bersifat usulan; sesuaikan bila klien memiliki kode sendiri)

| Kode | Nama | Jenis | Induk | Direktorat | Pemilik risiko | Pengelola risiko | Alur persetujuan |
|---|---|---|---|---|---|---|---|
| SPI | Satuan Pengawas Intern | BAGIAN | — | DIR-UT | Ya | Tidak | SATU_TINGKAT |
| SPI-MR | Manajemen Risiko | SUB_BAGIAN | SPI | DIR-UT | Tidak | **Ya** | — |
| SPI-AUD | Auditor | SUB_BAGIAN | SPI | DIR-UT | Tidak | Tidak | — |
| UMM | Bagian Umum | BAGIAN | — | DIR-UM | Ya | Tidak | DUA_TINGKAT |
| UMM-UM | Umum | SUB_BAGIAN | UMM | DIR-UM | Tidak | Tidak | — |
| UMM-HL | Hubungan Langganan | SUB_BAGIAN | UMM | DIR-UM | Tidak | Tidak | — |
| UMM-KPG | Kepegawaian | SUB_BAGIAN | UMM | DIR-UM | Tidak | Tidak | — |
| UMM-HMS | Humas dan Protokol | SUB_BAGIAN | UMM | DIR-UM | Tidak | Tidak | — |
| UMM-HKM | Hukum dan Keamanan | SUB_BAGIAN | UMM | DIR-UM | Tidak | Tidak | — |
| KEU | Bagian Keuangan | BAGIAN | — | DIR-UM | Ya | Tidak | DUA_TINGKAT |
| KEU-ANG | Perencanaan Anggaran | SUB_BAGIAN | KEU | DIR-UM | Tidak | Tidak | — |
| KEU-BUK | Pembukuan | SUB_BAGIAN | KEU | DIR-UM | Tidak | Tidak | — |
| KEU-KAS | Kas dan Penagihan | SUB_BAGIAN | KEU | DIR-UM | Tidak | Tidak | — |
| TEK | Bagian Teknik | BAGIAN | — | DIR-TK | Ya | Tidak | DUA_TINGKAT |
| TEK-REN | Perencanaan dan Pengawasan | SUB_BAGIAN | TEK | DIR-TK | Tidak | Tidak | — |
| TEK-TD | Transmisi dan Distribusi | SUB_BAGIAN | TEK | DIR-TK | Tidak | Tidak | — |
| TEK-SIM | Pengembangan Sistem Informasi Manajemen | SUB_BAGIAN | TEK | DIR-TK | Tidak | Tidak | — |
| PRD | Bagian Produksi | BAGIAN | — | DIR-TK | Ya | Tidak | DUA_TINGKAT |
| PRD-PRD | Produksi | SUB_BAGIAN | PRD | DIR-TK | Tidak | Tidak | — |
| PRD-RWT | Perawatan Teknik | SUB_BAGIAN | PRD | DIR-TK | Tidak | Tidak | — |
| PRD-LAB | Laboratorium | SUB_BAGIAN | PRD | DIR-TK | Tidak | Tidak | — |
| CAB-xx | Cabang ... | CABANG | — | DIR-UT | Ya | Tidak | DUA_TINGKAT |
| UNT-xx | Unit ... | UNIT | — | DIR-UT | Ya | Tidak | DUA_TINGKAT |

Daftar Cabang dan Unit **[BELUM DIPUTUSKAN: menunggu jumlah dan nama dari klien]**. Selama pengembangan, gunakan data contoh.

---

## H. Arsitektur dan Deployment (mengubah bagian 3)

**Docker bersifat opsional, bukan keharusan.** Ketentuan ini mengganti baris Deployment di tabel 3.2 versi 1.

Aplikasi dirancang agar tidak bergantung pada Docker:
- Seluruh konfigurasi melalui environment variable (`.env.example` disediakan).
- Migrasi database melalui ORM.
- Lokasi penyimpanan file unggahan dapat dikonfigurasi.
- Docker boleh dipakai di lingkungan pengembangan, misalnya untuk menjalankan database lokal.

Paket serah terima menyediakan **dua opsi instalasi**, dan klien memilih sesuai kondisinya:

| Opsi | Komponen |
|---|---|
| Native — Linux | Node.js, database, Nginx, PM2 atau systemd |
| Native — Windows | Node.js, database, IIS atau Nginx, Windows Service |
| Docker Compose | Aplikasi, database, reverse proxy |

**Tambahan pada 3.3:** pertanyaan teknis untuk klien sebaiknya diajukan ke **Asisten Manajer Pengembangan Sistem Informasi Manajemen** (Bagian Teknik). Fungsi ini kemungkinan besar akan menjadi penerima serah terima teknis dan sebaiknya dilibatkan sejak awal.

---

## I. Tahapan Pengerjaan (mengubah bagian 10)

| Tahap | Tambahan atau perubahan |
|---|---|
| 3. Finalisasi skema | Tambahan: siapkan file seed unit kerja dan direktorat (butir G.3) |
| 4. Fondasi backend | Tambahan: RBAC dengan cakupan data melalui hierarki unit kerja; konfigurasi berbasis environment variable. Docker Compose hanya untuk pengembangan |
| 6. Fitur baru | Tambahan: pembentukan entri otomatis mencakup Cabang dan Unit; alur persetujuan dua tingkat dan satu tingkat; ekspor laporan (untuk pihak tanpa akun) |
| 7. Serah terima | Perubahan: paket instalasi berisi opsi native dan Docker Compose |

---

## J. Daftar Butir Terbuka (mengubah bagian 12)

**Butir yang diubah:**

| No | Butir | Status |
|---|---|---|
| 2 | OS server dan izin Docker (kini menentukan opsi instalasi yang diprioritaskan, bukan syarat) | BELUM DIPUTUSKAN |
| 5 | Jumlah pengguna; **jumlah dan nama Cabang dan Unit** | BELUM DIPUTUSKAN |

**Butir baru:**

| No | Butir | Status |
|---|---|---|
| 9 | Siapa yang memegang peran Administrator Sistem di klien | BELUM DIPUTUSKAN |
| 10 | Asisten Manajer di bagian Pusat sebagai penginput, Manajer sebagai penyetuju tingkat 1 | ASUMSI |

**Keputusan yang ditetapkan pada versi 2:**

| Butir | Keputusan |
|---|---|
| Tingkat unit kerja pemilik risiko di Pusat | Tingkat Manajer (Bagian) |
| Perlakuan Unit (kantor wilayah) | Sama dengan Cabang |
| Verifikator final risiko SPI | Manajer SPI (alur satu tingkat) |
| Fungsi produksi dan distribusi di Pusat | Perencanaan, pembinaan, pengawasan; operasional di Cabang/Unit |
| Akun untuk KPM, Dewan Pengawas, Tenaga Ahli | Tidak ada |
| Nama sub-bagian "Hubungan" | Hubungan Langganan |
| Docker | Opsional; dua opsi instalasi disediakan |
