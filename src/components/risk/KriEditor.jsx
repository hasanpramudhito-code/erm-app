import React from 'react';
import {
  Box, Button, Grid, IconButton, MenuItem, Paper, TextField, Typography, Chip, Alert
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { LABEL_ARAH, LABEL_FREKUENSI, LABEL_STATUS_KRI } from '../../services/risiko';

const BARU = {
  nama: '', deskripsi: '', satuan: '', ambang_hijau: '', ambang_kuning: '', ambang_merah: '', arah_target: 'LEBIH_RENDAH', frekuensi: 'BULANAN', pemilik_id: '',
  rumus: 'LANGSUNG', label_pembilang: '', label_penyebut: '', pengali: 100,
};
// Contoh siap pakai untuk KRI rasio yang umum di PDAM.
const CONTOH = [
  { nama: 'Tingkat kehilangan air (NRW)', satuan: '%', rumus: 'RASIO', label_pembilang: 'Air hilang (m³)', label_penyebut: 'Air didistribusikan (m³)', arah_target: 'LEBIH_RENDAH', ambang_hijau: 20, ambang_kuning: 25, ambang_merah: 30 },
  { nama: 'Efektivitas penagihan', satuan: '%', rumus: 'RASIO', label_pembilang: 'Rekening tertagih (Rp)', label_penyebut: 'Total tagihan (Rp)', arah_target: 'LEBIH_TINGGI', ambang_hijau: 95, ambang_kuning: 90, ambang_merah: 85 },
];
const WARNA = { HIJAU: 'success', KUNING: 'warning', MERAH: 'error', NONAKTIF: 'default' };

// Definisi KRI dalam form risiko. Nilai aktual diisi saat pemantauan bulanan.
const KriEditor = ({ value = [], onChange, pengguna = [] }) => {
  const ubah = (i, kunci, v) => onChange(value.map((k, j) => (j === i ? { ...k, [kunci]: v } : k)));
  const hapus = (i) => onChange(value.filter((_, j) => j !== i));

  return (
    <Box>
      {value.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>Belum ada KRI untuk risiko ini. Klik "Tambah KRI".</Alert>
      )}
      {value.map((k, i) => {
        const rendah = k.arah_target === 'LEBIH_RENDAH';
        return (
          <Paper key={k.id ?? `baru-${i}`} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                KRI #{i + 1}
                {k.status && (
                  <Chip
                    size="small" sx={{ ml: 1 }} color={WARNA[k.status]}
                    label={k.nilai_sekarang != null ? `${LABEL_STATUS_KRI[k.status]} · ${k.nilai_sekarang} ${k.satuan || ''}` : LABEL_STATUS_KRI[k.status]}
                  />
                )}
              </Typography>
              <IconButton size="small" color="error" onClick={() => hapus(i)} aria-label={`Hapus KRI ${i + 1}`}>
                <Trash2 size={18} />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth required label="Nama indikator" value={k.nama} onChange={(e) => ubah(i, 'nama', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Satuan" placeholder="%, kali, m³, jam" value={k.satuan} onChange={(e) => ubah(i, 'satuan', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label="Cara menghitung" value={k.rumus || 'LANGSUNG'} onChange={(e) => ubah(i, 'rumus', e.target.value)}>
                  <MenuItem value="LANGSUNG">Isi nilai langsung</MenuItem>
                  <MenuItem value="RASIO">Hitung dari dua angka</MenuItem>
                </TextField>
              </Grid>
              {k.rumus === 'RASIO' && (
                <>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth required label="Angka pembilang" placeholder="Air hilang (m³)" value={k.label_pembilang || ''} onChange={(e) => ubah(i, 'label_pembilang', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth required label="Angka penyebut" placeholder="Air didistribusikan (m³)" value={k.label_penyebut || ''} onChange={(e) => ubah(i, 'label_penyebut', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth type="number" label="Pengali" value={k.pengali ?? 100} onChange={(e) => ubah(i, 'pengali', e.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Nilai KRI = {k.label_pembilang || 'pembilang'} ÷ {k.label_penyebut || 'penyebut'} × {k.pengali ?? 100}. Saat pemantauan, petugas mengisi kedua angka; nilai dihitung otomatis.
                    </Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <TextField fullWidth multiline label="Cara ukur / keterangan" value={k.deskripsi} onChange={(e) => ubah(i, 'deskripsi', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Arah" value={k.arah_target} onChange={(e) => ubah(i, 'arah_target', e.target.value)}>
                  {Object.entries(LABEL_ARAH).map(([a, l]) => <MenuItem key={a} value={a}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Frekuensi" value={k.frekuensi} onChange={(e) => ubah(i, 'frekuensi', e.target.value)}>
                  {Object.entries(LABEL_FREKUENSI).map(([a, l]) => <MenuItem key={a} value={a}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              {[['ambang_hijau', 'Batas Hijau'], ['ambang_kuning', 'Batas Kuning'], ['ambang_merah', 'Batas Merah']].map(([kunci, label]) => (
                <Grid item xs={12} sm={4} key={kunci}>
                  <TextField fullWidth required type="number" label={label} value={k[kunci]} onChange={(e) => ubah(i, kunci, e.target.value)} />
                </Grid>
              ))}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  {rendah
                    ? 'Makin rendah makin baik: isi Hijau ≤ Kuning ≤ Merah. Nilai ≥ batas Merah berstatus merah.'
                    : 'Makin tinggi makin baik: isi Hijau ≥ Kuning ≥ Merah. Nilai ≤ batas Merah berstatus merah.'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Pemilik KRI" value={k.pemilik_id} onChange={(e) => ubah(i, 'pemilik_id', e.target.value)}>
                  <MenuItem value="">-</MenuItem>
                  {pengguna.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </Paper>
        );
      })}
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button startIcon={<Plus size={18} />} onClick={() => onChange([...value, { ...BARU }])}>Tambah KRI</Button>
        {CONTOH.map((c) => (
          <Button key={c.nama} size="small" variant="outlined" onClick={() => onChange([...value, { ...BARU, ...c }])}>+ {c.nama}</Button>
        ))}
      </Box>
    </Box>
  );
};

export default KriEditor;
