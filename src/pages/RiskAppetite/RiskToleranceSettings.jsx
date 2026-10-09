import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import TabelKelola from '../../components/TabelKelola';
import { api } from '../../services/api';

const TINGKAT = [['rendah', 'Rendah'], ['sedang', 'Sedang'], ['tinggi', 'Tinggi']];
export const teksBatas = (b) => TINGKAT.map(([k, l]) => `${l} ${b?.[k]?.min}–${b?.[k]?.maks}`).join(' · ');

// Pernyataan selera risiko per kategori; batas toleransi memakai skor residual.
const RiskToleranceSettings = () => {
  const [kategori, setKategori] = useState([]);
  useEffect(() => { api.get('/kategori-risiko').then((d) => setKategori(d.map((k) => [k.id, k.nama]))).catch(() => {}); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Toleransi Risiko</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Batas skor residual per kategori. Risiko di atas batas "Sedang" dianggap melampaui selera risiko.
      </Typography>
      <TabelKelola
        endpoint="/pernyataan-selera-risiko"
        judulForm="Pernyataan Selera Risiko"
        kosong={{ aktif: 'true', rendah_min: 1, rendah_maks: 4, sedang_min: 5, sedang_maks: 12, tinggi_min: 13, tinggi_maks: 25 }}
        keForm={(p) => ({ ...p, aktif: String(p.aktif),
          ...Object.fromEntries(TINGKAT.flatMap(([k]) => [[`${k}_min`, p.batas_toleransi?.[k]?.min], [`${k}_maks`, p.batas_toleransi?.[k]?.maks]])) })}
        keBody={({ aktif, kategori_id, pernyataan, proses_eskalasi, ...b }) => ({
          aktif: aktif !== 'false', kategori_id, pernyataan, proses_eskalasi,
          batas_toleransi: Object.fromEntries(TINGKAT.map(([k]) => [k, { min: b[`${k}_min`], maks: b[`${k}_maks`] }])),
        })}
        medan={[
          { k: 'kategori_id', label: 'Kategori risiko', jenis: 'pilih', opsi: kategori },
          { k: 'aktif', label: 'Status', jenis: 'pilih', opsi: [['true', 'Aktif'], ['false', 'Nonaktif']] },
          { k: 'pernyataan', label: 'Pernyataan selera risiko', jenis: 'panjang', wajib: true },
          ...TINGKAT.flatMap(([k, l]) => [
            { k: `${k}_min`, label: `${l}: skor min`, jenis: 'angka', wajib: true, lebar: 2 },
            { k: `${k}_maks`, label: `${l}: skor maks`, jenis: 'angka', wajib: true, lebar: 2 },
          ]),
          { k: 'proses_eskalasi', label: 'Proses eskalasi', jenis: 'panjang' },
        ]}
        kolom={[
          { label: 'Kategori', isi: (p) => p.kategori?.nama || 'Semua kategori' },
          { label: 'Pernyataan', isi: (p) => p.pernyataan },
          { label: 'Batas skor', isi: (p) => teksBatas(p.batas_toleransi) },
          { label: 'Status', isi: (p) => (p.aktif ? 'Aktif' : 'Nonaktif') },
        ]}
      />
    </Box>
  );
};

export default RiskToleranceSettings;
