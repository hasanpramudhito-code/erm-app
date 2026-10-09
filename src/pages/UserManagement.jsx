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

const UserManagement = () => {
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
        showSnackbar('User berhasil diupdate', 'success');
      } else {
        await api.post('/pengguna', { ...payload, email: formData.email, kata_sandi: formData.password });
        showSnackbar('User berhasil dibuat', 'success');
      }

      if (editingUser?.id === userData?.id) {
        await refreshUserData();
      }

      handleCloseDialog();
      loadUsers();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan user');
      showSnackbar(err.message || 'Gagal menyimpan user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Nonaktifkan user ${user.nama}?`)) return;

    try {
      await api.patch(`/pengguna/${user.id}`, { aktif: false });
      showSnackbar('User dinonaktifkan', 'success');
      loadUsers();
    } catch (err) {
      showSnackbar(err.message || 'Gagal menonaktifkan user', 'error');
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

  if (!canView) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Anda tidak memiliki akses untuk mengelola user. Halaman ini hanya dapat diakses oleh Administrator dan Direksi.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">User Management</Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setOpenDialog(true)}
          >
            Tambah User
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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.nama}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.peran.map((p) => (
                        <Chip key={p} label={namaPeran(p)} color={getRoleColor(p)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>{user.unit_kerja?.nama || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.aktif ? 'active' : 'inactive'}
                        color={user.aktif ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton onClick={() => handleEdit(user)} size="small">
                          <Edit2 size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(user)}
                          size="small"
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
            {editingUser ? 'Edit User' : 'Tambah User Baru'}
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
                        <MenuItem key={p.kode} value={p.kode}>{p.nama}</MenuItem>
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
                      {daftarUnit.map((u) => (
                        <MenuItem key={u.id} value={u.id}>{u.induk_id ? "00a000a000a0" : ""}{u.kode} - {u.nama} ({LABEL_JENIS_UK[u.jenis]})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Posisi/Jabatan"
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
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
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
