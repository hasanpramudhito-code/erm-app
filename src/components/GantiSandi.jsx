import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { api } from '../services/api';

const KOSONG = { sandi_lama: '', sandi_baru: '', ulang: '' };

// Ganti kata sandi sendiri. Perangkat lain yang sedang login akan keluar otomatis.
const GantiSandi = ({ open, onTutup }) => {
  const [form, setForm] = useState(KOSONG);
  const [error, setError] = useState('');
  const [berhasil, setBerhasil] = useState(false);
  const [proses, setProses] = useState(false);

  const tutup = () => { setForm(KOSONG); setError(''); setBerhasil(false); onTutup(); };
  const simpan = async (e) => {
    e.preventDefault();
    if (form.sandi_baru !== form.ulang) return setError('Ulangi kata sandi baru tidak sama');
    setProses(true);
    setError('');
    try {
      await api.post('/auth/ganti-sandi', { sandi_lama: form.sandi_lama, sandi_baru: form.sandi_baru });
      setBerhasil(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setProses(false);
    }
  };
  const isian = (k, label, extra = {}) => (
    <TextField fullWidth margin="dense" type="password" label={label} value={form[k]} required
      autoComplete={k === 'sandi_lama' ? 'current-password' : 'new-password'}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...extra} />
  );

  return (
    <Dialog open={open} onClose={tutup} maxWidth="xs" fullWidth>
      <form onSubmit={simpan}>
        <DialogTitle>Ganti Kata Sandi</DialogTitle>
        <DialogContent>
          {berhasil ? (
            <Alert severity="success">Kata sandi diganti. Perangkat lain yang sedang login sudah dikeluarkan.</Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
              {isian('sandi_lama', 'Kata sandi lama')}
              {isian('sandi_baru', 'Kata sandi baru', { helperText: 'Minimal 10 karakter', inputProps: { minLength: 10 } })}
              {isian('ulang', 'Ulangi kata sandi baru')}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={tutup}>{berhasil ? 'Tutup' : 'Batal'}</Button>
          {!berhasil && <Button type="submit" variant="contained" disabled={proses}>Simpan</Button>}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GantiSandi;
