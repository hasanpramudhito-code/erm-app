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
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
  Alert,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import { Plus, Edit2, Trash2, Network } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_UNIT = {
  nama: '',
  kode: '',
  jenis: 'CABANG',
  direktorat_id: '',
  parent_id: '',
  adalah_pengelola_risiko: false,
  aktif: true,
  deskripsi: ''
};
const EMPTY_DIREKTORAT = { kode: '', nama: '', nama_jabatan_direktur: '' };

const OrganizationStructure = () => {
  const [units, setUnits] = useState([]);
  const [direktorat, setDirektorat] = useState([]);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState(EMPTY_UNIT);
  const [dirDialog, setDirDialog] = useState(false);
  const [editingDir, setEditingDir] = useState(null);
  const [dirForm, setDirForm] = useState(EMPTY_DIREKTORAT);
  const [error, setError] = useState('');
  const { userData } = useAuth();

  const isAdmin = userData?.peran?.includes('ADMIN_SISTEM');

  // Load organization units
  const loadOrganization = async () => {
    try {
      const [u, d] = await Promise.all([api.get('/unit'), api.get('/direktorat')]);
      setUnits(u);
      setDirektorat(d);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadOrganization();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      ...formData,
      direktorat_id: formData.direktorat_id || null,
      parent_id: formData.parent_id || null
    };
    try {
      if (editingUnit) {
        await api.patch(`/unit/${editingUnit.id}`, body);
      } else {
        await api.post('/unit', body);
      }
      setOpenDialog(false);
      setEditingUnit(null);
      setFormData(EMPTY_UNIT);
      loadOrganization();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (unit) => {
    if (!window.confirm(`Hapus unit ${unit.nama}? Unit yang sudah dipakai data lain tidak dapat dihapus; nonaktifkan saja.`)) return;
    try {
      await api.delete(`/unit/${unit.id}`);
      loadOrganization();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      nama: unit.nama || '',
      kode: unit.kode || '',
      jenis: unit.jenis || 'CABANG',
      direktorat_id: unit.direktorat_id || '',
      parent_id: unit.parent_id || '',
      adalah_pengelola_risiko: unit.adalah_pengelola_risiko,
      aktif: unit.aktif,
      deskripsi: unit.deskripsi || ''
    });
    setOpenDialog(true);
  };

  const handleSubmitDir = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingDir) await api.patch(`/direktorat/${editingDir.id}`, dirForm);
      else await api.post('/direktorat', dirForm);
      setDirDialog(false);
      setEditingDir(null);
      setDirForm(EMPTY_DIREKTORAT);
      loadOrganization();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDir = async (d) => {
    if (!window.confirm(`Hapus ${d.nama}?`)) return;
    try {
      await api.delete(`/direktorat/${d.id}`);
      loadOrganization();
    } catch (err) {
      setError(err.message);
    }
  };

  // Get units by parent (null = root)
  const getUnitsByParent = (parentId = null) => units.filter(unit => (unit.parent_id ?? null) === parentId);

  const renderUnitCard = (unit, level = 0) => {
    const children = getUnitsByParent(unit.id);

    return (
      <Box key={unit.id} sx={{ ml: level * 4 }}>
        <Card sx={{ mb: 1, backgroundColor: level === 0 ? '#e3f2fd' : 'white', opacity: unit.aktif ? 1 : 0.5 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">
                  {unit.nama}{' '}
                  <Chip size="small" label={unit.jenis} color={unit.jenis === 'PUSAT' ? 'primary' : 'default'} />
                  {unit.adalah_pengelola_risiko && <Chip size="small" color="warning" label="Pengelola Risiko" sx={{ ml: 1 }} />}
                  {!unit.aktif && <Chip size="small" label="Nonaktif" sx={{ ml: 1 }} />}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Kode: {unit.kode}
                  {unit.direktorat && ` • ${unit.direktorat.nama}`}
                </Typography>
                {unit.deskripsi && (
                  <Typography variant="body2" color="textSecondary">
                    {unit.deskripsi}
                  </Typography>
                )}
              </Box>
              {isAdmin && (
                <Box>
                  <IconButton onClick={() => handleEdit(unit)} color="primary">
                    <Edit2 size={18} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(unit)} color="error">
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Render children */}
        {children.map(child => renderUnitCard(child, level + 1))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Network size={40} color="#1976d2" />
          <Box>
            <Typography variant="h4">Struktur Organisasi</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Kelola direktorat, unit Pusat, kantor Cabang, dan sub-unit
            </Typography>
          </Box>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => (tab === 0 ? setOpenDialog(true) : setDirDialog(true))}
          >
            {tab === 0 ? 'Tambah Unit' : 'Tambah Direktorat'}
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Unit & Cabang" />
        <Tab label="Direktorat" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Hierarki Organisasi
          </Typography>

          {getUnitsByParent().length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={4}>
              Belum ada unit organisasi. Klik "Tambah Unit" untuk memulai.
            </Typography>
          ) : (
            getUnitsByParent().map(unit => renderUnitCard(unit))
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kode</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Jabatan Direktur</TableCell>
                <TableCell>Jumlah Unit</TableCell>
                {isAdmin && <TableCell>Aksi</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {direktorat.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.kode}</TableCell>
                  <TableCell>{d.nama}</TableCell>
                  <TableCell>{d.nama_jabatan_direktur}</TableCell>
                  <TableCell>{units.filter((u) => u.direktorat_id === d.id).length}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => { setEditingDir(d); setDirForm({ kode: d.kode, nama: d.nama, nama_jabatan_direktur: d.nama_jabatan_direktur }); setDirDialog(true); }}>
                        <Edit2 size={18} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteDir(d)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Add/Edit Unit Dialog */}
      <Dialog open={openDialog} onClose={() => { setOpenDialog(false); setEditingUnit(null); setFormData(EMPTY_UNIT); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUnit ? 'Edit Unit Organisasi' : 'Tambah Unit Organisasi'}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nama Unit"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Kode Unit"
              value={formData.kode}
              onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
              margin="normal"
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Jenis</InputLabel>
                  <Select
                    value={formData.jenis}
                    label="Jenis"
                    onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                    required
                  >
                    <MenuItem value="PUSAT">Unit Pusat</MenuItem>
                    <MenuItem value="CABANG">Kantor Cabang</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Direktorat Pembina</InputLabel>
                  <Select
                    value={formData.direktorat_id}
                    label="Direktorat Pembina"
                    onChange={(e) => setFormData({ ...formData, direktorat_id: e.target.value })}
                  >
                    <MenuItem value="">-</MenuItem>
                    {direktorat.map((d) => <MenuItem key={d.id} value={d.id}>{d.nama}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <FormControl fullWidth margin="normal">
              <InputLabel>Unit Induk (untuk sub-unit)</InputLabel>
              <Select
                value={formData.parent_id}
                label="Unit Induk (untuk sub-unit)"
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              >
                <MenuItem value="">Tidak Ada (Root)</MenuItem>
                {units
                  .filter(unit => unit.id !== editingUnit?.id)
                  .map(unit => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.kode} - {unit.nama}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Deskripsi"
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControlLabel
              control={<Checkbox checked={formData.adalah_pengelola_risiko} onChange={(e) => setFormData({ ...formData, adalah_pengelola_risiko: e.target.checked })} />}
              label="Unit pengelola risiko Pusat (verifikator)"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.aktif} onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })} />}
              label="Aktif"
            />

            <Box mt={3} display="flex" gap={2} justifyContent="flex-end">
              <Button onClick={() => setOpenDialog(false)}>
                Batal
              </Button>
              <Button type="submit" variant="contained">
                {editingUnit ? 'Update' : 'Simpan'}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Direktorat Dialog */}
      <Dialog open={dirDialog} onClose={() => { setDirDialog(false); setEditingDir(null); setDirForm(EMPTY_DIREKTORAT); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDir ? 'Edit Direktorat' : 'Tambah Direktorat'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmitDir}>
            <TextField fullWidth margin="normal" required label="Kode" value={dirForm.kode} onChange={(e) => setDirForm({ ...dirForm, kode: e.target.value })} />
            <TextField fullWidth margin="normal" required label="Nama" value={dirForm.nama} onChange={(e) => setDirForm({ ...dirForm, nama: e.target.value })} />
            <TextField fullWidth margin="normal" required label="Nama Jabatan Direktur" value={dirForm.nama_jabatan_direktur} onChange={(e) => setDirForm({ ...dirForm, nama_jabatan_direktur: e.target.value })} />
            <Box mt={3} display="flex" gap={2} justifyContent="flex-end">
              <Button onClick={() => setDirDialog(false)}>Batal</Button>
              <Button type="submit" variant="contained">Simpan</Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OrganizationStructure;
