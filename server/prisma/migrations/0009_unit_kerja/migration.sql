-- Adendum v2: unit -> unit_kerja (rename, data dipertahankan), jenis BAGIAN/SUB_BAGIAN/CABANG/UNIT,
-- pemilik_risiko, alur_persetujuan; peran digabung menjadi 6 kode.

-- ---- Lepas FK & indeks yang memakai nama lama ----
ALTER TABLE `insiden` DROP FOREIGN KEY `insiden_unit_id_fkey`;
ALTER TABLE `kontrol` DROP FOREIGN KEY `kontrol_unit_id_fkey`;
ALTER TABLE `pengguna` DROP FOREIGN KEY `pengguna_unit_id_fkey`;
ALTER TABLE `risiko` DROP FOREIGN KEY `risiko_unit_id_fkey`;
ALTER TABLE `unit` DROP FOREIGN KEY `unit_direktorat_id_fkey`;
ALTER TABLE `unit` DROP FOREIGN KEY `unit_parent_id_fkey`;

-- ---- Tabel unit -> unit_kerja ----
RENAME TABLE `unit` TO `unit_kerja`;
-- MariaDB 10.4 belum mendukung RENAME INDEX: buang lalu buat ulang.
ALTER TABLE `unit_kerja`
    DROP INDEX `unit_kode_key`, ADD UNIQUE INDEX `unit_kerja_kode_key`(`kode`),
    DROP INDEX `unit_direktorat_id_idx`, ADD INDEX `unit_kerja_direktorat_id_idx`(`direktorat_id`),
    DROP INDEX `unit_parent_id_idx`,
    CHANGE `parent_id` `induk_id` INTEGER NULL,
    MODIFY `jenis` ENUM('PUSAT', 'BAGIAN', 'SUB_BAGIAN', 'CABANG', 'UNIT') NOT NULL,
    ADD COLUMN `pemilik_risiko` BOOLEAN NOT NULL DEFAULT true AFTER `induk_id`,
    ADD COLUMN `alur_persetujuan` ENUM('DUA_TINGKAT', 'SATU_TINGKAT') NULL AFTER `adalah_pengelola_risiko`,
    ADD INDEX `unit_kerja_induk_id_idx`(`induk_id`);

-- Unit pusat lama menjadi BAGIAN (yang berinduk menjadi SUB_BAGIAN, tanpa register sendiri).
UPDATE `unit_kerja` SET `jenis` = IF(`induk_id` IS NULL, 'BAGIAN', 'SUB_BAGIAN') WHERE `jenis` = 'PUSAT';
UPDATE `unit_kerja` SET `pemilik_risiko` = (`jenis` <> 'SUB_BAGIAN');
UPDATE `unit_kerja` SET `alur_persetujuan` = 'DUA_TINGKAT' WHERE `pemilik_risiko`;
ALTER TABLE `unit_kerja` MODIFY `jenis` ENUM('BAGIAN', 'SUB_BAGIAN', 'CABANG', 'UNIT') NOT NULL;

-- ---- Kolom unit_id -> unit_kerja_id ----
ALTER TABLE `pengguna` CHANGE `unit_id` `unit_kerja_id` INTEGER NULL,
    DROP INDEX `pengguna_unit_id_idx`, ADD INDEX `pengguna_unit_kerja_id_idx`(`unit_kerja_id`);
ALTER TABLE `insiden` CHANGE `unit_id` `unit_kerja_id` INTEGER NULL,
    DROP INDEX `insiden_unit_id_idx`, ADD INDEX `insiden_unit_kerja_id_idx`(`unit_kerja_id`);
ALTER TABLE `kontrol` CHANGE `unit_id` `unit_kerja_id` INTEGER NULL,
    DROP INDEX `kontrol_unit_id_idx`, ADD INDEX `kontrol_unit_kerja_id_idx`(`unit_kerja_id`);
ALTER TABLE `risiko` CHANGE `unit_id` `unit_kerja_id` INTEGER NOT NULL,
    DROP INDEX `risiko_periode_id_unit_id_risiko_utama_id_key`,
    ADD UNIQUE INDEX `risiko_periode_id_unit_kerja_id_risiko_utama_id_key`(`periode_id`, `unit_kerja_id`, `risiko_utama_id`),
    DROP INDEX `risiko_unit_id_status_persetujuan_idx`,
    ADD INDEX `risiko_unit_kerja_id_status_persetujuan_idx`(`unit_kerja_id`, `status_persetujuan`);

-- ---- Pasang kembali FK ----
ALTER TABLE `unit_kerja` ADD CONSTRAINT `unit_kerja_direktorat_id_fkey` FOREIGN KEY (`direktorat_id`) REFERENCES `direktorat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `unit_kerja` ADD CONSTRAINT `unit_kerja_induk_id_fkey` FOREIGN KEY (`induk_id`) REFERENCES `unit_kerja`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_unit_kerja_id_fkey` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `risiko` ADD CONSTRAINT `risiko_unit_kerja_id_fkey` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `insiden` ADD CONSTRAINT `insiden_unit_kerja_id_fkey` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `kontrol` ADD CONSTRAINT `kontrol_unit_kerja_id_fkey` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ---- Peran: 8 kode lama -> 6 kode baru ----
-- Buat kode tujuan bila belum ada, pindahkan anggota, hapus kode lama.
INSERT IGNORE INTO `peran` (`kode`, `nama`, `diubah_pada`) VALUES
    ('ADMIN', 'Administrator Sistem', NOW(3)),
    ('AUDITOR', 'Auditor Internal (hanya baca)', NOW(3)),
    ('PIMPINAN', 'Pimpinan Unit Kerja', NOW(3)),
    ('PETUGAS', 'Petugas Risiko', NOW(3));

INSERT IGNORE INTO `pengguna_peran` (`pengguna_id`, `peran_id`, `diubah_pada`)
SELECT pp.`pengguna_id`, baru.`id`, NOW(3)
FROM `pengguna_peran` pp
JOIN `peran` lama ON lama.`id` = pp.`peran_id`
JOIN `peran` baru ON baru.`kode` = CASE lama.`kode`
    WHEN 'ADMIN_SISTEM' THEN 'ADMIN'
    WHEN 'KEPATUHAN' THEN 'AUDITOR'
    WHEN 'PIMPINAN_UNIT_PUSAT' THEN 'PIMPINAN'
    WHEN 'PIMPINAN_CABANG' THEN 'PIMPINAN'
    WHEN 'PETUGAS_RISIKO_PUSAT' THEN 'PETUGAS'
    WHEN 'PETUGAS_RISIKO_CABANG' THEN 'PETUGAS'
END;

DELETE pp FROM `pengguna_peran` pp JOIN `peran` p ON p.`id` = pp.`peran_id`
WHERE p.`kode` IN ('ADMIN_SISTEM', 'KEPATUHAN', 'PIMPINAN_UNIT_PUSAT', 'PIMPINAN_CABANG', 'PETUGAS_RISIKO_PUSAT', 'PETUGAS_RISIKO_CABANG');
DELETE FROM `peran` WHERE `kode` IN ('ADMIN_SISTEM', 'KEPATUHAN', 'PIMPINAN_UNIT_PUSAT', 'PIMPINAN_CABANG', 'PETUGAS_RISIKO_PUSAT', 'PETUGAS_RISIKO_CABANG');
UPDATE `peran` SET `nama` = 'Pengelola Risiko Pusat' WHERE `kode` = 'PENGELOLA_RISIKO';
