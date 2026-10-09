import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Grid, MenuItem, Paper, Snackbar, TextField, Typography } from '@mui/material';
import { Save } from 'lucide-react';
import { api } from '../services/api';
import { LABEL_FREKUENSI_PEMANTAUAN } from '../services/risiko';
import { muatIdentitas } from '../services/identitas';

// Pengaturan sistem (khusus admin): identitas, pemantauan, tampilan. Hanya opsi yang benar-benar dipakai aplikasi.
const SystemSettings = () => {
  const [form, setForm] = useState(null);
  const [simpan, setSimpan] = useState(false);
  const [pesan, setPesan] = useState(null);

  useEffect(() => {
    api.get('/pengaturan')
      .then((p) => setForm({
        nama_perusahaan: p.nama_perusahaan || '',
        frekuensi: p.frekuensi_pemantauan || 1,
        tenggat: p.tenggat_pemantauan || 10,
        ui: p.ui || {},
      }))
      .catch((e) => setPesan({ jenis: 'error', teks: e.message }));
  }, []);

  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSimpan = async () => {
    setSimpan(true);
    try {
      await Promise.all([
        api.put('/pengaturan/nama_perusahaan', { nilai: form.nama_perusahaan.trim() }).then(() => muatIdentitas(true)),
        api.put('/pengaturan/frekuensi_pemantauan', { nilai: Number(form.frekuensi) }),
        api.put('/pengaturan/tenggat_pemantauan', { nilai: Number(form.tenggat) }),
        api.put('/pengaturan/ui', { nilai: form.ui }),
      ]);
      setPesan({ jenis: 'success', teks: 'Pengaturan disimpan. Tema berlaku setelah halaman dimuat ulang.' });
    } catch (e) {
      setPesan({ jenis: 'error', teks: e.message });
    } finally {
      setSimpan(false);
    }
  };

  if (!form) return <Box textAlign="center" p={5}>{pesan ? <Alert severity="error">{pesan.teks}</Alert> : <CircularProgress />}</Box>;

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Identitas</Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField fullWidth label="Nama perusahaan" value={form.nama_perusahaan} onChange={ubah('nama_perusahaan')}
              helperText="Tampil di halaman login, sidebar, judul tab, dan laporan" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Tampilan</Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField select fullWidth label="Tema" value={form.ui.themeMode || 'light'}
              onChange={(e) => setForm({ ...form, ui: { ...form.ui, themeMode: e.target.value } })}>
              <MenuItem value="light">Terang</MenuItem>
              <MenuItem value="dark">Gelap</MenuItem>
            </TextField>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Pemantauan</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField select label="Frekuensi pemantauan" value={form.frekuensi} onChange={ubah('frekuensi')} sx={{ minWidth: 240 }}
                helperText="Berlaku untuk seluruh unit kerja">
                {Object.entries(LABEL_FREKUENSI_PEMANTAUAN).map(([k, l]) => <MenuItem key={k} value={Number(k)}>{l}</MenuItem>)}
              </TextField>
              <TextField type="number" label="Tenggat (tanggal)" value={form.tenggat} onChange={ubah('tenggat')} sx={{ width: 220 }}
                inputProps={{ min: 1, max: 28 }} helperText="Tanggal di bulan setelah masa berakhir" />
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              Contoh triwulanan dengan tenggat 10: laporan Triwulan I (Januari–Maret) paling lambat 10 April.
              Ubah frekuensi di awal periode; laporan masa lama tetap tersimpan.
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSimpan} disabled={simpan}>
          {simpan ? 'Menyimpan...' : 'Simpan pengaturan'}
        </Button>
      </Box>

      <Snackbar open={!!pesan} autoHideDuration={5000} onClose={() => setPesan(null)}>
        {pesan ? <Alert severity={pesan.jenis} onClose={() => setPesan(null)}>{pesan.teks}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;
