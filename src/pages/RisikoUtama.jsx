import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Grid, IconButton, MenuItem, Paper, Snackbar, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Typography
} from '@mui/material';
import { Library, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const KOSONG = { kode: '', nama: '', deskripsi: '', berlaku_untuk: 'CABANG', kategori_id: '', direktorat_pemilik_id: '', aktif: true, penyebab: [], dampak: [] };

// Editor daftar uraian pustaka (id dipertahankan agar rujukan risiko tidak putus).
const DaftarPustaka = ({ label, value, onChange }) => (
  <Box>
    <Typography variant="subtitle2" gutterBottom>{label}</Typography>
    {value.map((v, i) => (
      <Box key={v.id ?? `baru-${i}`} display="flex" gap={1} mb={1}>
        <TextField fullWidth size="small" multiline value={v.uraian}
          onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, uraian: e.target.value } : x)))} />
        <IconButton size="small" color="error" aria-label={`Hapus ${label} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
          <Trash2 size={18} />
        </IconButton>
      </Box>
    ))}
    <Button size="small" startIcon={<Plus size={16} />} onClick={() => onChange([...value, { uraian: '' }])}>Tambah {label.toLowerCase()}</Button>
  </Box>
);

const RisikoUtama = () => {
  const { userData } = useAuth();
  const bolehUbah = userData?.peran?.some((p) => ['ADMIN_SISTEM', 'PENGELOLA_RISIKO'].includes(p));
  const [daftar, setDaftar] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [direktorat, setDirektorat] = useState([]);
  const [tab, setTab] = useState('CABANG');
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');

  const muat = () => Promise.all([api.get('/risiko-utama?semua=1'), api.get('/kategori-risiko'), api.get('/direktorat')])
    .then(([r, k, d]) => { setDaftar(r); setKategori(k); setDirektorat(d); })
    .catch((e) => setError(e.message));
  useEffect(() => { muat(); }, []);

  const buka = (r) => {
    setEditId(r?.id ?? null);
    setForm(r ? {
      kode: r.kode, nama: r.nama, deskripsi: r.deskripsi || '', berlaku_untuk: r.berlaku_untuk,
      kategori_id: r.kategori_id || '', direktorat_pemilik_id: r.direktorat_pemilik_id || '', aktif: r.aktif,
      penyebab: r.pustaka_penyebab, dampak: r.pustaka_dampak, terpakai: r._count.risiko,
    } : { ...KOSONG, berlaku_untuk: tab });
    setError('');
  };

  const simpan = async () => {
    try {
      const { terpakai, ...body } = form;
      const r = editId ? await api.patch(`/risiko-utama/${editId}`, body) : await api.post('/risiko-utama', body);
      setForm(null);
      setPesan(r.entri_dibuat ? `Tersimpan. ${r.entri_dibuat} entri risk register cabang dibentuk otomatis.` : 'Tersimpan');
      muat();
    } catch (e) {
      setError(e.message);
    }
  };

  const hapus = async (r) => {
    if (!window.confirm(`Hapus risiko utama ${r.kode}?`)) return;
    try {
      await api.delete(`/risiko-utama/${r.id}`);
      muat();
    } catch (e) {
      setError(e.message);
    }
  };

  const bentukEntri = async () => {
    try {
      const { dibuat } = await api.post('/risiko-utama/bentuk-entri', {});
      setPesan(dibuat ? `${dibuat} entri risk register cabang dibentuk` : 'Semua cabang sudah punya entri untuk setiap risiko utama');
    } catch (e) {
      setError(e.message);
    }
  };

  const tampil = daftar.filter((r) => r.berlaku_untuk === tab);

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Library size={40} color="#1976d2" />
              <Box>
                <Typography variant="h4">Risiko Utama & Pustaka</Typography>
                <Typography variant="body2" color="text.secondary">
                  Daftar risiko referensi dari Pusat beserta pustaka penyebab dan dampaknya
                </Typography>
              </Box>
            </Box>
            {bolehUbah && (
              <Box display="flex" gap={1}>
                <Button variant="outlined" startIcon={<RefreshCw size={18} />} onClick={bentukEntri}>Bentuk entri cabang</Button>
                <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => buka(null)}>Tambah Risiko Utama</Button>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && !form && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="CABANG" label={`Untuk Cabang (${daftar.filter((r) => r.berlaku_untuk === 'CABANG').length})`} />
        <Tab value="PUSAT" label={`Untuk Unit Pusat (${daftar.filter((r) => r.berlaku_untuk === 'PUSAT').length})`} />
      </Tabs>
      <Alert severity="info" sx={{ mb: 2 }}>
        {tab === 'CABANG'
          ? 'Risiko utama cabang wajib bagi seluruh cabang. Saat disimpan, setiap cabang otomatis mendapat entri DRAF di risk register periode terbuka.'
          : 'Risiko utama Pusat dipilih sendiri oleh unit Pusat saat mengisi risk register.'}
      </Alert>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kode</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Kategori</TableCell>
                {tab === 'PUSAT' && <TableCell>Pemilik</TableCell>}
                <TableCell align="center">Penyebab</TableCell>
                <TableCell align="center">Dampak</TableCell>
                <TableCell align="center">Dipakai</TableCell>
                {bolehUbah && <TableCell>Aksi</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {tampil.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">Belum ada risiko utama.</TableCell></TableRow>
              )}
              {tampil.map((r) => (
                <TableRow key={r.id} hover sx={{ opacity: r.aktif ? 1 : 0.5 }}>
                  <TableCell><strong>{r.kode}</strong></TableCell>
                  <TableCell>{r.nama}{!r.aktif && <Chip size="small" label="Nonaktif" sx={{ ml: 1 }} />}</TableCell>
                  <TableCell>{r.kategori?.nama || '-'}</TableCell>
                  {tab === 'PUSAT' && <TableCell>{r.direktorat_pemilik?.nama || '-'}</TableCell>}
                  <TableCell align="center">{r.pustaka_penyebab.length}</TableCell>
                  <TableCell align="center">{r.pustaka_dampak.length}</TableCell>
                  <TableCell align="center">{r._count.risiko}</TableCell>
                  {bolehUbah && (
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => buka(r)} aria-label={`Ubah ${r.kode}`}><Edit2 size={18} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => hapus(r)} disabled={r._count.risiko > 0} aria-label={`Hapus ${r.kode}`}><Trash2 size={18} /></IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Ubah Risiko Utama' : 'Tambah Risiko Utama'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {form && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth required label="Nama risiko" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label="Deskripsi" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label="Berlaku untuk" value={form.berlaku_untuk} disabled={form.terpakai > 0}
                  onChange={(e) => setForm({ ...form, berlaku_untuk: e.target.value })}
                  helperText={form.terpakai > 0 ? 'Terkunci: sudah dipakai' : ''}>
                  <MenuItem value="CABANG">Seluruh Cabang</MenuItem>
                  <MenuItem value="PUSAT">Unit Pusat</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label="Kategori" value={form.kategori_id} onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}>
                  <MenuItem value="">-</MenuItem>
                  {kategori.map((k) => <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label="Direktorat pemilik (agregasi)" value={form.direktorat_pemilik_id}
                  onChange={(e) => setForm({ ...form, direktorat_pemilik_id: e.target.value })}
                  helperText={form.berlaku_untuk === 'CABANG' ? 'Cabang: Direktorat Utama' : 'Pemilik hasil agregasi'}>
                  <MenuItem value="">-</MenuItem>
                  {direktorat.map((d) => <MenuItem key={d.id} value={d.id}>{d.nama}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <DaftarPustaka label="Penyebab" value={form.penyebab} onChange={(penyebab) => setForm({ ...form, penyebab })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <DaftarPustaka label="Dampak" value={form.dampak} onChange={(dampak) => setForm({ ...form, dampak })} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />} label="Aktif" />
                <Typography variant="caption" color="text.secondary" display="block">
                  Item pustaka yang dihapus tetapi sudah dipakai unit akan dinonaktifkan, bukan dihapus, agar riwayat analisis tetap utuh.
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>Batal</Button>
          <Button variant="contained" onClick={simpan} disabled={!form?.kode || !form?.nama}>Simpan</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!pesan} autoHideDuration={6000} onClose={() => setPesan('')} message={pesan} />
    </Box>
  );
};

export default RisikoUtama;
