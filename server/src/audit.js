const prisma = require('./db');

// Catat satu baris jejak audit. Tindakan Direksi wajib tercatat (handoff bagian 8).
function catat({ req, nama_tabel, id_data, aksi, nilai_lama = null, nilai_baru = null, pengguna_id }) {
  return prisma.jejak_audit.create({
    data: {
      nama_tabel,
      id_data: String(id_data),
      aksi,
      nilai_lama: nilai_lama ?? undefined,
      nilai_baru: nilai_baru ?? undefined,
      pengguna_id: pengguna_id ?? req?.pengguna?.id ?? null,
      alamat_ip: req?.ip ?? null,
    },
  });
}

module.exports = { catat };
