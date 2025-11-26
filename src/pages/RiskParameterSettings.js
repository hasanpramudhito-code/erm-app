// File: src/pages/RiskParameterSettings.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText
} from '@mui/material';
import {
  Save,
  Add,
  Edit,
  Delete,
  ExpandMore,
  Warning,
  Assessment,
  TrendingUp,
  AccountBalance,
  Business,
  Gavel,
  Nature,
  Public
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const RiskParameterSettings = () => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const { userData } = useAuth();

  // State untuk semua parameter
  const [parameters, setParameters] = useState({
    likelihoodScale: [],
    impactScales: {},
    riskAppetite: {},
    toleranceMatrix: []
  });

  // Form data untuk edit
  const [formData, setFormData] = useState({
    type: '',
    level: '',
    name: '',
    description: '',
    minValue: '',
    maxValue: '',
    examples: [],
    color: '#1976d2',
    actions: ''
  });

// Di file src/pages/RiskParameterSettings.js - bagian loadParameters

// ❌ QUERY YANG BERMASALAH:
// const likelihoodQuery = query(collection(db, 'risk_parameters'), 
//   where('type', '==', 'likelihood'), orderBy('level'));

// ✅ PERBAIKAN: Load semua data lalu filter di client side
const loadParameters = async () => {
  try {
    setLoading(true);
    
    // Load semua risk parameters sekaligus
    const paramsQuery = query(collection(db, 'risk_parameters'));
    const paramsSnapshot = await getDocs(paramsQuery);
    const allParams = paramsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter di client side
    const likelihoodData = allParams
      .filter(param => param.type === 'likelihood')
      .sort((a, b) => (a.level || 0) - (b.level || 0));

    const impactData = allParams.reduce((acc, param) => {
      if (param.type === 'impact') {
        if (!acc[param.category]) acc[param.category] = [];
        acc[param.category].push(param);
      }
      return acc;
    }, {});

    // Sort each impact category by level
    Object.keys(impactData).forEach(category => {
      impactData[category] = impactData[category].sort((a, b) => (a.level || 0) - (b.level || 0));
    });

    const appetiteData = allParams.filter(param => param.type === 'appetite');
    const matrixData = allParams.filter(param => param.type === 'tolerance');

    setParameters({
      likelihoodScale: likelihoodData,
      impactScales: impactData,
      riskAppetite: appetiteData.reduce((acc, item) => {
        acc[item.level] = item;
        return acc;
      }, {}),
      toleranceMatrix: matrixData
    });

  } catch (error) {
    console.error('Error loading parameters:', error);
    showSnackbar('Error memuat parameter: ' + error.message, 'error');
  } finally {
    setLoading(false);
  }
};

  // Default parameters jika belum ada data
  const initializeDefaultParameters = async () => {
    try {
      setLoading(true);
      
      // Default Likelihood Scale
      const defaultLikelihood = [
        { level: 1, name: 'Sangat Rendah', description: 'Sangat jarang terjadi (>10 tahun)', probability: '0-10%' },
        { level: 2, name: 'Rendah', description: 'Jarang terjadi (5-10 tahun)', probability: '11-30%' },
        { level: 3, name: 'Sedang', description: 'Mungkin terjadi (1-5 tahun)', probability: '31-50%' },
        { level: 4, name: 'Tinggi', description: 'Sering terjadi (beberapa kali/tahun)', probability: '51-70%' },
        { level: 5, name: 'Sangat Tinggi', description: 'Sangat sering terjadi (bulanan)', probability: '71-100%' }
      ];

      for (const item of defaultLikelihood) {
        await addDoc(collection(db, 'risk_parameters'), {
          ...item,
          type: 'likelihood',
          createdAt: new Date(),
          createdBy: userData?.name
        });
      }

      // Default Impact Scales
      const impactCategories = ['FINANSIAL', 'OPERASIONAL', 'REPUTASI', 'LEGAL', 'HSE'];
      const impactLevels = [
        { level: 1, name: 'Sangat Rendah', description: 'Dampak tidak signifikan' },
        { level: 2, name: 'Rendah', description: 'Dampak terbatas' },
        { level: 3, name: 'Sedang', description: 'Dampak signifikan' },
        { level: 4, name: 'Tinggi', description: 'Dampak kritis' },
        { level: 5, name: 'Sangat Tinggi', description: 'Dampak katastropik' }
      ];

      for (const category of impactCategories) {
        for (const level of impactLevels) {
          await addDoc(collection(db, 'risk_parameters'), {
            ...level,
            type: 'impact',
            category: category,
            examples: [],
            createdAt: new Date(),
            createdBy: userData?.name
          });
        }
      }

      // Default Risk Appetite
      const defaultAppetite = [
        { level: 'VERY_LOW', name: 'Sangat Rendah', color: '#4caf50', description: 'Dapat diterima' },
        { level: 'LOW', name: 'Rendah', color: '#81c784', description: 'Dapat diterima dengan kontrol' },
        { level: 'MODERATE', name: 'Sedang', color: '#ffeb3b', description: 'Perlu mitigasi' },
        { level: 'HIGH', name: 'Tinggi', color: '#f57c00', description: 'Perlu mitigasi intensif' },
        { level: 'EXTREME', name: 'Sangat Tinggi', color: '#d32f2f', description: 'Tidak dapat diterima' }
      ];

      for (const item of defaultAppetite) {
        await addDoc(collection(db, 'risk_parameters'), {
          ...item,
          type: 'appetite',
          createdAt: new Date(),
          createdBy: userData?.name
        });
      }

      showSnackbar('Parameter default berhasil diinisialisasi!', 'success');
      loadParameters();
      
    } catch (error) {
      console.error('Error initializing parameters:', error);
      showSnackbar('Error inisialisasi parameter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit parameter
  const handleEdit = (param, type, category = null) => {
    setEditingParam({ ...param, _type: type, _category: category });
    setFormData({
      type: type,
      level: param.level || '',
      name: param.name || '',
      description: param.description || '',
      minValue: param.minValue || '',
      maxValue: param.maxValue || '',
      examples: param.examples || [],
      color: param.color || '#1976d2',
      actions: param.actions || ''
    });
    setEditDialog(true);
  };

  // Handle save parameter
  const handleSave = async () => {
    try {
      setLoading(true);
      
      const paramData = {
        ...formData,
        updatedAt: new Date(),
        updatedBy: userData?.name
      };

      if (editingParam.id) {
        // Update existing
        await updateDoc(doc(db, 'risk_parameters', editingParam.id), paramData);
        showSnackbar('Parameter berhasil diupdate!', 'success');
      } else {
        // Create new
        await addDoc(collection(db, 'risk_parameters'), {
          ...paramData,
          createdAt: new Date(),
          createdBy: userData?.name
        });
        showSnackbar('Parameter berhasil ditambahkan!', 'success');
      }

      setEditDialog(false);
      setEditingParam(null);
      loadParameters();
      
    } catch (error) {
      console.error('Error saving parameter:', error);
      showSnackbar('Error menyimpan parameter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Impact category icons
  const getImpactIcon = (category) => {
    const icons = {
      'FINANSIAL': <AccountBalance />,
      'OPERASIONAL': <Business />,
      'REPUTASI': <Public />,
      'LEGAL': <Gavel />,
      'HSE': <Nature />
    };
    return icons[category] || <Warning />;
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'primary.main', 
                borderRadius: 2,
                color: 'white'
              }}>
                <Assessment sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Risk Parameter Settings
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Kelola parameter dan skala risiko organisasi
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={initializeDefaultParameters}
              disabled={loading}
            >
              Initialize Default
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab icon={<TrendingUp />} label="Likelihood Scale" />
            <Tab icon={<Warning />} label="Impact Scales" />
            <Tab icon={<Assessment />} label="Risk Appetite" />
            <Tab icon={<Business />} label="Tolerance Matrix" />
          </Tabs>
        </CardContent>
      </Card>

      {/* Content berdasarkan tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="bold">
                Likelihood Scale (Kemungkinan Terjadi)
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleEdit({}, 'likelihood')}
              >
                Tambah Level
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell><strong>Level</strong></TableCell>
                    <TableCell><strong>Nama</strong></TableCell>
                    <TableCell><strong>Deskripsi</strong></TableCell>
                    <TableCell><strong>Probabilitas</strong></TableCell>
                    <TableCell><strong>Aksi</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parameters.likelihoodScale.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Chip label={item.level} color="primary" />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{item.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.probability}</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary"
                          onClick={() => handleEdit(item, 'likelihood')}
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Impact Scales (Skala Dampak)
            </Typography>
            
            {Object.keys(parameters.impactScales).map(category => (
              <Accordion key={category} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {getImpactIcon(category)}
                    <Typography fontWeight="bold">{category}</Typography>
                    <Chip 
                      label={`${parameters.impactScales[category]?.length || 0} levels`} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Level</strong></TableCell>
                          <TableCell><strong>Nama</strong></TableCell>
                          <TableCell><strong>Deskripsi</strong></TableCell>
                          <TableCell><strong>Range</strong></TableCell>
                          <TableCell><strong>Aksi</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parameters.impactScales[category]?.map(item => (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Chip label={item.level} size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.description}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.minValue && item.maxValue ? 
                                  `${item.minValue} - ${item.maxValue}` : '-'
                                }
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small"
                                onClick={() => handleEdit(item, 'impact', category)}
                              >
                                <Edit />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="bold">
                Risk Appetite (Selera Risiko)
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleEdit({}, 'appetite')}
              >
                Tambah Level
              </Button>
            </Box>

            <Grid container spacing={2}>
              {Object.values(parameters.riskAppetite).map(item => (
                <Grid item xs={12} md={6} key={item.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderLeft: `4px solid ${item.color || '#1976d2'}`,
                      height: '100%'
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {item.name}
                        </Typography>
                        <Chip 
                          label={item.level} 
                          size="small" 
                          sx={{ backgroundColor: item.color, color: 'white' }}
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {item.description}
                      </Typography>
                      {item.actions && (
                        <Typography variant="body2" fontWeight="medium">
                          Tindakan: {item.actions}
                        </Typography>
                      )}
                      <Box mt={2}>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEdit(item, 'appetite')}
                        >
                          Edit
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Risk Tolerance Matrix
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Matrix toleransi risiko akan di-generate otomatis berdasarkan skala likelihood dan impact.
            </Alert>
            
            {/* Tolerance Matrix Visualization */}
            <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Risk Appetite Matrix (Likelihood vs Impact)
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Likelihood \\ Impact</strong></TableCell>
                      {[1, 2, 3, 4, 5].map(impact => (
                        <TableCell key={impact} align="center">
                          <strong>I{impact}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map(likelihood => (
                      <TableRow key={likelihood}>
                        <TableCell><strong>L{likelihood}</strong></TableCell>
                        {[1, 2, 3, 4, 5].map(impact => {
                          const appetite = getRiskAppetite(likelihood, impact);
                          const appetiteConfig = parameters.riskAppetite[appetite];
                          return (
                            <TableCell 
                              key={impact} 
                              align="center"
                              sx={{ 
                                backgroundColor: appetiteConfig?.color || '#f5f5f5',
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            >
                              {appetiteConfig?.name || appetite}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingParam?.id ? 'Edit Parameter' : 'Tambah Parameter Baru'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Level"
                type="number"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deskripsi"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nilai Minimum"
                value={formData.minValue}
                onChange={(e) => setFormData({ ...formData, minValue: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nilai Maksimum"
                value={formData.maxValue}
                onChange={(e) => setFormData({ ...formData, maxValue: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tindakan yang Direkomendasikan"
                multiline
                rows={2}
                value={formData.actions}
                onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Warna (Hex)"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 20, 
                        backgroundColor: formData.color,
                        borderRadius: 1,
                        mr: 1,
                        border: '1px solid #ccc'
                      }} 
                    />
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!formData.name || !formData.level || !formData.description}
          >
            Simpan
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

// Helper function untuk risk appetite matrix
const getRiskAppetite = (likelihood, impact) => {
  const matrix = {
    1: { 1: 'VERY_LOW', 2: 'VERY_LOW', 3: 'LOW', 4: 'MODERATE', 5: 'MODERATE' },
    2: { 1: 'VERY_LOW', 2: 'LOW', 3: 'MODERATE', 4: 'MODERATE', 5: 'HIGH' },
    3: { 1: 'LOW', 2: 'MODERATE', 3: 'MODERATE', 4: 'HIGH', 5: 'HIGH' },
    4: { 1: 'MODERATE', 2: 'MODERATE', 3: 'HIGH', 4: 'HIGH', 5: 'EXTREME' },
    5: { 1: 'MODERATE', 2: 'HIGH', 3: 'HIGH', 4: 'EXTREME', 5: 'EXTREME' }
  };
  return matrix[impact]?.[likelihood] || 'MODERATE';
};

export default RiskParameterSettings;