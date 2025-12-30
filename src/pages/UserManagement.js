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
  Snackbar
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    department: '',
    position: '',
    phone: '',
    status: 'active'
  });

  // Firebase Functions
  const functions = getFunctions();
  const createUser = httpsCallable(functions, 'createUserWithRole');
  const updateUserRole = httpsCallable(functions, 'setUserRole');

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      if (!isAdmin) {
        // Non-admin hanya bisa melihat data sendiri
        const userRef = doc(db, 'users', userData?.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUsers([{ id: userSnap.id, ...userSnap.data() }]);
        }
        return;
      }

      // Admin bisa melihat semua user
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const userList = [];
      snapshot.forEach((docSnap) => {
        userList.push({ 
          id: docSnap.id, 
          ...docSnap.data(),
          // Format tanggal jika ada
          createdAt: docSnap.data().createdAt?.toDate?.() || docSnap.data().createdAt,
          updatedAt: docSnap.data().updatedAt?.toDate?.() || docSnap.data().updatedAt
        });
      });
      
      setUsers(userList);
      
    } catch (err) {
      console.error('Error loading users:', err);
      showSnackbar('Gagal memuat data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      loadUsers();
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: formData.name,
          role: formData.role,
          department: formData.department,
          position: formData.position,
          phone: formData.phone,
          status: formData.status,
          updatedAt: new Date()
        });

        // Update role claims
        await updateUserRole({
          uid: editingUser.id,
          role: formData.role
        });

        showSnackbar('User berhasil diupdate', 'success');
      } else {
        // Create new user
        const result = await createUser({
          ...formData,
          email: formData.email.toLowerCase().trim()
        });

        console.log('Create user result:', result.data);
        showSnackbar('User berhasil dibuat', 'success');
      }

      handleCloseDialog();
      loadUsers();
      
    } catch (err) {
      console.error('Save user error:', err);
      setError(err.message || 'Gagal menyimpan user');
      showSnackbar(err.message || 'Gagal menyimpan user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Nonaktifkan user ${user.name}?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: 'inactive',
        updatedAt: new Date()
      });
      
      showSnackbar('User dinonaktifkan', 'success');
      loadUsers();
    } catch (err) {
      console.error('Delete error:', err);
      showSnackbar('Gagal menonaktifkan user', 'error');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'STAFF',
      department: user.department || '',
      position: user.position || '',
      phone: user.phone || '',
      status: user.status || 'active'
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
      department: '',
      position: '',
      phone: '',
      status: 'active'
    });
    setError('');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'error';
      case 'RISK_MANAGER': return 'warning';
      case 'RISK_OWNER': return 'info';
      case 'DIRECTOR': return 'success';
      default: return 'default';
    }
  };

  if (!isAdmin && !loading && users.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Anda tidak memiliki akses untuk mengelola user. Hanya admin yang bisa mengakses halaman ini.
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
            startIcon={<Add />}
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
                  <TableCell>Role</TableCell>
                  <TableCell>Departemen</TableCell>
                  <TableCell>Status</TableCell>
                  {isAdmin && <TableCell>Aksi</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={getRoleColor(user.role)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status || 'active'} 
                        color={user.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton onClick={() => handleEdit(user)} size="small">
                          <Edit />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleDelete(user)} 
                          size="small"
                          disabled={user.id === userData?.uid}
                        >
                          <Delete />
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
                
                {!editingUser && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={formData.role}
                      label="Role"
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <MenuItem value="STAFF">Staff</MenuItem>
                      <MenuItem value="RISK_OWNER">Risk Owner</MenuItem>
                      <MenuItem value="RISK_MANAGER">Risk Manager</MenuItem>
                      <MenuItem value="DIRECTOR">Director</MenuItem>
                      <MenuItem value="ADMIN">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Departemen"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
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