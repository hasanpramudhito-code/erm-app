import React, { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, TextField, Typography
} from '@mui/material';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { LABEL_PERSETUJUAN } from '../../services/risiko';

const PIMPINAN = ['PIMPINAN_UNIT_PUSAT', 'PIMPINAN_CABANG'];
const PETUGAS = ['PETUGAS_RISIKO_PUSAT', 'PETUGAS_RISIKO_CABANG'];
const ADMIN = ['ADMIN_SISTEM', 'DIREKSI'];

const LABEL_AKSI = {
  ajukan: 'Ajukan', setujui: 'Setujui', finalkan: 'Verifikasi Final', kembalikan: 'Kembalikan', buka: 'Buka Kunci',
};
const WARNA_AKSI = { ajukan: 'primary', setujui: 'success', finalkan: 'success', kembalikan: 'warning', buka: 'warning' };
const BUTUH_CATATAN = ['kembalikan', 'buka'];

// Aksi yang tampil untuk pengguna ini. Server tetap memeriksa ulang; ini hanya untuk tampilan.
export function aksiTersedia(userData, status, unitId) {
  const peran = userData?.peran || [];
  const ada = (d) => peran.some((p) => d.includes(p));
  const unitSendiri = userData?.unit_id === unitId;
  const admin = ada(ADMIN);
  const hasil = [];
  if (['DRAF', 'DIKEMBALIKAN'].includes(status) && (admin || ((ada(PETUGAS) || ada(PIMPINAN)) && unitSendiri))) hasil.push('ajukan');
  if (status === 'DIAJUKAN' && (admin || (ada(PIMPINAN) && unitSendiri))) hasil.push('setujui', 'kembalikan');
  if (status === 'DISETUJUI_PIMPINAN' && (admin || ada(['PENGELOLA_RISIKO']))) hasil.push('finalkan', 'kembalikan');
  if (status === 'FINAL' && (admin || ada(['PENGELOLA_RISIKO']))) hasil.push('buka');
  return hasil;
}

// Tombol aksi persetujuan + dialog konfirmasi/catatan + riwayat.
const AksiPersetujuan = ({ entitas, id, status, unitId, onSelesai, tampilRiwayat = true }) => {
  const { userData } = useAuth();
  const [aksi, setAksi] = useState(null);
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');
  const [proses, setProses] = useState(false);
  const [riwayat, setRiwayat] = useState(null);

  const daftar = aksiTersedia(userData, status, unitId);

  const jalankan = async () => {
    setProses(true);
    setError('');
    try {
      await api.post(`/persetujuan/${entitas}/${id}/${aksi}`, { catatan });
      setAksi(null);
      setCatatan('');
      onSelesai?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setProses(false);
    }
  };

  const bukaRiwayat = () => api.get(`/persetujuan/${entitas}/${id}/riwayat`).then(setRiwayat).catch((e) => setError(e.message));

  return (
    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
      {daftar.map((a) => (
        <Button key={a} size="small" variant={a === 'kembalikan' || a === 'buka' ? 'outlined' : 'contained'} color={WARNA_AKSI[a]}
          onClick={() => { setAksi(a); setError(''); }}>
          {LABEL_AKSI[a]}
        </Button>
      ))}
      {tampilRiwayat && <Button size="small" onClick={bukaRiwayat}>Riwayat</Button>}

      <Dialog open={!!aksi} onClose={() => setAksi(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{LABEL_AKSI[aksi]}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="body2" gutterBottom>
            {aksi === 'ajukan' && 'Setelah diajukan, data terkunci dan tidak dapat diubah sampai dikembalikan.'}
            {aksi === 'setujui' && 'Data akan diteruskan ke Pengelola Risiko Pusat untuk verifikasi final.'}
            {aksi === 'finalkan' && 'Data menjadi FINAL, terkunci, dan masuk perhitungan agregasi.'}
            {aksi === 'kembalikan' && 'Data dikembalikan ke unit untuk diperbaiki. Tuliskan apa yang perlu diperbaiki.'}
            {aksi === 'buka' && 'Data FINAL dibuka kembali agar unit dapat merevisi. Tuliskan alasannya.'}
          </Typography>
          <TextField
            fullWidth multiline minRows={3} sx={{ mt: 1 }}
            label={BUTUH_CATATAN.includes(aksi) ? 'Catatan (wajib)' : 'Catatan (opsional)'}
            value={catatan} onChange={(e) => setCatatan(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAksi(null)}>Batal</Button>
          <Button variant="contained" color={WARNA_AKSI[aksi]} onClick={jalankan}
            disabled={proses || (BUTUH_CATATAN.includes(aksi) && !catatan.trim())}>
            {proses ? 'Memproses...' : LABEL_AKSI[aksi]}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!riwayat} onClose={() => setRiwayat(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Riwayat Persetujuan</DialogTitle>
        <DialogContent>
          {riwayat?.length === 0 && <Alert severity="info">Belum ada riwayat persetujuan.</Alert>}
          <List dense>
            {riwayat?.map((h) => (
              <ListItem key={h.id} divider>
                <ListItemText
                  primary={`${LABEL_PERSETUJUAN[h.dari_status]} → ${LABEL_PERSETUJUAN[h.ke_status]} · ${h.pengguna?.nama}`}
                  secondary={<>{new Date(h.dibuat_pada).toLocaleString('id-ID')}{h.catatan && <><br />Catatan: {h.catatan}</>}</>}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setRiwayat(null)}>Tutup</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default AksiPersetujuan;
