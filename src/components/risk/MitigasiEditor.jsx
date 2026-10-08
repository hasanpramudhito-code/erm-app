import React from 'react';
import {
  Box, Button, Grid, IconButton, MenuItem, Paper, TextField, Typography, Chip, Alert
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { LABEL_JENIS_MITIGASI, LABEL_PRIORITAS_SINGKAT, LABEL_STATUS_MITIGASI } from '../../services/risiko';

const BARU = { uraian: '', jenis: 'MITIGASI', penanggung_jawab_id: '', target_waktu: '', anggaran: '', prioritas: 'SEDANG' };

// Daftar rencana mitigasi dalam form risiko. Status & progres diisi saat pemantauan bulanan.
const MitigasiEditor = ({ value = [], onChange, pengguna = [] }) => {
  const ubah = (i, kunci, v) => onChange(value.map((m, j) => (j === i ? { ...m, [kunci]: v } : m)));
  const hapus = (i) => onChange(value.filter((_, j) => j !== i));
  const total = value.reduce((t, m) => t + Number(m.anggaran || 0), 0);

  return (
    <Box>
      {value.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>Belum ada rencana mitigasi. Klik "Tambah Mitigasi".</Alert>
      )}
      {value.map((m, i) => (
        <Paper key={m.id ?? `baru-${i}`} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              Mitigasi #{i + 1}
              {m.status && <Chip size="small" sx={{ ml: 1 }} label={`${LABEL_STATUS_MITIGASI[m.status]} · ${m.progres ?? 0}%`} />}
            </Typography>
            <IconButton size="small" color="error" onClick={() => hapus(i)} aria-label={`Hapus mitigasi ${i + 1}`}>
              <Trash2 size={18} />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth required multiline minRows={2} label="Uraian rencana mitigasi"
                value={m.uraian} onChange={(e) => ubah(i, 'uraian', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Jenis" value={m.jenis} onChange={(e) => ubah(i, 'jenis', e.target.value)}>
                {Object.entries(LABEL_JENIS_MITIGASI).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Prioritas" value={m.prioritas} onChange={(e) => ubah(i, 'prioritas', e.target.value)}>
                {Object.entries(LABEL_PRIORITAS_SINGKAT).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select fullWidth label="Penanggung Jawab" value={m.penanggung_jawab_id}
                onChange={(e) => ubah(i, 'penanggung_jawab_id', e.target.value)}
              >
                <MenuItem value="">-</MenuItem>
                {pengguna.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth type="date" label="Target Waktu" InputLabelProps={{ shrink: true }}
                value={m.target_waktu} onChange={(e) => ubah(i, 'target_waktu', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth type="number" label="Anggaran (Rp)" inputProps={{ min: 0 }}
                value={m.anggaran} onChange={(e) => ubah(i, 'anggaran', e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>
      ))}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button startIcon={<Plus size={18} />} onClick={() => onChange([...value, { ...BARU }])}>Tambah Mitigasi</Button>
        {total > 0 && <Typography variant="body2">Total anggaran: Rp {total.toLocaleString('id-ID')}</Typography>}
      </Box>
    </Box>
  );
};

export default MitigasiEditor;
