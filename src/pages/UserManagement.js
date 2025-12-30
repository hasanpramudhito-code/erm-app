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
  Card,
  CardContent,
  Grid,
  Alert
} from '@mui/material';

import {
  Add,
  Edit,
  Delete,
  Person,
  Email,
  Business,
  Badge
} from '@mui/icons-material';

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from 'firebase/firestore';

import { getFunctions, httpsCallable } from 'firebase/functions';

import { db, auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../config/roles';

/* ================== HELPERS ================== */
const normalizeRole = (role) => role?.toUpperCase() || '';

/* ================== COMPONENT ================== */
const UserManagement = () => {
  const { userData } = useAuth();
  const isAdmin = normalizeRole(userData?.role) === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    position: '',
    unitId: '',
    phone: '',
    status: 'active'
  });

  /* ================== FIREBASE FUNCTIONS ================== */
  const functions = getFunctions();
  const createUser = httpsCallable(functions, 'createUserWithRole');
  const updateUserRole = httpsCallable(functions, 'setUserRole');

  /* ================== LOAD DATA ================== */
  const loadData = async () => {
    try {
      setLoading(true);
      const list = [];

      if (isAdmin) {
        const snapshot = await getDocs(collection(db, 'users'));
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
      } else {
        const ref = doc(db, 'users', auth.currentUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) list.push({ id: snap.id, ...snap.data() });
      }

      setUsers(list);

      const unitsSnap = await getDocs(collection(db, 'organizationUnits'));
      const units = [];
      unitsSnap.forEach((d) => units.push({ id: d.id, ...d.data() }));
      setOrganizationUnits(units);

    } catch (e) {
      console.error(e);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ================== SUBMIT ================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const role = normalizeRole(formData.role);

      if (editingUser) {
        // UPDATE DATA
        await updateDoc(doc(db, 'users', editingUser.id), {
          ...formData,
          role,
          updatedAt: new Date()
        });

        // UPDATE ROLE CLAIM
        await updateUserRole({
          uid: editingUser.id,
          role
        });

        setSuccess('User berhasil diupdate');
      } else {
        // CREATE USER (AUTH + FIRESTORE + ROLE)
        await createUser({
          ...formData,
          role
        });

        setSuccess('User berhasil dibuat');
      }

      handleCloseDialog();
      loadData();

    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan user');
    } finally {
      setLoading(false);
    }
  };

  /* ================== DELETE (SOFT) ================== */
  const handleDelete = async (user) => {
    if (!window.confirm(`Nonaktifkan user ${user.name}?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: 'inactive',
        updatedAt: new Date()
      });
      setSuccess('User dinonaktifkan');
      loadData();
    } catch (e) {
      setError('Gagal menonaktifkan user');
    }
  };

  /* ================== EDIT ================== */
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || '',
      department: user.department || '',
      position: user.position || '',
      unitId: user.unitId || '',
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
      role: '',
      department: '',
      position: '',
      unitId: '',
      phone: '',
      status: 'active'
    });
  };

  /* ================== UI HELPERS ================== */
  const getRoleColor = (role) => {
    switch (normalizeRole(role)) {
      case 'ADMIN': return 'error';
      case 'RISK_OWNER': return 'warning';
      default: return 'default';
    }
  };

  /* ================== RENDER ================== */
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          disabled={!isAdmin}
        >
          Tambah User
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Paper sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nama</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip label={u.role} color={getRoleColor(u.role)} size="small" />
                </TableCell>
                <TableCell>{u.status}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(u)} disabled={!isAdmin}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(u)} disabled={!isAdmin}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} mt={1}>
              <Grid item xs={6}>
                <TextField fullWidth label="Nama" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Email" value={formData.email}
                  disabled={!!editingUser}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </Grid>
              {!editingUser && (
                <Grid item xs={6}>
                  <TextField fullWidth label="Password" type="password"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </Grid>
              )}
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    {Object.keys(ROLES).map((r) => (
                      <MenuItem key={r} value={r}>{ROLES[r].name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box mt={3} textAlign="right">
              <Button onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" variant="contained" sx={{ ml: 2 }}>
                Simpan
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
