// File: src/pages/Configuration.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
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
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Divider,
  InputAdornment,
  CircularProgress,
  FormHelperText,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Palette,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';


// Import konstanta & helper dari modul config
import { COORDINATE_MATRIX, getCoordinateScore } from '../config/riskMatrix';
import { RISK_LEVELS } from '../config/riskLevels';


// === KOMPONEN UTAMA ===
const Configuration = () => {
  const {
    assessmentConfig,
    loading: configLoading,

    refreshConfig // Tambah fungsi refresh untuk real-time update
  } = useAssessmentConfig();

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openLikelihoodDialog, setOpenLikelihoodDialog] = useState(false);
  const [openImpactDialog, setOpenImpactDialog] = useState(false);
  const [openRiskLevelDialog, setOpenRiskLevelDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingRiskLevel, setEditingRiskLevel] = useState(null);

  // State untuk form
  const [likelihoodForm, setLikelihoodForm] = useState({ value: '', label: '' });
  const [impactForm, setImpactForm] = useState({ value: '', label: '' });
  const [riskLevelForm, setRiskLevelForm] = useState({
    label: '',
    min: '',
    max: '',
    color: '#4caf50'
  });
  const [assessmentMethod, setAssessmentMethod] = useState('multiplication');

  // Data konfigurasi dimuat oleh AssessmentConfigContext


  useEffect(() => {
    if (assessmentConfig) {
      setAssessmentMethod(assessmentConfig.assessmentMethod || 'multiplication');
    }
  }, [assessmentConfig]);

  // Reset forms
  const resetLikelihoodForm = () => {
    setLikelihoodForm({ value: '', label: '' });
    setEditingItem(null);
  };

  const resetImpactForm = () => {
    setImpactForm({ value: '', label: '' });
    setEditingItem(null);
  };

  const resetRiskLevelForm = () => {
    setRiskLevelForm({ label: '', min: '', max: '', color: '#4caf50' });
    setEditingRiskLevel(null);
  };

  // Jalankan aksi ke server, lalu muat ulang konfigurasi agar semua halaman ikut terbarui.
  const jalankan = async (aksi, pesanSukses, pesanGagal, setelah) => {
    try {
      setLoading(true);
      await aksi();
      await refreshConfig();
      showSnackbar(pesanSukses, 'success');
      setelah?.();
    } catch (error) {
      showSnackbar(`${pesanGagal}: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle save assessment method
  const handleSaveAssessmentMethod = () =>
    jalankan(
      () => api.put('/pengaturan/metode_penilaian', { nilai: assessmentMethod }),
      'Metode assessment berhasil disimpan!',
      'Error menyimpan metode assessment'
    );

  // Handle save likelihood option
  const handleSaveLikelihood = () => {
    const body = { nilai: parseInt(likelihoodForm.value), label: likelihoodForm.label.replace(/^\d+\s*-\s*/, '') };
    return jalankan(
      () => (editingItem ? api.patch(`/skala-kemungkinan/${editingItem.id}`, body) : api.post('/skala-kemungkinan', body)),
      'Likelihood option berhasil disimpan!',
      'Error menyimpan likelihood option',
      () => { setOpenLikelihoodDialog(false); resetLikelihoodForm(); }
    );
  };

  // Impact option = label skala dampak untuk satu nilai, berlaku di semua kategori dampak.
  const handleSaveImpact = () => {
    const nilai = parseInt(impactForm.value);
    const label = impactForm.label.replace(/^\d+\s*-\s*/, '');
    const kriteria = assessmentConfig?.impactCriteria || [];
    return jalankan(
      async () => {
        if (editingItem) {
          for (const k of kriteria.filter((k) => k.nilai === editingItem.value))
            await api.patch(`/skala-dampak/${k.id}`, { nilai, label });
        } else {
          const kategori = [...new Set(kriteria.map((k) => k.kategori))];
          for (const kat of kategori.length ? kategori : ['OPERASIONAL'])
            await api.post('/skala-dampak', { kategori: kat, nilai, label });
        }
      },
      'Impact option berhasil disimpan!',
      'Error menyimpan impact option',
      () => { setOpenImpactDialog(false); resetImpactForm(); }
    );
  };

  // Handle save risk level
  const handleSaveRiskLevel = () => {
    const body = {
      nama: riskLevelForm.label,
      skor_min: parseInt(riskLevelForm.min),
      skor_maks: parseInt(riskLevelForm.max),
      warna: riskLevelForm.color
    };
    return jalankan(
      () => (editingRiskLevel ? api.patch(`/level-risiko/${editingRiskLevel.id}`, body) : api.post('/level-risiko', body)),
      'Risk level berhasil disimpan!',
      'Error menyimpan risk level',
      () => { setOpenRiskLevelDialog(false); resetRiskLevelForm(); }
    );
  };

  // Handle edit likelihood
  const handleEditLikelihood = (option) => {
    setEditingItem(option);
    setLikelihoodForm({ value: option.value, label: option.rawLabel ?? option.label });
    setOpenLikelihoodDialog(true);
  };

  // Handle edit impact
  const handleEditImpact = (option) => {
    setEditingItem(option);
    setImpactForm({ value: option.value, label: option.rawLabel ?? option.label });
    setOpenImpactDialog(true);
  };

  // Handle edit risk level
  const handleEditRiskLevel = (level) => {
    setEditingRiskLevel(level);
    setRiskLevelForm({
      label: level.label,
      min: level.min,
      max: level.max,
      color: level.color
    });
    setOpenRiskLevelDialog(true);
  };

  // Handle delete likelihood
  const handleDeleteLikelihood = (value) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus likelihood option ini?')) return;
    const item = assessmentConfig?.likelihoodOptions?.find((o) => o.value === value);
    return jalankan(() => api.delete(`/skala-kemungkinan/${item.id}`), 'Likelihood option berhasil dihapus!', 'Error menghapus likelihood option');
  };

  // Handle delete impact (semua kategori untuk nilai tersebut)
  const handleDeleteImpact = (value) => {
    if (!window.confirm('Hapus impact option ini? Kriteria dampak nilai ini di semua kategori ikut terhapus.')) return;
    const ids = (assessmentConfig?.impactCriteria || []).filter((k) => k.nilai === value).map((k) => k.id);
    return jalankan(
      async () => { for (const id of ids) await api.delete(`/skala-dampak/${id}`); },
      'Impact option berhasil dihapus!',
      'Error menghapus impact option'
    );
  };

  // Handle delete risk level
  const handleDeleteRiskLevel = (level) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus risk level ini?')) return;
    return jalankan(() => api.delete(`/level-risiko/${level.id}`), 'Risk level berhasil dihapus!', 'Error menghapus risk level');
  };

  // Manual refresh button
  const handleManualRefresh = () => {
    if (refreshConfig && typeof refreshConfig === 'function') {
      refreshConfig();
      showSnackbar('Config diperbarui secara manual!', 'info');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Color options for risk levels
  const colorOptions = [
    { value: '#4caf50', label: 'Hijau (Sangat Rendah)', color: 'success' },
    { value: '#81c784', label: 'Hijau Muda (Rendah)', color: 'success' },
    { value: '#ffeb3b', label: 'Kuning (Sedang)', color: 'warning' },
    { value: '#f57c00', label: 'Orange (Tinggi)', color: 'warning' },
    { value: '#d32f2f', label: 'Merah (Sangat Tinggi)', color: 'error' },
    { value: '#7b1fa2', label: 'Ungu (Ekstrim)', color: 'secondary' },
    { value: '#2196f3', label: 'Biru', color: 'info' },
    { value: '#607d8b', label: 'Abu-abu', color: 'default' }
  ];

  if (configLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      {/* Configuration Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Alert
          severity="info"
          sx={{ flex: 1, mr: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleManualRefresh}>
              Refresh Now
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Real-time Update Aktif</strong> - Perubahan matrix dan level risiko otomatis diterapkan
          </Typography>
        </Alert>
        <Button
          variant="outlined"
          onClick={handleManualRefresh}
          disabled={loading}
          startIcon={<RotateCcw size={18} />}
        >
          Refresh Config
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Kolom Kiri - Assessment Method */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShieldCheck size={20} />
                Metode Assessment
              </Typography>
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <RadioGroup
                  value={assessmentMethod}
                  onChange={(e) => setAssessmentMethod(e.target.value)}
                >
                  <FormControlLabel
                    value="multiplication"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography fontWeight="bold">Metode Perkalian</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Risk Score = Likelihood × Impact
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="coordinate"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography fontWeight="bold">Metode Matriks Koordinat</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Menggunakan matriks 5x5 dengan nilai yang telah ditentukan
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {assessmentMethod === 'coordinate' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Matriks koordinat menggunakan skala 1-5 untuk Likelihood dan Impact, dengan risk score yang telah ditentukan.
                  </Typography>
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={<Save size={18} />}
                onClick={handleSaveAssessmentMethod}
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Simpan Metode'}
              </Button>
            </CardContent>
          </Card>

          {/* Risk Levels Configuration */}
          <Card sx={{ boxShadow: 2, mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AlertTriangle size={20} />
                  Risk Levels
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Plus size={18} />}
                  size="small"
                  onClick={() => {
                    resetRiskLevelForm();
                    setOpenRiskLevelDialog(true);
                  }}
                >
                  Tambah
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Label</strong></TableCell>
                      <TableCell><strong>Min Score</strong></TableCell>
                      <TableCell><strong>Max Score</strong></TableCell>
                      <TableCell><strong>Warna</strong></TableCell>
                      <TableCell align="center"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessmentConfig?.riskLevels?.map((level, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            label={level.label}
                            size="small"
                            sx={{
                              backgroundColor: level.color,
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>{level.min}</TableCell>
                        <TableCell>{level.max}</TableCell>
                        <TableCell>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: level.color,
                            border: '1px solid #ccc'
                          }} />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditRiskLevel(level)}
                          >
                            <Edit2 size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRiskLevel(level)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Kolom Kanan - Likelihood & Impact Configuration */}
        <Grid item xs={12} md={6}>
          {/* Likelihood Options */}
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp size={20} />
                  Likelihood Options
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Plus size={18} />}
                  size="small"
                  onClick={() => {
                    resetLikelihoodForm();
                    setOpenLikelihoodDialog(true);
                  }}
                >
                  Tambah
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Value</strong></TableCell>
                      <TableCell><strong>Label</strong></TableCell>
                      <TableCell align="center"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessmentConfig?.likelihoodOptions?.map((option, index) => (
                      <TableRow key={index}>
                        <TableCell>{option.value}</TableCell>
                        <TableCell>{option.label}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditLikelihood(option)}
                          >
                            <Edit2 size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteLikelihood(option.value)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Impact Options */}
          <Card sx={{ boxShadow: 2, mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDown size={20} />
                  Impact Options
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Plus size={18} />}
                  size="small"
                  onClick={() => {
                    resetImpactForm();
                    setOpenImpactDialog(true);
                  }}
                >
                  Tambah
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Value</strong></TableCell>
                      <TableCell><strong>Label</strong></TableCell>
                      <TableCell align="center"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessmentConfig?.impactOptions?.map((option, index) => (
                      <TableRow key={index}>
                        <TableCell>{option.value}</TableCell>
                        <TableCell>{option.label}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditImpact(option)}
                          >
                            <Edit2 size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteImpact(option.value)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card sx={{ boxShadow: 2, mt: 3, backgroundColor: 'info.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💡 Informasi Penting
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Likelihood:</strong> Kemungkinan terjadinya risiko (1-5)
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Impact:</strong> Dampak yang ditimbulkan jika risiko terjadi (1-5)
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Risk Levels:</strong> Tingkat risiko berdasarkan score (Likelihood × Impact)
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>REAL-TIME UPDATE:</strong> Perubahan disimpan secara otomatis dan langsung terlihat di semua modul tanpa perlu refresh!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog untuk Likelihood */}
      <Dialog
        open={openLikelihoodDialog}
        onClose={() => setOpenLikelihoodDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Edit Likelihood Option' : 'Tambah Likelihood Option'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Value (1-5)"
                type="number"
                value={likelihoodForm.value}
                onChange={(e) => setLikelihoodForm({ ...likelihoodForm, value: e.target.value })}
                inputProps={{ min: 1, max: 5 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Label"
                value={likelihoodForm.label}
                onChange={(e) => setLikelihoodForm({ ...likelihoodForm, label: e.target.value })}
                placeholder="Contoh: Sangat Rendah"
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLikelihoodDialog(false)}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveLikelihood}
            disabled={!likelihoodForm.value || !likelihoodForm.label || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog untuk Impact */}
      <Dialog
        open={openImpactDialog}
        onClose={() => setOpenImpactDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Edit Impact Option' : 'Tambah Impact Option'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Value (1-5)"
                type="number"
                value={impactForm.value}
                onChange={(e) => setImpactForm({ ...impactForm, value: e.target.value })}
                inputProps={{ min: 1, max: 5 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Label"
                value={impactForm.label}
                onChange={(e) => setImpactForm({ ...impactForm, label: e.target.value })}
                placeholder="Contoh: Dampak tidak signifikan"
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImpactDialog(false)}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveImpact}
            disabled={!impactForm.value || !impactForm.label || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog untuk Risk Level */}
      <Dialog
        open={openRiskLevelDialog}
        onClose={() => setOpenRiskLevelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRiskLevel ? 'Edit Risk Level' : 'Tambah Risk Level'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Label"
                value={riskLevelForm.label}
                onChange={(e) => setRiskLevelForm({ ...riskLevelForm, label: e.target.value })}
                placeholder="Contoh: Sangat Rendah"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min Score"
                type="number"
                value={riskLevelForm.min}
                onChange={(e) => setRiskLevelForm({ ...riskLevelForm, min: e.target.value })}
                inputProps={{ min: 1, max: 25 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Score"
                type="number"
                value={riskLevelForm.max}
                onChange={(e) => setRiskLevelForm({ ...riskLevelForm, max: e.target.value })}
                inputProps={{ min: 1, max: 25 }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Warna</InputLabel>
                <Select
                  value={riskLevelForm.color}
                  label="Warna"
                  onChange={(e) => setRiskLevelForm({ ...riskLevelForm, color: e.target.value })}
                >
                  {colorOptions.map((color) => (
                    <MenuItem key={color.value} value={color.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: color.value,
                          border: '1px solid #ccc'
                        }} />
                        {color.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Pastikan range score tidak overlap dengan risk level lainnya.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRiskLevelDialog(false)}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRiskLevel}
            disabled={!riskLevelForm.label || !riskLevelForm.min || !riskLevelForm.max || !riskLevelForm.color || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Tambahkan Refresh icon jika belum ada
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// === DEFAULT EXPORT ===
// Default export untuk komponen React
export default Configuration;