import React from 'react';
import { Box, Typography } from '@mui/material';
import TabelKelola from '../../components/TabelKelola';
import { LABEL, opsi, usePilihan, hariIni } from './Bersama';
import { tanggal } from '../../components/pantauan/Kerangka';

const TestingSchedule = () => {
  const { kontrol, pengguna } = usePilihan();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Jadwal Pengujian</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Jadwal ditandai selesai otomatis saat hasil pengujiannya dicatat.</Typography>
      <TabelKelola
        endpoint="/jadwal-pengujian"
        judulForm="Jadwal"
        kosong={{ jenis_pengujian: 'DESAIN', tanggal_jadwal: hariIni() }}
        medan={[
          { k: 'kontrol_id', label: 'Kontrol', jenis: 'pilih', opsi: kontrol, wajib: true, lebar: 12 },
          { k: 'tanggal_jadwal', label: 'Tanggal', jenis: 'tanggal', wajib: true },
          { k: 'jenis_pengujian', label: 'Jenis pengujian', jenis: 'pilih', opsi: opsi('DESAIN', 'OPERASIONAL', 'KEDUANYA'), wajib: true },
          { k: 'penguji_id', label: 'Penguji', jenis: 'pilih', opsi: pengguna },
          { k: 'status', label: 'Status', jenis: 'pilih', opsi: opsi('DIJADWALKAN', 'SELESAI', 'DIBATALKAN') },
          { k: 'catatan', label: 'Catatan', jenis: 'panjang' },
        ]}
        kolom={[
          { label: 'Tanggal', isi: (j) => tanggal(j.tanggal_jadwal) },
          { label: 'Kontrol', isi: (j) => j.kontrol.nama },
          { label: 'Jenis', isi: (j) => LABEL[j.jenis_pengujian] },
          { label: 'Penguji', isi: (j) => j.penguji?.nama || '-' },
          { label: 'Status', isi: (j) => LABEL[j.status] },
        ]}
      />
    </Box>
  );
};

export default TestingSchedule;
