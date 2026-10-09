import React from 'react';
import { Box, Card, CardContent, Grid, MenuItem, TextField, Typography } from '@mui/material';

// Kerangka halaman pantauan: judul, satu baris filter, baris KPI.
export const KepalaPantauan = ({ ikon, judul, keterangan, children }) => (
  <Box mb={2}>
    <Box display="flex" alignItems="center" gap={2} mb={2}>
      {ikon}
      <Box>
        <Typography variant="h4">{judul}</Typography>
        <Typography variant="body2" color="text.secondary">{keterangan}</Typography>
      </Box>
    </Box>
    <Box display="flex" gap={2} flexWrap="wrap">{children}</Box>
  </Box>
);

export const PilihPeriode = ({ daftar, value, onChange }) => (
  <TextField select size="small" label="Periode" sx={{ minWidth: 130 }} value={value || ''} onChange={(e) => onChange(e.target.value)}>
    {daftar.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
  </TextField>
);

export const PilihDari = ({ label, value, onChange, opsi, minWidth = 160 }) => (
  <TextField select size="small" label={label} sx={{ minWidth }} value={value} onChange={(e) => onChange(e.target.value)}>
    <MenuItem value="">Semua</MenuItem>
    {opsi.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
  </TextField>
);

export const BarisKpi = ({ data }) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {data.map(({ label, nilai, ket }) => (
      <Grid item xs={6} md={12 / Math.min(data.length, 6)} key={label}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h4" fontWeight={600} sx={{ my: 0.5 }}>{nilai}</Typography>
            {ket && <Typography variant="caption" color="text.secondary">{ket}</Typography>}
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

// Penanda level/status: kotak warna + teks (identitas tidak hanya warna).
export const Penanda = ({ warna, teks }) => (
  <Box component="span" display="inline-flex" alignItems="center" gap={0.75}>
    <Box component="span" sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: warna, flexShrink: 0 }} />
    <Typography component="span" variant="body2" sx={{ whiteSpace: 'nowrap' }}>{teks}</Typography>
  </Box>
);

export const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
// Ringkas untuk kartu angka: Rp 795 jt, Rp 1,2 M.
export const rupiahRingkas = (n) => {
  const v = Number(n || 0);
  if (v >= 1e12) return `Rp ${(v / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
  if (v >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  return rupiah(v);
};
export const tanggal = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');
