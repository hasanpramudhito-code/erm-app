import React, { useEffect, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import TabelKelola from '../../components/TabelKelola';
import { api } from '../../services/api';
import { LABEL, opsi, usePilihan, hariIni } from './Bersama';
import { tanggal } from '../../components/pantauan/Kerangka';

const WARNA = { EFEKTIF: 'success', SEBAGIAN_EFEKTIF: 'warning', TIDAK_EFEKTIF: 'error' };

const TestResults = () => {
  const { kontrol, pengguna } = usePilihan();
  const [jadwal, setJadwal] = useState([]);
  const muatJadwal = () => api.get('/jadwal-pengujian').then((d) => setJadwal(d.filter((j) => j.status === 'DIJADWALKAN')
    .map((j) => [j.id, `${tanggal(j.tanggal_jadwal)} · ${j.kontrol.nama}`]))).catch(() => {});
  useEffect(() => { muatJadwal(); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Hasil Pengujian</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Peringkat efektivitas 1 (sangat lemah) sampai 5 (sangat kuat).</Typography>
      <TabelKelola
        endpoint="/hasil-pengujian"
        judulForm="Hasil Pengujian"
        onBerubah={muatJadwal}
        kosong={{ jenis_pengujian: 'DESAIN', hasil: 'EFEKTIF', peringkat_efektivitas: 4, jumlah_pengecualian: 0, tanggal_uji: hariIni() }}
        medan={[
          { k: 'kontrol_id', label: 'Kontrol', jenis: 'pilih', opsi: kontrol, wajib: true },
          { k: 'jadwal_id', label: 'Dari jadwal (opsional)', jenis: 'pilih', opsi: jadwal },
          { k: 'tanggal_uji', label: 'Tanggal uji', jenis: 'tanggal', wajib: true },
          { k: 'penguji_id', label: 'Penguji', jenis: 'pilih', opsi: pengguna },
          { k: 'jenis_pengujian', label: 'Jenis pengujian', jenis: 'pilih', opsi: opsi('DESAIN', 'OPERASIONAL', 'KEDUANYA'), wajib: true },
          { k: 'hasil', label: 'Hasil', jenis: 'pilih', opsi: opsi('EFEKTIF', 'SEBAGIAN_EFEKTIF', 'TIDAK_EFEKTIF'), wajib: true },
          { k: 'peringkat_efektivitas', label: 'Peringkat (1-5)', jenis: 'pilih', opsi: [1, 2, 3, 4, 5].map((n) => [n, String(n)]), wajib: true },
          { k: 'ukuran_sampel', label: 'Ukuran sampel', jenis: 'angka' },
          { k: 'jumlah_pengecualian', label: 'Jumlah pengecualian', jenis: 'angka' },
          { k: 'catatan', label: 'Catatan', jenis: 'panjang' },
        ]}
        kolom={[
          { label: 'Tanggal', isi: (h) => tanggal(h.tanggal_uji) },
          { label: 'Kontrol', isi: (h) => h.kontrol.nama },
          { label: 'Jenis', isi: (h) => LABEL[h.jenis_pengujian] },
          { label: 'Hasil', isi: (h) => <Chip size="small" color={WARNA[h.hasil]} label={LABEL[h.hasil]} /> },
          { label: 'Peringkat', align: 'right', isi: (h) => `${h.peringkat_efektivitas}/5` },
          { label: 'Sampel / pengecualian', align: 'right', isi: (h) => `${h.ukuran_sampel ?? '-'} / ${h.jumlah_pengecualian}` },
          { label: 'Penguji', isi: (h) => h.penguji?.nama || '-' },
        ]}
      />
    </Box>
  );
};

export default TestResults;
