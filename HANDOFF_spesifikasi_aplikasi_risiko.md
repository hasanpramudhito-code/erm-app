# Handoff: Pengembangan Ulang Aplikasi Manajemen Risiko untuk Calon Klien

Dokumen ini merangkum hasil diskusi perencanaan sebelum pengerjaan di IDE. Ditujukan sebagai konteks kerja bagi agent pengembang. Bahasa antarmuka dan istilah domain menggunakan Bahasa Indonesia.

---

## 0. Instruksi untuk Agent

1. **Jangan langsung menulis ulang kode.** Mulai dari Tahap 2 (inventaris kode) di bagian 9, laporkan hasilnya ke pengguna, baru lanjut.
2. Kerjakan **bertahap per modul**. Setiap tahap diakhiri dengan konfirmasi ke pengguna.
3. Butir bertanda **[BELUM DIPUTUSKAN]** jangan diasumsikan; tanyakan ke pengguna bila tahap kerja memerlukannya.
4. Butir bertanda **[ASUMSI]** boleh dipakai sebagai default, tetapi sebutkan ke pengguna saat diterapkan.
5. Parameter penilaian (skala kemungkinan, skala dampak, matriks, level risiko) **sudah ada di aplikasi eksisting**. Pertahankan dan sesuaikan strukturnya, jangan merancang ulang dari nol.

---

## 1. Latar Belakang

- Pemilik aplikasi memiliki web app manajemen risiko yang **belum berjalan di produksi** (tidak ada data riil yang perlu dimigrasi).
- Seorang **calon klien** meminta penyesuaian besar sesuai konteks organisasinya.
- Calon klien: **perusahaan penyediaan air bersih perpipaan** dengan struktur **Kantor Pusat dan Kantor Cabang**. Cabang menjalankan proses bisnis inti yang sama (produksi dan distribusi air); unit Pusat menjalankan fungsi pendukung.
- Model bisnis: **jual putus**. Aplikasi diserahkan sepenuhnya dan **dipasang on-premise di server klien**.
- Klien meminta backend mandiri agar **database dapat dikelola sendiri** oleh tim TI mereka.

---

## 2. Kondisi Teknis Saat Ini

- Frontend: **React, kemungkinan Next.js** (perlu diverifikasi dari `package.json`).
- Backend: **Firebase** (layanan yang dipakai perlu diinventarisasi: Authentication, Firestore, Storage, Cloud Functions, Hosting).

---

## 3. Keputusan Arsitektur

### 3.1 Keputusan yang sudah diambil
- **Migrasi penuh** dari Firebase ke backend dan database mandiri. Tidak ada pendekatan hibrida; setelah serah terima, aplikasi tidak boleh bergantung pada layanan cloud milik pengembang.
- **Migrasi backend dan penyesuaian kebutuhan klien dikerjakan bersamaan per modul**, bukan dua proyek terpisah. Skema database dirancang langsung sesuai kebutuhan akhir (bukan memindahkan struktur Firestore apa adanya).
- Prioritas rancangan: **mudah dikelola tim TI klien** (teknologi umum, database relasional standar, instalasi yang dapat diulang, dokumentasi serah terima, seluruh dependensi berlisensi terbuka).

### 3.2 Usulan arsitektur (rekomendasi, belum final)

| Komponen | Saat ini | Usulan pengganti |
|---|---|---|
| Database | Firestore | PostgreSQL atau MySQL/MariaDB **[BELUM DIPUTUSKAN: mengikuti kompetensi tim TI klien]** |
| Akses data | Firebase SDK di frontend | Next.js full-stack (Route Handlers / Server Actions) + ORM (Prisma atau Drizzle) |
| Autentikasi | Firebase Authentication | Auth.js atau sesi sendiri; opsi LDAP/Active Directory **[BELUM DIPUTUSKAN]** |
| Otorisasi | Firestore Security Rules | Role-based access control, ditegakkan di sisi server |
| Penyimpanan file | Firebase Storage | Disk server lokal atau MinIO |
| Deployment | Firebase Hosting | Docker Compose (aplikasi, database, reverse proxy) |

