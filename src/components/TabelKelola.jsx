import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const PERAN_PENGELOLA = ['ADMIN_SISTEM', 'PENGELOLA_RISIKO'];
export const bisaKelola = (userData) => PERAN_PENGELOLA.some((p) => userData?.peran?.includes(p));
export const tanggalInput = (d) => (d ? String(d).slice(0, 10) : '');

// Daftar + dialog tambah/ubah untuk satu endpoint CRUD.
// medan: [{k, label, jenis: 'teks'|'panjang'|'tanggal'|'angka'|'pilih', opsi: [[nilai, label]], wajib, lebar}]
// kolom: [{label, isi: (baris) => node, align}]. `keForm`/`keBody` opsional: ubah baris API ke nilai form dan sebaliknya.
const TabelKelola = ({ endpoint, medan, kolom, judulForm, kosong = {}, keForm, keBody = (b) => b, saring = () => true, onBerubah }) => {
  const { userData } = useAuth();
  const boleh = bisaKelola(userData);
  const [data, setData] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [errorForm, setErrorForm] = useState('');

  const muat = () => api.get(endpoint).then(setData).catch((e) => setError(e.message));
  useEffect(() => { muat(); }, [endpoint]);

  const buka = (baris) => {
    setErrorForm('');
    if (!baris) return setForm({ ...kosong });
    const nilai = keForm ? keForm(baris) : baris;
    setForm({ id: baris.id, ...Object.fromEntries(medan.map((m) => [m.k, m.jenis === 'tanggal' ? tanggalInput(nilai[m.k]) : nilai[m.k] ?? ''])) });
  };

  const simpan = async () => {
    const { id, ...isi } = form;
    const kurang = medan.find((m) => m.wajib && (isi[m.k] === '' || isi[m.k] == null));
    if (kurang) return setErrorForm(`${kurang.label} wajib diisi`);
    const body = keBody(Object.fromEntries(medan.map((m) => [m.k, isi[m.k] === '' ? null : isi[m.k]])));
    try {
      await (id ? api.patch(`${endpoint}/${id}`, body) : api.post(endpoint, body));
      setForm(null);
      await muat();
      onBerubah?.();
    } catch (e) { setErrorForm(e.message); }
  };

  const hapus = async (baris) => {
    if (!window.confirm('Hapus data ini?')) return;
    try { await api.delete(`${endpoint}/${baris.id}`); await muat(); onBerubah?.(); } catch (e) { setError(e.message); }
  };

  const tampil = data.filter(saring);
  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {boleh && <Box mb={2}><Button variant="contained" startIcon={<Add />} onClick={() => buka(null)}>Tambah</Button></Box>}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {kolom.map((c) => <TableCell key={c.label} align={c.align}>{c.label}</TableCell>)}
                {boleh && <TableCell align="right">Aksi</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {tampil.length === 0 && <TableRow><TableCell colSpan={kolom.length + 1} align="center">Belum ada data.</TableCell></TableRow>}
              {tampil.map((b) => (
                <TableRow key={b.id} hover>
                  {kolom.map((c) => <TableCell key={c.label} align={c.align}>{c.isi(b)}</TableCell>)}
                  {boleh && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ubah"><IconButton size="small" aria-label="Ubah" onClick={() => buka(b)}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Hapus"><IconButton size="small" aria-label="Hapus" color="error" onClick={() => hapus(b)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="md" fullWidth>
        <DialogTitle>{form?.id ? `Ubah ${judulForm}` : `Tambah ${judulForm}`}</DialogTitle>
        <DialogContent dividers>
          {errorForm && <Alert severity="error" sx={{ mb: 2 }}>{errorForm}</Alert>}
          {form && (
            <Grid container spacing={2}>
              {medan.map((m) => (
                <Grid item xs={12} sm={m.lebar || (m.jenis === 'panjang' ? 12 : 6)} key={m.k}>
                  <TextField
                    fullWidth size="small" label={m.label} required={m.wajib} value={form[m.k] ?? ''}
                    select={m.jenis === 'pilih'} multiline={m.jenis === 'panjang'} minRows={m.jenis === 'panjang' ? 2 : undefined}
                    type={m.jenis === 'tanggal' ? 'date' : m.jenis === 'angka' ? 'number' : 'text'}
                    InputLabelProps={m.jenis === 'tanggal' ? { shrink: true } : undefined}
                    onChange={(e) => setForm({ ...form, [m.k]: m.jenis === 'angka' && e.target.value !== '' ? Number(e.target.value) : e.target.value })}
                  >
                    {m.jenis === 'pilih' && [<MenuItem key="" value="">-</MenuItem>, ...m.opsi.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)]}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>Batal</Button>
          <Button variant="contained" onClick={simpan}>Simpan</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TabelKelola;
