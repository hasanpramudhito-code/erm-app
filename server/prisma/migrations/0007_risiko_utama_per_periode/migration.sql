-- CreateTable
CREATE TABLE `periode_risiko_utama` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periode_id` INTEGER NOT NULL,
    `risiko_utama_id` INTEGER NOT NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `periode_risiko_utama_periode_id_risiko_utama_id_key`(`periode_id`, `risiko_utama_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `periode_risiko_utama` ADD CONSTRAINT `periode_risiko_utama_periode_id_fkey` FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periode_risiko_utama` ADD CONSTRAINT `periode_risiko_utama_risiko_utama_id_fkey` FOREIGN KEY (`risiko_utama_id`) REFERENCES `risiko_utama`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Risiko utama aktif yang sudah ada berlaku di semua periode terbuka (perilaku lama).
INSERT INTO `periode_risiko_utama` (`periode_id`, `risiko_utama_id`, `diubah_pada`)
SELECT p.`id`, ru.`id`, CURRENT_TIMESTAMP(3) FROM `periode` p CROSS JOIN `risiko_utama` ru WHERE p.`status` = 'TERBUKA' AND ru.`aktif` = true;
