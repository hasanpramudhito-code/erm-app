import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Grid, IconButton, MenuItem, Paper, Snackbar, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Typography, Checkbox, List, ListItem, ListItemText
} from '@mui/material';
import { Library, Plus, Edit2, Trash2, RefreshCw, Download, Upload, Copy, CalendarRange } from 'lucide-react';
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
  const [daftarPeriode, setDaftarPeriode] = useState([]);
  const [periodeId, setPeriodeId] = useState('');
  const [salinDari, setSalinDari] = useState('');
  const [hasilImpor, setHasilImpor] = useState(null);
  const [fileImpor, setFileImpor] = useState(null);
  const [kelolaPeriode, setKelolaPeriode] = useState(false);
  const [formPeriode, setFormPeriode] = useState({ nama: '', tanggal_mulai: '', tanggal_selesai: '', status: 'PERSIAPAN' });
  const periode = daftarPeriode.find((p) => p.id === periodeId);
  const bisaAturDaftar = bolehUbah && periode && periode.status !== 'DITUTUP';

  const muat = () => Promise.all([api.get('/risiko-utama?semua=1'), api.get('/kategori-risiko'), api.get('/direktorat'), api.get('/periode')])
    .then(([r, k, d, p]) => {
      setDaftar(r); setKategori(k); setDirektorat(d); setDaftarPeriode(p);
      setPeriodeId((id) => (p.some((x) => x.id === id) ? id : (p.find((x) => x.status === 'PERSIAPAN') || p.find((x) => x.status === 'TERBUKA') || p[0])?.id || ''));
    })
    .catch((e) => setError(e.message));

  const dalamPeriode = (r) => r.periode_ids?.includes(periodeId);
  const toggleDaftar = async (r) => {
    const ids = daftar.filter((x) => (x.id === r.id ? !dalamPeriode(x) : dalamPeriode(x))).map((x) => x.id);
    try {
      const h = await api.put(`/risiko-utama/periode/${periodeId}`, { risiko_utama_ids: ids });
      if (h.entri_dibuat) setPesan(`${h.entri_dibuat} entri risk register cabang dibentuk`);
      muat();
    } catch (e) { setError(e.message); }
  };
  const salin = async () => {
    try {
      const h = await api.post(`/risiko-utama/periode/${periodeId}/salin`, { dari_periode_id: salinDari });
      setPesan(`${h.ditambahkan} risiko utama disalin${h.entri_dibuat ? `, ${h.entri_dibuat} entri cabang dibentuk` : ''}`);
      setSalinDari('');
      muat();
    } catch (e) { setError(e.message); }
  };
  const ekspor = async () => {
    try {
      const r = await fetch(`/api/risiko-utama/excel/ekspor?periode_id=${periodeId}`, { credentials: 'same-origin' });
      if (!r.ok) throw new Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob());
      Object.assign(document.createElement('a'), { href: url, download: `risiko-utama-${periode?.nama || 'semua'}.xlsx` }).click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };
  const impor = async (file, simulasi) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('periode_id', String(periodeId));
    const r = await fetch(`/api/risiko-utama/excel/impor${simulasi ? '?simulasi=1' : ''}`, { method: 'POST', credentials: 'same-origin', body: fd });
    const j = await r.json();
    if (!r.ok && !j.kesalahan) throw new Error(j.error);
    return j;
  };
  const pilihFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setFileImpor(file);
      setHasilImpor(await impor(file, true));
    } catch (err) { setError(err.message); }
  };
  const jalankanImpor = async () => {
    try {
      const h = await impor(fileImpor, false);
      setHasilImpor(null);
      setPesan(`Impor selesai: ${h.baru} baru, ${h.diubah} diubah${h.entri_dibuat ? `, ${h.entri_dibuat} entri cabang dibentuk` : ''}`);
      muat();
    } catch (e) { setError(e.message); }
  };
  const simpanPeriode = async (p, data) => {
    try {
      if (p) await api.patch(`/periode/${p.id}`, data);
      else {
        const baru = await api.post('/periode', formPeriode);
        setFormPeriode({ nama: '', tanggal_mulai: '', tanggal_selesai: '', status: 'PERSIAPAN' });
        setPeriodeId(baru.id);
      }
      muat();
    } catch (e) { setError(e.message); }
  };
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
      const r = editId ? await api.patch(`/risiko-utama/${editId}`, body) : await api.post('/risiko-utama', { ...body, periode_id: bisaAturDaftar ? periodeId : undefined });
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
          <Box display="flex" gap={1} mt={2} flexWrap="wrap" alignItems="center">
            <TextField select size="small" label="Periode" sx={{ minWidth: 200 }} value={periodeId} onChange={(e) => setPeriodeId(e.target.value)}>
              {daftarPeriode.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama} · {p.status}</MenuItem>)}
            </TextField>
            {bolehUbah && <Button size="small" startIcon={<CalendarRange size={16} />} onClick={() => setKelolaPeriode(true)}>Kelola periode</Button>}
            {bisaAturDaftar && (
              <>
                <TextField select size="small" label="Salin daftar dari" sx={{ minWidth: 180 }} value={salinDari} onChange={(e) => setSalinDari(e.target.value)}>
                  {daftarPeriode.filter((p) => p.id !== periodeId).map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
                </TextField>
                <Button size="small" variant="outlined" startIcon={<Copy size={16} />} disabled={!salinDari} onClick={salin}>Salin</Button>
              </>
            )}
            <Box flexGrow={1} />
            {bolehUbah && (
              <>
                <Button size="small" startIcon={<Download size={16} />} onClick={ekspor}>Ekspor Excel</Button>
                <Button size="small" component="label" startIcon={<Upload size={16} />} disabled={!bisaAturDaftar}>
                  Impor Excel
                  <input hidden type="file" accept=".xlsx" onChange={pilihFile} />
                </Button>
              </>
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
        {' '}Centang kolom "Periode" untuk menentukan risiko utama yang berlaku pada periode terpilih.
        {periode?.status === 'PERSIAPAN' && ' Periode masih PERSIAPAN: entri cabang baru dibentuk saat periode dibuka.'}
      </Alert>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">Periode</TableCell>
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
                <TableRow><TableCell colSpan={9} align="center">Belum ada risiko utama.</TableCell></TableRow>
              )}
              {tampil.map((r) => (
                <TableRow key={r.id} hover sx={{ opacity: r.aktif ? 1 : 0.5 }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={!!dalamPeriode(r)} disabled={!bisaAturDaftar || !r.aktif} onChange={() => toggleDaftar(r)}
                      inputProps={{ 'aria-label': `${r.kode} berlaku di periode ${periode?.nama || ''}` }} />
                  </TableCell>
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
      <Dialog open={!!hasilImpor} onClose={() => setHasilImpor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Pratinjau Impor</DialogTitle>
        <DialogContent dividers>
          {hasilImpor?.kesalahan?.length ? (
            <>
              <Alert severity="error" sx={{ mb: 1 }}>File tidak dapat diimpor. Perbaiki baris berikut lalu unggah ulang:</Alert>
              <List dense>
                {hasilImpor.kesalahan.map((k, i) => (
                  <ListItem key={i}><ListItemText primary={`${k.baris ? `Baris ${k.baris}` : ''} ${k.kode || ''}`} secondary={k.kesalahan} /></ListItem>
                ))}
              </List>
            </>
          ) : (
            <Typography>
              {hasilImpor?.baru} risiko utama baru dan {hasilImpor?.diubah} diubah akan disimpan, lalu dimasukkan ke daftar periode {periode?.nama}.
              Pustaka yang hilang dari file akan dihapus, atau dinonaktifkan bila sudah dipakai unit.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHasilImpor(null)}>Batal</Button>
          {!hasilImpor?.kesalahan?.length && <Button variant="contained" onClick={jalankanImpor}>Impor</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={kelolaPeriode} onClose={() => setKelolaPeriode(false)} maxWidth="md" fullWidth>
        <DialogTitle>Kelola Periode</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Alert severity="info" sx={{ mb: 2 }}>
            PERSIAPAN: susun daftar risiko utama tanpa membentuk entri. TERBUKA: entri cabang dibentuk dan unit mulai mengisi. DITUTUP: periode terkunci.
          </Alert>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Nama</TableCell><TableCell>Mulai</TableCell><TableCell>Selesai</TableCell><TableCell>Status</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {daftarPeriode.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell>{new Date(p.tanggal_mulai).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{new Date(p.tanggal_selesai).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <TextField select size="small" value={p.status} onChange={(e) => {
                      if (e.target.value === 'DITUTUP' && !window.confirm(`Tutup periode ${p.nama}? Seluruh data periode ini tidak dapat diubah lagi.`)) return;
                      simpanPeriode(p, { status: e.target.value });
                    }}>
                      {['PERSIAPAN', 'TERBUKA', 'DITUTUP'].map((st) => <MenuItem key={st} value={st}>{st}</MenuItem>)}
                    </TextField>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell><TextField size="small" placeholder="mis. 2027" value={formPeriode.nama} onChange={(e) => setFormPeriode({ ...formPeriode, nama: e.target.value })} /></TableCell>
                <TableCell><TextField size="small" type="date" value={formPeriode.tanggal_mulai} onChange={(e) => setFormPeriode({ ...formPeriode, tanggal_mulai: e.target.value })} /></TableCell>
                <TableCell><TextField size="small" type="date" value={formPeriode.tanggal_selesai} onChange={(e) => setFormPeriode({ ...formPeriode, tanggal_selesai: e.target.value })} /></TableCell>
                <TableCell>
                  <Button size="small" variant="contained" disabled={!formPeriode.nama || !formPeriode.tanggal_mulai || !formPeriode.tanggal_selesai}
                    onClick={() => simpanPeriode(null)}>Tambah</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setKelolaPeriode(false)}>Tutup</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!pesan} autoHideDuration={6000} onClose={() => setPesan('')} message={pesan} />
    </Box>
  );
};

export default RisikoUtama;