Alternatif: backend terpisah (NestJS/Laravel) bila tim TI klien terbiasa dengan teknologi tertentu atau akan ada aplikasi lain (mobile) yang memakai API yang sama.

### 3.3 Hal teknis yang perlu dikonfirmasi ke klien **[BELUM DIPUTUSKAN]**
1. Database yang dikuasai tim TI klien (PostgreSQL, MySQL/MariaDB, SQL Server).
2. Sistem operasi server (Linux/Windows) dan apakah Docker diizinkan.
3. Kebutuhan login terpusat (Active Directory/LDAP).
4. Akses jaringan: internal saja atau juga dari luar.
5. Perkiraan jumlah pengguna dan jumlah cabang/unit.

---

## 4. Struktur Organisasi

```
Perusahaan
├── Direktorat Utama (Direktur Utama)
│   └── Seluruh Kantor Cabang
├── Direktorat Umum (Direktur Umum)
│   └── Unit Pusat tertentu
└── Direktorat Teknik (Direktur Teknik)
    └── Unit Pusat tertentu
```

- Dua jenis unit: **PUSAT** dan **CABANG**. Unit Pusat **tidak membawahi** cabang.
- Unit Pusat dan cabang setara sebagai **unit pemilik risiko**; penilaian, penyebab, mitigasi, dan alur persetujuan dibangun satu kali untuk semua unit.
- Salah satu unit Pusat adalah **pengelola risiko Pusat** (verifikator).
- Pemilik risiko di tingkat Pusat adalah direktur pembina: cabang → Direktur Utama; unit Pusat → Direktur Umum atau Direktur Teknik.

---

## 5. Aturan Bisnis Risiko

### 5.1 Risiko Utama
- Disusun oleh Pusat sebagai daftar referensi, dengan atribut `berlaku_untuk` = **CABANG** atau **PUSAT**.
- **Risiko utama CABANG**: wajib bagi seluruh cabang (proses bisnis inti sama). Saat periode dibuka, **sistem otomatis membentuk entri draf** untuk setiap kombinasi cabang × risiko utama CABANG. Pemiliknya otomatis Direktorat Utama.
- **Risiko utama PUSAT**: dipilih unit Pusat melalui **dropdown** saat input risk register (proses bisnis antarunit Pusat berbeda). Dapat dipilih lebih dari satu unit dan **diagregasi** bila demikian.
- **[ASUMSI]** Pemilik hasil agregasi risiko utama PUSAT ditetapkan **pada risiko utama itu sendiri** (`direktorat_pemilik_id`) saat Pusat menyusunnya.

### 5.2 Risiko Spesifik
- Setiap unit (cabang maupun Pusat) boleh menambah risiko sendiri di luar daftar risiko utama (`risiko_utama_id` kosong).
- **Tidak diagregasi**, tetapi tetap tampil di risk register keseluruhan.
- Melalui alur persetujuan yang sama.

### 5.3 Penyebab dan Dampak
- Pusat menyediakan **pustaka penyebab dan dampak** per risiko utama.
- Unit boleh memilih dari pustaka **atau** merumuskan sendiri sesuai kondisinya.
- Satu entri risiko dapat memiliki **banyak penyebab** (dan dampak).
- Saat dipilih dari pustaka, teks **disalin** ke kolom `uraian` (agar data historis tidak berubah bila pustaka diubah), dan rujukan ke pustaka tetap disimpan (untuk analisis penyebab yang paling banyak dipilih lintas cabang).

### 5.4 Batasan Entri
- **Satu unit, satu entri per risiko utama per periode.** Ditegakkan sebagai unique constraint pada (`periode_id`, `unit_id`, `risiko_utama_id`) di tingkat database.

