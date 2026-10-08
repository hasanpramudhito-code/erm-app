-- Residual kini dinilai sekali per periode (penilaian jenis RESIDUAL), bukan per bulan.
-- Pemantauan bulanan berisi: realisasi mitigasi, pengukuran KRI, catatan, peristiwa risiko.

-- 1. Enum penilaian: TARGET -> RESIDUAL, pindahkan residual dari pemantauan_bulanan.
ALTER TABLE `penilaian` MODIFY `jenis` ENUM('INHEREN', 'TARGET', 'RESIDUAL') NOT NULL;
DELETE FROM `penilaian` WHERE `jenis` = 'TARGET';
INSERT INTO `penilaian` (`risiko_id`, `jenis`, `kemungkinan`, `dampak`, `skor`, `level_id`, `diubah_pada`)
SELECT pb.`risiko_id`, 'RESIDUAL', pb.`kemungkinan_residual`, pb.`dampak_residual`, pb.`skor`, pb.`level_id`, CURRENT_TIMESTAMP(3)
FROM `pemantauan_bulanan` pb
WHERE NOT EXISTS (
  SELECT 1 FROM `pemantauan_bulanan` lebih_baru
  WHERE lebih_baru.`risiko_id` = pb.`risiko_id`
    AND (lebih_baru.`tahun` * 100 + lebih_baru.`bulan`) > (pb.`tahun` * 100 + pb.`bulan`)
);
ALTER TABLE `penilaian` MODIFY `jenis` ENUM('INHEREN', 'RESIDUAL') NOT NULL;

-- 2. pemantauan_bulanan: buang kolom residual, tambah penanda peristiwa & waktu pengajuan.
ALTER TABLE `pemantauan_bulanan` DROP FOREIGN KEY `pemantauan_bulanan_level_id_fkey`;
ALTER TABLE `pemantauan_bulanan` DROP COLUMN `dampak_residual`,
    DROP COLUMN `kemungkinan_residual`,
    DROP COLUMN `level_id`,
    DROP COLUMN `skor`,
    ADD COLUMN `diajukan_pada` DATETIME(3) NULL,
    ADD COLUMN `peristiwa_terjadi` BOOLEAN NOT NULL DEFAULT false;

-- 3. realisasi_mitigasi: satu baris per mitigasi per laporan bulanan.
ALTER TABLE `realisasi_mitigasi` DROP FOREIGN KEY `realisasi_mitigasi_pemantauan_bulanan_id_fkey`;
DROP INDEX `realisasi_mitigasi_pemantauan_bulanan_id_idx` ON `realisasi_mitigasi`;
ALTER TABLE `realisasi_mitigasi` DROP COLUMN `tanggal`,
    DROP COLUMN `uraian`,
    ADD COLUMN `keterangan` TEXT NULL,
    ADD COLUMN `status` ENUM('DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'TERLAMBAT', 'DIBATALKAN') NOT NULL,
    MODIFY `pemantauan_bulanan_id` INTEGER NOT NULL;
CREATE UNIQUE INDEX `realisasi_mitigasi_pemantauan_bulanan_id_mitigasi_id_key` ON `realisasi_mitigasi`(`pemantauan_bulanan_id`, `mitigasi_id`);
ALTER TABLE `realisasi_mitigasi` ADD CONSTRAINT `realisasi_mitigasi_pemantauan_bulanan_id_fkey` FOREIGN KEY (`pemantauan_bulanan_id`) REFERENCES `pemantauan_bulanan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. pengukuran_kri: satu baris per KRI per laporan bulanan.
ALTER TABLE `pengukuran_kri` DROP FOREIGN KEY `pengukuran_kri_kri_id_fkey`;
DROP INDEX `pengukuran_kri_kri_id_diukur_pada_idx` ON `pengukuran_kri`;
ALTER TABLE `pengukuran_kri` DROP COLUMN `diukur_pada`,
    ADD COLUMN `pemantauan_bulanan_id` INTEGER NOT NULL;
CREATE INDEX `pengukuran_kri_kri_id_idx` ON `pengukuran_kri`(`kri_id`);
CREATE UNIQUE INDEX `pengukuran_kri_pemantauan_bulanan_id_kri_id_key` ON `pengukuran_kri`(`pemantauan_bulanan_id`, `kri_id`);
ALTER TABLE `pengukuran_kri` ADD CONSTRAINT `pengukuran_kri_kri_id_fkey` FOREIGN KEY (`kri_id`) REFERENCES `kri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pengukuran_kri` ADD CONSTRAINT `pengukuran_kri_pemantauan_bulanan_id_fkey` FOREIGN KEY (`pemantauan_bulanan_id`) REFERENCES `pemantauan_bulanan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. insiden: kerugian (Rp) dan tautan ke laporan bulanan yang mencatatnya.
ALTER TABLE `insiden` ADD COLUMN `kerugian` DECIMAL(18, 2) NULL,
    ADD COLUMN `pemantauan_bulanan_id` INTEGER NULL;
ALTER TABLE `insiden` ADD CONSTRAINT `insiden_pemantauan_bulanan_id_fkey` FOREIGN KEY (`pemantauan_bulanan_id`) REFERENCES `pemantauan_bulanan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
