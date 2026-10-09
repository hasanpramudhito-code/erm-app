import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
  OutlinedInput
} from '@mui/material';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { LABEL_JENIS_UK } from '../services/risiko';
import { useAuth } from '../contexts/AuthContext';

// Penjelasan singkat agar admin tidak salah memilih peran (adendum v2 F).
const KET_PERAN = {
  ADMIN: 'Kelola pengguna, unit kerja, periode, parameter',
  DIREKSI: 'Lihat & ubah seluruh data',
  PENGELOLA_RISIKO: 'Susun risiko utama, verifikasi final, buka kunci',
  AUDITOR: 'Lihat seluruh data, hanya baca',
  PIMPINAN: 'Setujui register & laporan unit kerjanya',
  PETUGAS: 'Isi register & pemantauan unit kerjanya',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  peran: ['PETUGAS'],
  unit_kerja_id: '',
  position: '',
  phone: '',
  status: 'active'
};

// Kelola pengguna. Dipakai sebagai tab di Organisasi; `unitKerjaId` membatasi daftar & mengisi
// unit kerja di form tambah (dibuka dari kartu unit kerja di Struktur Organisasi).
const UserManagement = ({ unitKerjaId, tersemat = false, onBerubah }) => {
  const { userData, refreshUserData } = useAuth();
  const isAdmin = userData?.peran?.includes('ADMIN');
  const canView = isAdmin || userData?.peran?.includes('DIREKSI');

  const [users, setUsers] = useState([]);
  const [daftarPeran, setDaftarPeran] = useState([]);
  const [daftarUnit, setDaftarUnit] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [cari, setCari] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);

      if (!canView) {
        setUsers([]);
        return;
      }

      const [list, peran, unit] = await Promise.all([
        api.get('/pengguna'),
        api.get('/pengguna/peran'),
        api.get('/unit-kerja')
      ]);
      setUsers(list);
      setDaftarPeran(peran);
      setDaftarUnit(unit);
    } catch (err) {
      showSnackbar(err.message || 'Gagal memuat data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      loadUsers();
    }
  }, [userData?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        nama: formData.name,
        peran: formData.peran,
        unit_kerja_id: formData.unit_kerja_id || null,
        jabatan: formData.position,
        telepon: formData.phone
      };

      if (editingUser) {
        await api.patch(`/pengguna/${editingUser.id}`, {
          ...payload,
          aktif: formData.status === 'active',
          ...(formData.password ? { kata_sandi: formData.password } : {})
        });
        showSnackbar('Pengguna diperbarui', 'success');
      } else {
        await api.post('/pengguna', { ...payload, email: formData.email, kata_sandi: formData.password });
        showSnackbar('Pengguna ditambahkan', 'success');
      }

      if (editingUser?.id === userData?.id) {
        await refreshUserData();
      }

      handleCloseDialog();
      loadUsers();
      onBerubah?.();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pengguna');
      showSnackbar(err.message || 'Gagal menyimpan pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Nonaktifkan pengguna ${user.nama}?`)) return;

    try {
      await api.patch(`/pengguna/${user.id}`, { aktif: false });
      showSnackbar('Pengguna dinonaktifkan', 'success');
      loadUsers();
      onBerubah?.();
    } catch (err) {
      showSnackbar(err.message || 'Gagal menonaktifkan pengguna', 'error');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.nama || '',
      email: user.email || '',
      password: '',
      peran: user.peran || [],
      unit_kerja_id: user.unit_kerja_id || '',
      position: user.jabatan || '',
      phone: user.telepon || '',
      status: user.aktif ? 'active' : 'inactive'
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setError('');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'PENGELOLA_RISIKO': return 'warning';
      case 'AUDITOR':
      case 'PIMPINAN': return 'info';
      case 'DIREKSI': return 'success';
      default: return 'default';
    }
  };

  const namaPeran = (kode) => daftarPeran.find((p) => p.kode === kode)?.nama || kode;
  const bukaTambah = () => { setFormData({ ...EMPTY_FORM, unit_kerja_id: unitKerjaId || '' }); setOpenDialog(true); };
  const unitAktif = unitKerjaId || filterUnit;
  const kata = cari.trim().toLowerCase();
  const tampil = users.filter((u) => (!unitAktif || u.unit_kerja_id === Number(unitAktif)) &&
    (!kata || [u.nama, u.email, u.jabatan].some((x) => x?.toLowerCase().includes(kata))));
  // Urut sesuai hierarki: bagian lalu sub-bagiannya, lalu Cabang/Unit.
  const unitBerurut = daftarUnit.filter((u) => !u.induk_id).flatMap((u) => [u, ...daftarUnit.filter((s) => s.induk_id === u.id)]);

  if (!canView) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Anda tidak memiliki akses untuk mengelola pengguna. Halaman ini hanya dapat diakses oleh Administrator dan Direksi.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={tersemat ? 0 : 3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        {!tersemat && <Typography variant="h4">Pengguna</Typography>}
        <Box display="flex" gap={2} flexWrap="wrap" flex={1}>
          <TextField size="small" label="Cari nama, email, jabatan" value={cari} onChange={(e) => setCari(e.target.value)} sx={{ minWidth: 240 }} />
          {!unitKerjaId && (
            <TextField select size="small" label="Unit Kerja" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">Semua</MenuItem>
              {unitBerurut.map((u) => <MenuItem key={u.id} value={u.id} sx={{ pl: u.induk_id ? 4 : 2 }}>{u.nama}</MenuItem>)}
            </TextField>
          )}
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={bukaTambah}>
            Tambah Pengguna
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ mt: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nama</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Peran</TableCell>
                  <TableCell>Unit Kerja</TableCell>
                  <TableCell>Status</TableCell>
                  {isAdmin && <TableCell>Aksi</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {tampil.length === 0 && <TableRow><TableCell colSpan={6} align="center">Belum ada pengguna.</TableCell></TableRow>}
                {tampil.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.nama}{user.jabatan && <Typography variant="caption" display="block" color="text.secondary">{user.jabatan}</Typography>}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.peran.map((p) => (
                        <Chip key={p} label={namaPeran(p)} color={getRoleColor(p)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>{user.unit_kerja?.nama || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.aktif ? 'Aktif' : 'Nonaktif'}
                        color={user.aktif ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton onClick={() => handleEdit(user)} size="small" aria-label="Ubah pengguna">
                          <Edit2 size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(user)}
                          size="small"
                          aria-label="Nonaktifkan pengguna"
                          disabled={user.id === userData?.id || !user.aktif}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog untuk create/edit user */}
      {isAdmin && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingUser ? 'Ubah Pengguna' : 'Tambah Pengguna'}
          </DialogTitle>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nama Lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingUser}
                    required={!editingUser}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={editingUser ? 'Reset Password (kosongkan bila tidak diubah)' : 'Password'}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    inputProps={{ minLength: 10 }}
                    helperText="Minimal 10 karakter"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Peran</InputLabel>
                    <Select
                      multiple
                      value={formData.peran}
                      input={<OutlinedInput label="Peran" />}
                      onChange={(e) => setFormData({ ...formData, peran: e.target.value })}
                      renderValue={(v) => v.map(namaPeran).join(', ')}
                    >
                      {daftarPeran.map((p) => (
                        <MenuItem key={p.kode} value={p.kode}>
                          <Box>
                            {p.nama}
                            <Typography variant="caption" display="block" color="text.secondary">{KET_PERAN[p.kode]}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Unit Kerja</InputLabel>
                    <Select
                      value={formData.unit_kerja_id}
                      label="Unit Kerja"
                      onChange={(e) => setFormData({ ...formData, unit_kerja_id: e.target.value })}
                    >
                      <MenuItem value="">- Tanpa unit kerja -</MenuItem>
                      {unitBerurut.map((u) => (
                        <MenuItem key={u.id} value={u.id} sx={{ pl: u.induk_id ? 4 : 2 }}>{u.nama} ({LABEL_JENIS_UK[u.jenis]})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Jabatan"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nomor Telepon"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Grid>

                {editingUser && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status}
                        label="Status"
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <MenuItem value="active">Aktif</MenuItem>
                        <MenuItem value="inactive">Nonaktif</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={handleCloseDialog} disabled={loading}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Simpan'}
                </Button>
              </Box>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        message={snackbar.message}
      />
    </Box>
  );
};

export default UserManagement;
