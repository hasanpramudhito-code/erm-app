-- KRI baku di risiko utama; KRI unit kerja tertaut (kri_baku_id) agar nilainya bisa diagregasi.
-- AlterTable
ALTER TABLE `kri` ADD COLUMN `kri_baku_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `kri_baku` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `risiko_utama_id` INTEGER NOT NULL,
    `nama` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NULL,
    `satuan` VARCHAR(50) NULL,
    `rumus` ENUM('LANGSUNG', 'RASIO') NOT NULL DEFAULT 'LANGSUNG',
    `label_pembilang` VARCHAR(100) NULL,
    `label_penyebut` VARCHAR(100) NULL,
    `pengali` DECIMAL(18, 4) NOT NULL DEFAULT 100,
    `arah_target` ENUM('LEBIH_RENDAH', 'LEBIH_TINGGI') NOT NULL DEFAULT 'LEBIH_RENDAH',
    `frekuensi` ENUM('HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN') NOT NULL DEFAULT 'BULANAN',
    `ambang_hijau` DECIMAL(18, 4) NOT NULL,
    `ambang_kuning` DECIMAL(18, 4) NOT NULL,
    `ambang_merah` DECIMAL(18, 4) NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    INDEX `kri_baku_risiko_utama_id_idx`(`risiko_utama_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `kri_risiko_id_kri_baku_id_key` ON `kri`(`risiko_id`, `kri_baku_id`);

-- AddForeignKey
ALTER TABLE `kri_baku` ADD CONSTRAINT `kri_baku_risiko_utama_id_fkey` FOREIGN KEY (`risiko_utama_id`) REFERENCES `risiko_utama`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kri` ADD CONSTRAINT `kri_kri_baku_id_fkey` FOREIGN KEY (`kri_baku_id`) REFERENCES `kri_baku`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

