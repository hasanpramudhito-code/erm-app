-- CreateTable
CREATE TABLE `sesi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` CHAR(64) NOT NULL,
    `pengguna_id` INTEGER NOT NULL,
    `kedaluwarsa` DATETIME(3) NOT NULL,
    `alamat_ip` VARCHAR(45) NULL,
    `dibuat_pada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubah_pada` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sesi_token_hash_key`(`token_hash`),
    INDEX `sesi_pengguna_id_idx`(`pengguna_id`),
    INDEX `sesi_kedaluwarsa_idx`(`kedaluwarsa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sesi` ADD CONSTRAINT `sesi_pengguna_id_fkey` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

