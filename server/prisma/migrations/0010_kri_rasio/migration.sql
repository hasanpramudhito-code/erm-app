-- KRI berbasis rasio: nilai dihitung dari dua angka nyata (pembilang / penyebut x pengali).
ALTER TABLE `kri`
    ADD COLUMN `rumus` ENUM('LANGSUNG', 'RASIO') NOT NULL DEFAULT 'LANGSUNG',
    ADD COLUMN `label_pembilang` VARCHAR(100) NULL,
    ADD COLUMN `label_penyebut` VARCHAR(100) NULL,
    ADD COLUMN `pengali` DECIMAL(18, 4) NOT NULL DEFAULT 100;

ALTER TABLE `pengukuran_kri`
    ADD COLUMN `pembilang` DECIMAL(20, 4) NULL,
    ADD COLUMN `penyebut` DECIMAL(20, 4) NULL;
