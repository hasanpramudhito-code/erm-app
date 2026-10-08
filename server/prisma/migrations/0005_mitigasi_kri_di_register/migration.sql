-- Pindahkan Rencana Aksi lama ke tabel mitigasi sebelum kolomnya dihapus.
INSERT INTO `mitigasi` (`risiko_id`, `uraian`, `target_waktu`, `anggaran`, `diubah_pada`)
SELECT `id`, COALESCE(`kontrol_tambahan`, 'Pengendalian tambahan'), `target_selesai`, `biaya_kontrol`, CURRENT_TIMESTAMP(3)
FROM `risiko`
WHERE `kontrol_tambahan` IS NOT NULL OR `biaya_kontrol` IS NOT NULL OR `target_selesai` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `kri` DROP FOREIGN KEY `kri_unit_id_fkey`;

-- DropForeignKey
ALTER TABLE `kri` DROP FOREIGN KEY `kri_risiko_id_fkey`;

-- DropIndex
DROP INDEX `kri_kode_key` ON `kri`;

-- DropIndex
DROP INDEX `kri_unit_id_idx` ON `kri`;

-- AlterTable
ALTER TABLE `risiko` DROP COLUMN `biaya_kontrol`,
    DROP COLUMN `kontrol_tambahan`,
    DROP COLUMN `target_selesai`;

-- AlterTable
ALTER TABLE `kri` DROP COLUMN `unit_id`,
    MODIFY `risiko_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `kri` ADD CONSTRAINT `kri_risiko_id_fkey` FOREIGN KEY (`risiko_id`) REFERENCES `risiko`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

