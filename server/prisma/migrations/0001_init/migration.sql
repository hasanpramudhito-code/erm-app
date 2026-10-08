-- CreateTable
CREATE TABLE `direktorat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `nama_jabatan_direktur` VARCHAR(150) NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `direktorat_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `deskripsi` TEXT NULL,
    `jenis` ENUM('PUSAT', 'CABANG') NOT NULL,
    `direktorat_id` INTEGER NULL,
    `parent_id` INTEGER NULL,
    `adalah_pengelola_risiko` BOOLEAN NOT NULL DEFAULT false,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unit_kode_key`(`kode`),
    INDEX `unit_direktorat_id_idx`(`direktorat_id`),
    INDEX `unit_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `kata_sandi_hash` VARCHAR(255) NOT NULL,
    `unit_id` INTEGER NULL,
    `jabatan` VARCHAR(150) NULL,
    `telepon` VARCHAR(30) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `login_terakhir` DATETIME(3) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pengguna_email_key`(`email`),
    INDEX `pengguna_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(40) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `peran_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengguna_peran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengguna_id` INTEGER NOT NULL,
    `peran_id` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pengguna_peran_pengguna_id_peran_id_key`(`pengguna_id`, `peran_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `tanggal_mulai` DATE NOT NULL,
    `tanggal_selesai` DATE NOT NULL,
    `status` ENUM('TERBUKA', 'DITUTUP') NOT NULL DEFAULT 'TERBUKA',
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skala_kemungkinan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nilai` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `deskripsi` TEXT NULL,
    `probabilitas` VARCHAR(50) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `skala_kemungkinan_nilai_key`(`nilai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skala_dampak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kategori` VARCHAR(30) NOT NULL,
    `nilai` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `deskripsi` TEXT NULL,
    `nilai_min` TEXT NULL,
    `nilai_maks` TEXT NULL,
    `warna` VARCHAR(20) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `skala_dampak_kategori_nilai_key`(`kategori`, `nilai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(50) NOT NULL,
    `skor_min` INTEGER NOT NULL,
    `skor_maks` INTEGER NOT NULL,
    `warna` VARCHAR(20) NOT NULL,
    `urutan` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `level_risiko_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kategori_risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `deskripsi` TEXT NULL,
    `warna` VARCHAR(20) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kategori_risiko_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_selera_risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `warna` VARCHAR(20) NOT NULL,
    `deskripsi` TEXT NULL,
    `urutan` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `level_selera_risiko_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pernyataan_selera_risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kategori_id` INTEGER NULL,
    `pernyataan` TEXT NOT NULL,
    `batas_toleransi` JSON NOT NULL,
    `proses_eskalasi` TEXT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `pernyataan_selera_risiko_kategori_id_idx`(`kategori_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengaturan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kunci` VARCHAR(100) NOT NULL,
    `nilai` JSON NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pengaturan_kunci_key`(`kunci`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risiko_utama` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `kategori_id` INTEGER NULL,
    `berlaku_untuk` ENUM('PUSAT', 'CABANG') NOT NULL,
    `direktorat_pemilik_id` INTEGER NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `risiko_utama_kode_key`(`kode`),
    INDEX `risiko_utama_berlaku_untuk_aktif_idx`(`berlaku_untuk`, `aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pustaka_penyebab` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_utama_id` INTEGER NOT NULL,
    `uraian` TEXT NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `pustaka_penyebab_risiko_utama_id_idx`(`risiko_utama_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pustaka_dampak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_utama_id` INTEGER NOT NULL,
    `uraian` TEXT NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `pustaka_dampak_risiko_utama_id_idx`(`risiko_utama_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periode_id` INTEGER NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `risiko_utama_id` INTEGER NULL,
    `kode` VARCHAR(50) NOT NULL,
    `nama` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `kategori_id` INTEGER NULL,
    `sumber` ENUM('INTERNAL', 'EKSTERNAL') NOT NULL DEFAULT 'INTERNAL',
    `klasifikasi` ENUM('PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS') NULL,
    `status` ENUM('BARU', 'DALAM_PENILAIAN', 'DINILAI', 'DALAM_PENANGANAN', 'DIPANTAU', 'DITUTUP', 'DITOLAK') NOT NULL DEFAULT 'BARU',
    `status_persetujuan` ENUM('DRAF', 'DIAJUKAN', 'DISETUJUI_PIMPINAN', 'FINAL', 'DIKEMBALIKAN') NOT NULL DEFAULT 'DRAF',
    `versi_aktif` INTEGER NOT NULL DEFAULT 1,
    `diubah_direksi` BOOLEAN NOT NULL DEFAULT false,
    `penanggung_jawab_id` INTEGER NULL,
    `kontrol_eksisting` TEXT NULL,
    `efektivitas_kontrol` VARCHAR(50) NULL,
    `kontrol_tambahan` TEXT NULL,
    `biaya_kontrol` DECIMAL(18, 2) NULL,
    `kuantifikasi_inheren` DECIMAL(18, 2) NULL,
    `kuantifikasi_residual` DECIMAL(18, 2) NULL,
    `prioritas_penanganan` ENUM('PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS') NULL,
    `target_selesai` DATE NULL,
    `catatan_penilaian` TEXT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `risiko_unit_id_status_persetujuan_idx`(`unit_id`, `status_persetujuan`),
    INDEX `risiko_risiko_utama_id_status_persetujuan_idx`(`risiko_utama_id`, `status_persetujuan`),
    UNIQUE INDEX `risiko_periode_id_unit_id_risiko_utama_id_key`(`periode_id`, `unit_id`, `risiko_utama_id`),
    UNIQUE INDEX `risiko_periode_id_kode_key`(`periode_id`, `kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risiko_penyebab` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `pustaka_penyebab_id` INTEGER NULL,
    `uraian` TEXT NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `risiko_penyebab_risiko_id_idx`(`risiko_id`),
    INDEX `risiko_penyebab_pustaka_penyebab_id_idx`(`pustaka_penyebab_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risiko_dampak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `pustaka_dampak_id` INTEGER NULL,
    `uraian` TEXT NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `risiko_dampak_risiko_id_idx`(`risiko_id`),
    INDEX `risiko_dampak_pustaka_dampak_id_idx`(`pustaka_dampak_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `jenis` ENUM('INHEREN', 'TARGET') NOT NULL,
    `kemungkinan` INTEGER NOT NULL,
    `dampak` INTEGER NOT NULL,
    `skor` INTEGER NOT NULL,
    `level_id` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `penilaian_risiko_id_jenis_key`(`risiko_id`, `jenis`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pemantauan_bulanan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `tahun` INTEGER NOT NULL,
    `bulan` INTEGER NOT NULL,
    `kemungkinan_residual` INTEGER NOT NULL,
    `dampak_residual` INTEGER NOT NULL,
    `skor` INTEGER NOT NULL,
    `level_id` INTEGER NOT NULL,
    `catatan` TEXT NULL,
    `status_persetujuan` ENUM('DRAF', 'DIAJUKAN', 'DISETUJUI_PIMPINAN', 'FINAL', 'DIKEMBALIKAN') NOT NULL DEFAULT 'DRAF',
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `pemantauan_bulanan_tahun_bulan_status_persetujuan_idx`(`tahun`, `bulan`, `status_persetujuan`),
    UNIQUE INDEX `pemantauan_bulanan_risiko_id_tahun_bulan_key`(`risiko_id`, `tahun`, `bulan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitigasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `uraian` TEXT NOT NULL,
    `jenis` ENUM('MITIGASI', 'HINDARI', 'TRANSFER', 'TERIMA') NOT NULL DEFAULT 'MITIGASI',
    `penanggung_jawab_id` INTEGER NULL,
    `target_waktu` DATE NULL,
    `anggaran` DECIMAL(18, 2) NULL,
    `prioritas` ENUM('PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS') NOT NULL DEFAULT 'SEDANG',
    `status` ENUM('DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'TERLAMBAT', 'DIBATALKAN') NOT NULL DEFAULT 'DIRENCANAKAN',
    `progres` INTEGER NOT NULL DEFAULT 0,
    `efektivitas` VARCHAR(50) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `mitigasi_risiko_id_idx`(`risiko_id`),
    INDEX `mitigasi_status_target_waktu_idx`(`status`, `target_waktu`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `realisasi_mitigasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mitigasi_id` INTEGER NOT NULL,
    `pemantauan_bulanan_id` INTEGER NULL,
    `tanggal` DATE NOT NULL,
    `uraian` TEXT NOT NULL,
    `progres` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `realisasi_mitigasi_mitigasi_id_idx`(`mitigasi_id`),
    INDEX `realisasi_mitigasi_pemantauan_bulanan_id_idx`(`pemantauan_bulanan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revisi_risiko` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `nomor_revisi` INTEGER NOT NULL,
    `alasan_revisi` TEXT NOT NULL,
    `salinan_data` JSON NOT NULL,
    `status_persetujuan` ENUM('DRAF', 'DIAJUKAN', 'DISETUJUI_PIMPINAN', 'FINAL', 'DIKEMBALIKAN') NOT NULL DEFAULT 'DRAF',
    `diajukan_oleh_id` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `revisi_risiko_risiko_id_nomor_revisi_key`(`risiko_id`, `nomor_revisi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `raci` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_id` INTEGER NOT NULL,
    `peran` ENUM('R', 'A', 'C', 'I') NOT NULL,
    `pengguna_id` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `raci_risiko_id_peran_key`(`risiko_id`, `peran`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riwayat_persetujuan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entitas` ENUM('RISIKO', 'PEMANTAUAN', 'REVISI') NOT NULL,
    `entitas_id` INTEGER NOT NULL,
    `dari_status` ENUM('DRAF', 'DIAJUKAN', 'DISETUJUI_PIMPINAN', 'FINAL', 'DIKEMBALIKAN') NOT NULL,
    `ke_status` ENUM('DRAF', 'DIAJUKAN', 'DISETUJUI_PIMPINAN', 'FINAL', 'DIKEMBALIKAN') NOT NULL,
    `pengguna_id` INTEGER NOT NULL,
    `catatan` TEXT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `riwayat_persetujuan_entitas_entitas_id_idx`(`entitas`, `entitas_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifikasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penerima_id` INTEGER NOT NULL,
    `jenis` VARCHAR(50) NOT NULL,
    `pesan` TEXT NOT NULL,
    `tautan` VARCHAR(255) NULL,
    `dibaca` BOOLEAN NOT NULL DEFAULT false,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `notifikasi_penerima_id_dibaca_idx`(`penerima_id`, `dibaca`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jejak_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_tabel` VARCHAR(64) NOT NULL,
    `id_data` VARCHAR(64) NOT NULL,
    `aksi` VARCHAR(50) NOT NULL,
    `nilai_lama` JSON NULL,
    `nilai_baru` JSON NULL,
    `pengguna_id` INTEGER NULL,
    `alamat_ip` VARCHAR(45) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `jejak_audit_nama_tabel_id_data_idx`(`nama_tabel`, `id_data`),
    INDEX `jejak_audit_dibuat_pada_idx`(`dibuat_pada`),
    INDEX `jejak_audit_pengguna_id_idx`(`pengguna_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lampiran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entitas` VARCHAR(64) NOT NULL,
    `entitas_id` INTEGER NOT NULL,
    `nama_file` VARCHAR(255) NOT NULL,
    `lokasi_file` VARCHAR(500) NOT NULL,
    `tipe_mime` VARCHAR(100) NULL,
    `ukuran` INTEGER NULL,
    `diunggah_oleh_id` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `lampiran_entitas_entitas_id_idx`(`entitas`, `entitas_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(30) NULL,
    `nama` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `kategori` VARCHAR(100) NULL,
    `unit_id` INTEGER NULL,
    `risiko_id` INTEGER NULL,
    `satuan` VARCHAR(50) NULL,
    `jenis_metrik` VARCHAR(30) NULL,
    `sumber_data` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    `ambang_hijau` DECIMAL(18, 4) NOT NULL,
    `ambang_kuning` DECIMAL(18, 4) NOT NULL,
    `ambang_merah` DECIMAL(18, 4) NOT NULL,
    `nilai_target` DECIMAL(18, 4) NULL,
    `arah_target` ENUM('LEBIH_RENDAH', 'LEBIH_TINGGI') NOT NULL DEFAULT 'LEBIH_RENDAH',
    `frekuensi` ENUM('HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN') NOT NULL DEFAULT 'BULANAN',
    `nilai_sekarang` DECIMAL(18, 4) NULL,
    `nilai_sebelumnya` DECIMAL(18, 4) NULL,
    `status` ENUM('NONAKTIF', 'HIJAU', 'KUNING', 'MERAH') NOT NULL DEFAULT 'NONAKTIF',
    `tren` ENUM('STABIL', 'NAIK', 'TURUN') NOT NULL DEFAULT 'STABIL',
    `pemilik_id` INTEGER NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kri_kode_key`(`kode`),
    INDEX `kri_unit_id_idx`(`unit_id`),
    INDEX `kri_risiko_id_idx`(`risiko_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengukuran_kri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kri_id` INTEGER NOT NULL,
    `nilai` DECIMAL(18, 4) NOT NULL,
    `status` ENUM('NONAKTIF', 'HIJAU', 'KUNING', 'MERAH') NOT NULL,
    `catatan` TEXT NULL,
    `diukur_pada` DATETIME(3) NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `pengukuran_kri_kri_id_diukur_pada_idx`(`kri_id`, `diukur_pada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peringatan_kri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kri_id` INTEGER NOT NULL,
    `nilai_sebelumnya` DECIMAL(18, 4) NULL,
    `nilai_sekarang` DECIMAL(18, 4) NOT NULL,
    `status_sebelumnya` ENUM('NONAKTIF', 'HIJAU', 'KUNING', 'MERAH') NOT NULL,
    `status_sekarang` ENUM('NONAKTIF', 'HIJAU', 'KUNING', 'MERAH') NOT NULL,
    `diakui` BOOLEAN NOT NULL DEFAULT false,
    `diakui_oleh_id` INTEGER NULL,
    `diakui_pada` DATETIME(3) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `peringatan_kri_kri_id_idx`(`kri_id`),
    INDEX `peringatan_kri_diakui_idx`(`diakui`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `insiden` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(255) NULL,
    `risiko_id` INTEGER NULL,
    `unit_id` INTEGER NULL,
    `tanggal_kejadian` DATETIME(3) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `dampak` TEXT NULL,
    `tindakan_segera` TEXT NULL,
    `tindak_lanjut` TEXT NULL,
    `perlu_tindak_lanjut` BOOLEAN NOT NULL DEFAULT false,
    `tingkat_keparahan` ENUM('PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS') NOT NULL DEFAULT 'SEDANG',
    `status` ENUM('DILAPORKAN', 'INVESTIGASI', 'TINDAKAN_DIAMBIL', 'SELESAI', 'DITUTUP') NOT NULL DEFAULT 'DILAPORKAN',
    `sumber` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    `pelapor_id` INTEGER NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `insiden_tanggal_kejadian_idx`(`tanggal_kejadian`),
    INDEX `insiden_risiko_id_idx`(`risiko_id`),
    INDEX `insiden_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kontrol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(30) NULL,
    `nama` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `kategori` VARCHAR(100) NULL,
    `jenis` ENUM('PREVENTIF', 'DETEKTIF', 'KOREKTIF') NOT NULL,
    `frekuensi` ENUM('HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN') NOT NULL DEFAULT 'TRIWULANAN',
    `tujuan` TEXT NULL,
    `prosedur_pengujian` TEXT NULL,
    `unit_id` INTEGER NULL,
    `pemilik_id` INTEGER NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kontrol_kode_key`(`kode`),
    INDEX `kontrol_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_pengujian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kontrol_id` INTEGER NOT NULL,
    `tanggal_jadwal` DATE NOT NULL,
    `penguji_id` INTEGER NULL,
    `jenis_pengujian` ENUM('DESAIN', 'OPERASIONAL', 'KEDUANYA') NOT NULL,
    `catatan` TEXT NULL,
    `status` ENUM('DIJADWALKAN', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'DIJADWALKAN',
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `jadwal_pengujian_kontrol_id_tanggal_jadwal_idx`(`kontrol_id`, `tanggal_jadwal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hasil_pengujian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kontrol_id` INTEGER NOT NULL,
    `jadwal_id` INTEGER NULL,
    `tanggal_uji` DATE NOT NULL,
    `penguji_id` INTEGER NULL,
    `jenis_pengujian` ENUM('DESAIN', 'OPERASIONAL', 'KEDUANYA') NOT NULL,
    `hasil` ENUM('EFEKTIF', 'SEBAGIAN_EFEKTIF', 'TIDAK_EFEKTIF') NOT NULL,
    `peringkat_efektivitas` INTEGER NOT NULL,
    `ukuran_sampel` INTEGER NULL,
    `jumlah_pengecualian` INTEGER NOT NULL DEFAULT 0,
    `catatan` TEXT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `hasil_pengujian_kontrol_id_tanggal_uji_idx`(`kontrol_id`, `tanggal_uji`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `defisiensi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kontrol_id` INTEGER NULL,
    `hasil_pengujian_id` INTEGER NULL,
    `judul` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `kategori` VARCHAR(100) NULL,
    `dampak_risiko` TEXT NULL,
    `akar_masalah` TEXT NULL,
    `rekomendasi` TEXT NULL,
    `ditugaskan_ke_id` INTEGER NULL,
    `tingkat_keparahan` ENUM('PEMANTAUAN', 'RENDAH', 'SEDANG', 'TINGGI', 'KRITIS') NOT NULL DEFAULT 'SEDANG',
    `status` ENUM('TERBUKA', 'BERJALAN', 'SELESAI', 'DITUTUP') NOT NULL DEFAULT 'TERBUKA',
    `tanggal_identifikasi` DATE NOT NULL,
    `tanggal_target` DATE NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `defisiensi_kontrol_id_idx`(`kontrol_id`),
    INDEX `defisiensi_status_tanggal_identifikasi_idx`(`status`, `tanggal_identifikasi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survei_budaya` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `pertanyaan` JSON NOT NULL,
    `status` ENUM('DRAF', 'TERBIT', 'DITUTUP') NOT NULL DEFAULT 'DRAF',
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `respons_budaya` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survei_id` INTEGER NOT NULL,
    `responden_id` INTEGER NULL,
    `nama_responden` VARCHAR(150) NULL,
    `peran_responden` VARCHAR(100) NULL,
    `jawaban` JSON NOT NULL,
    `skor` DECIMAL(5, 2) NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `respons_budaya_survei_id_dibuat_pada_idx`(`survei_id`, `dibuat_pada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skor_komposit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skor` DECIMAL(6, 2) NOT NULL,
    `level` VARCHAR(30) NOT NULL,
    `tren` VARCHAR(20) NOT NULL,
    `komponen` JSON NOT NULL,
    `metadata` JSON NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `skor_komposit_dibuat_pada_idx`(`dibuat_pada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `koneksi_api` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(150) NOT NULL,
    `deskripsi` TEXT NULL,
    `url_dasar` VARCHAR(500) NOT NULL,
    `jenis` VARCHAR(20) NOT NULL DEFAULT 'REST',
    `jenis_auth` VARCHAR(20) NOT NULL DEFAULT 'NONE',
    `kredensial_terenkripsi` TEXT NULL,
    `header_api_key` VARCHAR(100) NULL,
    `jenis_data` VARCHAR(30) NOT NULL,
    `endpoint_sinkron` VARCHAR(500) NULL,
    `endpoint_kirim` VARCHAR(500) NULL,
    `frekuensi_sinkron` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    `aktif` BOOLEAN NOT NULL DEFAULT false,
    `status_uji` VARCHAR(20) NULL,
    `error_terakhir` TEXT NULL,
    `sinkron_terakhir` DATETIME(3) NULL,
    `jumlah_sinkron` INTEGER NOT NULL DEFAULT 0,
    `jumlah_error` INTEGER NOT NULL DEFAULT 0,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `unit` ADD CONSTRAINT `unit_direktorat_id_fkey` FOREIGN KEY (`direktorat_id`) REFERENCES `direktorat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit` ADD CONSTRAINT `unit_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengguna_peran` ADD CONSTRAINT `pengguna_peran_pengguna_id_fkey` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengguna_peran` ADD CONSTRAINT `pengguna_peran_peran_id_fkey` FOREIGN KEY (`peran_id`) REFERENCES `peran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pernyataan_selera_risiko` ADD CONSTRAINT `pernyataan_selera_risiko_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_risiko`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko_utama` ADD CONSTRAINT `risiko_utama_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_risiko`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko_utama` ADD CONSTRAINT `risiko_utama_direktorat_pemilik_id_fkey` FOREIGN KEY (`direktorat_pemilik_id`) REFERENCES `direktorat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pustaka_penyebab` ADD CONSTRAINT `pustaka_penyebab_risiko_utama_id_fkey` FOREIGN KEY (`risiko_utama_id`) REFERENCES `risiko_utama`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pustaka_dampak` ADD CONSTRAINT `pustaka_dampak_risiko_utama_id_fkey` FOREIGN KEY (`risiko_utama_id`) REFERENCES `risiko_utama`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko` ADD CONSTRAINT `risiko_periode_id_fkey` FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko` ADD CONSTRAINT `risiko_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko` ADD CONSTRAINT `risiko_risiko_utama_id_fkey` FOREIGN KEY (`risiko_utama_id`) REFERENCES `risiko_utama`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko` ADD CONSTRAINT `risiko_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_risiko`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko` ADD CONSTRAINT `risiko_penanggung_jawab_id_fkey` FOREIGN KEY (`penanggung_jawab_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko_penyebab` ADD CONSTRAINT `risiko_penyebab_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko_penyebab` ADD CONSTRAINT `risiko_penyebab_pustaka_penyebab_id_fkey` FOREIGN KEY (`pustaka_penyebab_id`) REFERENCES `pustaka_penyebab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko_dampak` ADD CONSTRAINT `risiko_dampak_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risiko_dampak` ADD CONSTRAINT `risiko_dampak_pustaka_dampak_id_fkey` FOREIGN KEY (`pustaka_dampak_id`) REFERENCES `pustaka_dampak`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `level_risiko`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pemantauan_bulanan` ADD CONSTRAINT `pemantauan_bulanan_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pemantauan_bulanan` ADD CONSTRAINT `pemantauan_bulanan_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `level_risiko`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitigasi` ADD CONSTRAINT `mitigasi_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitigasi` ADD CONSTRAINT `mitigasi_penanggung_jawab_id_fkey` FOREIGN KEY (`penanggung_jawab_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `realisasi_mitigasi` ADD CONSTRAINT `realisasi_mitigasi_mitigasi_id_fkey` FOREIGN KEY (`mitigasi_id`) REFERENCES `mitigasi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `realisasi_mitigasi` ADD CONSTRAINT `realisasi_mitigasi_pemantauan_bulanan_id_fkey` FOREIGN KEY (`pemantauan_bulanan_id`) REFERENCES `pemantauan_bulanan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revisi_risiko` ADD CONSTRAINT `revisi_risiko_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revisi_risiko` ADD CONSTRAINT `revisi_risiko_diajukan_oleh_id_fkey` FOREIGN KEY (`diajukan_oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raci` ADD CONSTRAINT `raci_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raci` ADD CONSTRAINT `raci_pengguna_id_fkey` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_persetujuan` ADD CONSTRAINT `riwayat_persetujuan_pengguna_id_fkey` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifikasi` ADD CONSTRAINT `notifikasi_penerima_id_fkey` FOREIGN KEY (`penerima_id`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jejak_audit` ADD CONSTRAINT `jejak_audit_pengguna_id_fkey` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lampiran` ADD CONSTRAINT `lampiran_diunggah_oleh_id_fkey` FOREIGN KEY (`diunggah_oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kri` ADD CONSTRAINT `kri_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kri` ADD CONSTRAINT `kri_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kri` ADD CONSTRAINT `kri_pemilik_id_fkey` FOREIGN KEY (`pemilik_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengukuran_kri` ADD CONSTRAINT `pengukuran_kri_kri_id_fkey` FOREIGN KEY (`kri_id`) REFERENCES `kri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `peringatan_kri` ADD CONSTRAINT `peringatan_kri_kri_id_fkey` FOREIGN KEY (`kri_id`) REFERENCES `kri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `peringatan_kri` ADD CONSTRAINT `peringatan_kri_diakui_oleh_id_fkey` FOREIGN KEY (`diakui_oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insiden` ADD CONSTRAINT `insiden_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insiden` ADD CONSTRAINT `insiden_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insiden` ADD CONSTRAINT `insiden_pelapor_id_fkey` FOREIGN KEY (`pelapor_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kontrol` ADD CONSTRAINT `kontrol_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kontrol` ADD CONSTRAINT `kontrol_pemilik_id_fkey` FOREIGN KEY (`pemilik_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_pengujian` ADD CONSTRAINT `jadwal_pengujian_kontrol_id_fkey` FOREIGN KEY (`kontrol_id`) REFERENCES `kontrol`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_pengujian` ADD CONSTRAINT `jadwal_pengujian_penguji_id_fkey` FOREIGN KEY (`penguji_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_pengujian` ADD CONSTRAINT `hasil_pengujian_kontrol_id_fkey` FOREIGN KEY (`kontrol_id`) REFERENCES `kontrol`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_pengujian` ADD CONSTRAINT `hasil_pengujian_jadwal_id_fkey` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_pengujian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_pengujian` ADD CONSTRAINT `hasil_pengujian_penguji_id_fkey` FOREIGN KEY (`penguji_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `defisiensi` ADD CONSTRAINT `defisiensi_kontrol_id_fkey` FOREIGN KEY (`kontrol_id`) REFERENCES `kontrol`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `defisiensi` ADD CONSTRAINT `defisiensi_hasil_pengujian_id_fkey` FOREIGN KEY (`hasil_pengujian_id`) REFERENCES `hasil_pengujian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `defisiensi` ADD CONSTRAINT `defisiensi_ditugaskan_ke_id_fkey` FOREIGN KEY (`ditugaskan_ke_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respons_budaya` ADD CONSTRAINT `respons_budaya_survei_id_fkey` FOREIGN KEY (`survei_id`) REFERENCES `survei_budaya`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respons_budaya` ADD CONSTRAINT `respons_budaya_responden_id_fkey` FOREIGN KEY (`responden_id`) REFERENCES `pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

