import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import TabelKelola from '../../components/TabelKelola';
import { api } from '../../services/api';
import { LABEL, opsi, usePilihan, hariIni } from './Bersama';
import { BarisKpi, PilihDari, tanggal } from '../../components/pantauan/Kerangka';

const HARI = 864e5;

const DeficiencyTracking = () => {
  const { kontrol, pengguna } = usePilihan();
  const [status, setStatus] = useState('');
  const [data, setData] = useState([]);
  const muatKpi = () => api.get('/defisiensi').then(setData).catch(() => {});
  useEffect(() => { muatKpi(); }, []);

  const terbuka = data.filter((d) => ['TERBUKA', 'BERJALAN'].includes(d.status));
  const lewat = terbuka.filter((d) => d.tanggal_target && new Date(d.tanggal_target) < new Date());
  const rataHari = terbuka.length ? Math.round(terbuka.reduce((t, d) => t + (Date.now() - new Date(d.tanggal_identifikasi)) / HARI, 0) / terbuka.length) : 0;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={3}>Kelemahan kontrol dari hasil pengujian dan tindak lanjutnya.</Typography>
      <BarisKpi data={[
        { label: 'Masih terbuka', nilai: terbuka.length },
        { label: 'Tinggi / kritis', nilai: terbuka.filter((d) => ['TINGGI', 'KRITIS'].includes(d.tingkat_keparahan)).length },
        { label: 'Lewat target', nilai: lewat.length },
        { label: 'Rata-rata umur', nilai: `${rataHari} hari`, ket: 'Defisiensi yang masih terbuka' },
      ]} />
      <Box mb={2}><PilihDari label="Status" value={status} onChange={setStatus} opsi={opsi('TERBUKA', 'BERJALAN', 'SELESAI', 'DITUTUP')} /></Box>
      <TabelKelola
        endpoint="/defisiensi"
        judulForm="Defisiensi"
        onBerubah={muatKpi}
        saring={(d) => !status || d.status === status}
        kosong={{ tingkat_keparahan: 'SEDANG', status: 'TERBUKA', tanggal_identifikasi: hariIni() }}
        medan={[
          { k: 'judul', label: 'Judul', wajib: true, lebar: 12 },
          { k: 'kontrol_id', label: 'Kontrol', jenis: 'pilih', opsi: kontrol },
          { k: 'kategori', label: 'Kategori' },
          { k: 'tingkat_keparahan', label: 'Tingkat keparahan', jenis: 'pilih', opsi: opsi('RENDAH', 'SEDANG', 'TINGGI', 'KRITIS') },
          { k: 'status', label: 'Status', jenis: 'pilih', opsi: opsi('TERBUKA', 'BERJALAN', 'SELESAI', 'DITUTUP') },
          { k: 'ditugaskan_ke_id', label: 'Ditugaskan ke', jenis: 'pilih', opsi: pengguna },
          { k: 'tanggal_identifikasi', label: 'Tanggal identifikasi', jenis: 'tanggal', wajib: true },
          { k: 'tanggal_target', label: 'Target selesai', jenis: 'tanggal' },
          { k: 'deskripsi', label: 'Deskripsi', jenis: 'panjang' },
          { k: 'akar_masalah', label: 'Akar masalah', jenis: 'panjang' },
          { k: 'dampak_risiko', label: 'Dampak risiko', jenis: 'panjang' },
          { k: 'rekomendasi', label: 'Rekomendasi', jenis: 'panjang' },
        ]}
        kolom={[
          { label: 'Defisiensi', isi: (d) => <><strong>{d.judul}</strong><Typography variant="caption" display="block" color="text.secondary">{d.kontrol?.nama || '-'}</Typography></> },
          { label: 'Keparahan', isi: (d) => LABEL[d.tingkat_keparahan] },
          { label: 'Status', isi: (d) => LABEL[d.status] },
          { label: 'Ditugaskan', isi: (d) => d.ditugaskan_ke?.nama || '-' },
          { label: 'Identifikasi', isi: (d) => tanggal(d.tanggal_identifikasi) },
          { label: 'Target', isi: (d) => tanggal(d.tanggal_target) },
        ]}
      />
    </Box>
  );
};

export default DeficiencyTracking;