### 5.5 Penilaian dan Pemantauan
| Lapisan | Frekuensi | Isi |
|---|---|---|
| Penetapan risiko | Sekali per periode (tahunan) | Identifikasi, penyebab, dampak, penilaian **inheren** dan **target**, rencana mitigasi |
| Pemantauan | **Bulanan** | Penilaian **residual**, realisasi mitigasi, catatan perkembangan |

### 5.6 Revisi di Tengah Periode
- Penilaian inheren, penyebab, dan rencana mitigasi **boleh direvisi** di tengah periode.
- Revisi dicatat sebagai **versi baru** (salinan kondisi sebelumnya disimpan) dan melalui alur persetujuan yang sama.
- Selama revisi belum final, data yang berlaku (termasuk untuk agregasi) tetap versi sebelumnya.

---

## 6. Logika Agregasi

Dihitung **per risiko utama**, **per periode**, dan **per jenis penilaian**:
- Inheren dan target: sekali per periode.
- Residual: **per bulan**.

Hanya entri/laporan berstatus **FINAL** yang dihitung. Berlaku untuk risiko utama CABANG maupun PUSAT. Jika hanya satu unit, hasil agregasi sama dengan penilaian unit tersebut.

### 6.1 Nilai utama (Opsi B2: modus sel matriks)
1. Kumpulkan pasangan (kemungkinan, dampak) dari seluruh entri final.
2. Hitung frekuensi setiap pasangan.
3. Ambil pasangan dengan frekuensi terbesar.
4. Jika seri: ambil **skor (kemungkinan × dampak) terbesar**; jika masih seri, ambil **dampak terbesar**.

### 6.2 Nilai pendamping (Opsi A)
- Modus kemungkinan dan modus dampak dihitung **terpisah**; seri diambil **nilai tertinggi**.
- Ditampilkan sebagai informasi pembanding, bukan nilai resmi.

### 6.3 Informasi pendukung (ditampilkan di tingkat Pusat)
- Sebaran jumlah entri per level risiko.
- Nilai tertinggi beserta nama unitnya.
- Penanda bila ada unit yang penilaiannya jauh di atas nilai modus.
- Kelengkapan: jumlah unit berstatus final dibanding unit yang seharusnya menginput (contoh: 10 dari 12 cabang).

### 6.4 Pseudocode
```
fungsi agregasi(entri_final):
    jika kosong: kembalikan null
    frek = hitung frekuensi tiap (k, d)
    maks = frekuensi terbesar
    kandidat = semua (k, d) dengan frekuensi == maks
    urutkan kandidat menurut (k*d menurun, d menurun)
    nilai_utama = kandidat[0]

    modus_k = modus(k) dengan seri → nilai tertinggi
    modus_d = modus(d) dengan seri → nilai tertinggi

    kembalikan {nilai_utama, modus_k, modus_d,
                sebaran_level, nilai_tertinggi_dan_unit,
                jumlah_final, jumlah_seharusnya}
```

Hasil agregasi **dihitung dari data unit** (saat ditampilkan, atau disimpan sebagai hasil hitung yang diperbarui otomatis setiap ada verifikasi final), **tidak pernah diinput manual**.

---

## 7. Alur Persetujuan

Berlaku untuk: penetapan risiko (risiko utama dan spesifik), **laporan pemantauan bulanan**, dan **revisi**.

```
DRAF → DIAJUKAN → DISETUJUI_PIMPINAN → FINAL
           ▲              │                │
           └── DIKEMBALIKAN (dengan catatan) ◄┘
```

- Tingkat 1: **pimpinan unit** (pimpinan cabang atau pimpinan unit Pusat).
- Tingkat 2: **pengelola risiko Pusat** (verifikasi final).
- Setelah FINAL, data **dikunci**; perubahan memerlukan pembukaan kembali oleh pengelola risiko Pusat (atau melalui mekanisme revisi).
- Tampilan pengelola risiko Pusat perlu menyediakan **antrean verifikasi per bulan** beserta status setiap unit.

