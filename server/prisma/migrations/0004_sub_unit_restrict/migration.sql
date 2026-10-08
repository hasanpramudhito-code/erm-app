-- DropForeignKey
ALTER TABLE `unit` DROP FOREIGN KEY `unit_parent_id_fkey`;

-- AddForeignKey
ALTER TABLE `unit` ADD CONSTRAINT `unit_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