---

## 8. Peran dan Hak Akses

| Peran | Cakupan data | Kewenangan utama |
|---|---|---|
| Administrator Sistem | Seluruh | Kelola pengguna, unit, periode, parameter |
| Direksi (Direktur Utama, Direktur Umum, Direktur Teknik) | Seluruh | **Akses penuh**, termasuk mengubah data |
| Pengelola Risiko Pusat | Seluruh unit dan cabang | Susun risiko utama dan pustaka, verifikasi final, buka kunci, lihat agregasi |
| Pimpinan Unit Pusat | Unitnya sendiri | Persetujuan tingkat 1 |
| Petugas Risiko Unit Pusat | Unitnya sendiri | Input penetapan, pemantauan, mitigasi |
| Pimpinan Cabang | Cabangnya sendiri | Persetujuan tingkat 1 |
| Petugas Risiko Cabang | Cabangnya sendiri | Input penetapan, pemantauan, mitigasi |

- Satu pengguna dapat memiliki lebih dari satu peran.
- Seluruh pembatasan akses **ditegakkan di sisi server**, bukan hanya di tampilan.
- **Pengaman akses Direksi:** seluruh tindakan Direksi tercatat di `jejak_audit`; perubahan atas data yang sudah FINAL oleh Direksi memunculkan **penanda "diubah oleh Direksi"** pada entri tersebut.

---

## 9. Draf Skema Database

Konvensi: nama tabel dan kolom snake_case Bahasa Indonesia. Setiap tabel memiliki `id`, `dibuat_pada`, `diubah_pada` (tidak ditulis ulang di bawah). Struktur parameter penilaian disesuaikan dengan aplikasi eksisting.

### A. Organisasi dan Pengguna
| Tabel | Kolom utama |
|---|---|
| `direktorat` | kode, nama, nama_jabatan_direktur |
| `unit` | kode, nama, jenis (PUSAT/CABANG), direktorat_id, adalah_pengelola_risiko, aktif |
| `pengguna` | nama, email, kata_sandi_hash, unit_id, aktif |
| `peran` | kode, nama |
| `pengguna_peran` | pengguna_id, peran_id |

### B. Parameter
| Tabel | Kolom utama |
|---|---|
| `periode` | nama, tanggal_mulai, tanggal_selesai, status (TERBUKA/DITUTUP) |
| `skala_kemungkinan` | nilai, label, deskripsi *(sesuaikan eksisting)* |
| `skala_dampak` | nilai, label, deskripsi *(sesuaikan eksisting)* |
| `level_risiko` | nama, skor_min, skor_maks, warna *(sesuaikan eksisting)* |
| `kategori_risiko` | kode, nama |

### C. Risiko Utama dan Pustaka
| Tabel | Kolom utama |
|---|---|
| `risiko_utama` | kode, nama, deskripsi, kategori_id, berlaku_untuk (CABANG/PUSAT), direktorat_pemilik_id, aktif |
| `pustaka_penyebab` | risiko_utama_id, uraian, aktif |
| `pustaka_dampak` | risiko_utama_id, uraian, aktif |

### D. Risk Register
| Tabel | Kolom utama | Catatan |
|---|---|---|
| `risiko` | periode_id, unit_id, risiko_utama_id (nullable), kode, nama, deskripsi, kategori_id, status_persetujuan, versi_aktif, diubah_direksi (boolean) | UNIQUE (periode_id, unit_id, risiko_utama_id) bila risiko_utama_id tidak null |
| `risiko_penyebab` | risiko_id, pustaka_penyebab_id (nullable), uraian | |
| `risiko_dampak` | risiko_id, pustaka_dampak_id (nullable), uraian | |
| `penilaian` | risiko_id, jenis (INHEREN/TARGET), kemungkinan, dampak, skor, level_id | Hanya inheren dan target |
| `pemantauan_bulanan` | risiko_id, tahun, bulan, kemungkinan_residual, dampak_residual, skor, level_id, catatan, status_persetujuan | UNIQUE (risiko_id, tahun, bulan) |
| `mitigasi` | risiko_id, uraian, penanggung_jawab, target_waktu, status | |
| `realisasi_mitigasi` | mitigasi_id, pemantauan_bulanan_id, tanggal, uraian, progres | |
| `revisi_risiko` | risiko_id, nomor_revisi, alasan_revisi, salinan_data (JSON), status_persetujuan, diajukan_oleh, waktu | |

### E. Persetujuan, Jejak Audit, Lampiran
| Tabel | Kolom utama |
|---|---|
| `riwayat_persetujuan` | entitas (RISIKO/PEMANTAUAN/REVISI), entitas_id, dari_status, ke_status, pengguna_id, catatan, waktu |
| `jejak_audit` | nama_tabel, id_data, aksi, nilai_lama (JSON), nilai_baru (JSON), pengguna_id, waktu |
| `lampiran` | entitas, entitas_id, nama_file, lokasi_file, diunggah_oleh, waktu |

---

## 10. Tahapan Pengerjaan

| Tahap | Kegiatan | Keluaran |
|---|---|---|
| 1. Analisis kebutuhan | **Selesai** (dokumen ini) | Rancangan kebutuhan |
| 2. Inventaris kode | Verifikasi stack (`package.json`, struktur folder); inventaris seluruh titik pemanggilan Firebase (Auth, Firestore, Storage, Functions); petakan modul eksisting; pelajari struktur parameter penilaian eksisting | Laporan inventaris dan estimasi besarnya pekerjaan |
| 3. Finalisasi skema | Sesuaikan draf skema di bagian 9 dengan temuan tahap 2; pilih database dan ORM | Skema final dan file migrasi |
| 4. Fondasi backend | Database, ORM, autentikasi, RBAC, penyimpanan file, jejak audit, Docker Compose | Kerangka aplikasi yang dapat dijalankan |
| 5. Pemindahan modul | Pindahkan modul eksisting ke backend baru satu per satu sambil menerapkan aturan bisnis bagian 5 | Modul inti berjalan |
| 6. Fitur baru | Pembentukan entri otomatis, agregasi, pemantauan bulanan, alur persetujuan, revisi, antrean verifikasi, dashboard Pusat dan Direksi | Aplikasi lengkap |
| 7. Serah terima | Paket instalasi, prosedur backup dan restore, dokumentasi teknis dan pengguna | Siap dipasang di server klien |

---

## 11. Catatan Bisnis

- Daftar kebutuhan ini sebaiknya menjadi dasar **kesepakatan lingkup kerja** dengan calon klien sebelum tahap 3 dan seterusnya dikerjakan secara penuh.
- Jika diperlukan bahan presentasi sebelum kesepakatan, gunakan aplikasi eksisting ditambah mockup fitur yang diminta, **tanpa** membangunnya di atas Firebase.

---

## 12. Daftar Butir Terbuka

| No | Butir | Status |
|---|---|---|
| 1 | Jenis database yang dikuasai tim TI klien | BELUM DIPUTUSKAN |
| 2 | OS server dan izin Docker | BELUM DIPUTUSKAN |
| 3 | Kebutuhan login AD/LDAP | BELUM DIPUTUSKAN |
| 4 | Akses jaringan internal/eksternal | BELUM DIPUTUSKAN |
| 5 | Jumlah pengguna dan unit | BELUM DIPUTUSKAN |
| 6 | Next.js full-stack vs backend terpisah | REKOMENDASI: Next.js full-stack |
| 7 | Pemilik agregasi risiko utama PUSAT ditetapkan per risiko utama | ASUMSI |
| 8 | Batas waktu pelaporan bulanan dan penguncian bulan | BELUM DIBAHAS |
