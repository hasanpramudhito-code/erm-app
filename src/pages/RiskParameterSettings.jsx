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
  Tooltip,
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
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText
} from '@mui/material';
import {
  Save,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Landmark,
  Briefcase,
  Scale,
  Leaf,
  Globe,
  Settings
} from 'lucide-react';
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
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

import Configuration from './Configuration';

const RiskParameterSettings = () => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const [deletingParam, setDeletingParam] = useState(null);
  const { userData } = useAuth();
  const { assessmentConfig, calculateScore, calculateRiskLevel, updateToleranceThreshold } = useAssessmentConfig();
  const [riskTypes, setRiskTypes] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);

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
    actions: '',
    code: '',
    parent: ''
  });

  // Load parameters
  const loadParameters = async () => {
    try {
      setLoading(true);

      // Load semua risk parameters sekaligus
      const paramsQuery = query(collection(db, 'risk_parameters'));
      const paramsSnapshot = await getDocs(paramsQuery);
      const allParams = paramsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter untuk risk_types dan organization_units
      const riskTypesData = allParams.filter(param => param.type === 'risk_type');
      const orgUnitsData = allParams.filter(param => param.type === 'organization_unit');

      setRiskTypes(riskTypesData);
      setOrganizationUnits(orgUnitsData);

      // Filter di client side untuk parameter lainnya
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
      showSnackbar('Error memuat parameter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper untuk mendapatkan data appetite berdasarkan label level risiko
  const getAppetiteForLevel = (levelLabel) => {
    if (!levelLabel) return null;
    // Cari di parameters.riskAppetite berdasarkan name (case-insensitive)
    const appetite = Object.values(parameters.riskAppetite).find(a => 
      a.name.toLowerCase() === levelLabel.toLowerCase()
    );
    return appetite || null;
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
      showSnackbar('Error inisialisasi parameter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit parameter
  const handleEdit = (param, type, category = null) => {
    setEditingParam({ ...param, _type: type, _category: category });
    setFormData({
      type: type || param.type || '',
      level: param.level || '',
      name: param.name || '',
      description: param.description || '',
      minValue: param.minValue || '',
      maxValue: param.maxValue || '',
      examples: param.examples || [],
      color: param.color || '#1976d2',
      actions: param.actions || '',
      code: param.code || '',
      parent: param.parent || ''
    });
    setEditDialog(true);
  };

  // Handle delete parameter
  const handleDelete = (param, type, category = null) => {
    setDeletingParam({ ...param, _type: type, _category: category });
    setDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setLoading(true);

      await deleteDoc(doc(db, 'risk_parameters', deletingParam.id));

      showSnackbar('Parameter berhasil dihapus!', 'success');
      setDeleteDialog(false);
      setDeletingParam(null);
      loadParameters();

    } catch (error) {
      showSnackbar('Error menghapus parameter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
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

      // Hapus field yang kosong
      Object.keys(paramData).forEach(key => {
        if (paramData[key] === '' || paramData[key] === null || paramData[key] === undefined) {
          delete paramData[key];
        }
      });

      if (editingParam?.id) {
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
      'FINANSIAL': <Landmark />,
      'OPERASIONAL': <Briefcase />,
      'REPUTASI': <Globe />,
      'LEGAL': <Scale />,
      'HSE': <Leaf />
    };
    return icons[category] || <AlertTriangle />;
  };

  // Get parameter type label
  const getParameterTypeLabel = (type) => {
    const labels = {
      'likelihood': 'Likelihood Scale',
      'impact': 'Impact Scale',
      'appetite': 'Risk Appetite',
      'tolerance': 'Tolerance Matrix',
      'risk_type': 'Risk Type',
      'organization_unit': 'Organization Unit'
    };
    return labels[type] || 'Parameter';
  };

  useEffect(() => {
    loadParameters();
  }, []);

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
                <ShieldCheck size={40} />
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
              startIcon={<Save size={18} />}
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
            <Tab icon={<AlertTriangle />} label="Impact Scales" />
            <Tab icon={<ShieldCheck />} label="Risk Appetite" />
            <Tab icon={<Briefcase />} label="Tolerance Matrix" />
            <Tab icon={<Briefcase />} label="Risk Types" />
            <Tab icon={<Settings />} label="Assessment Matrix & Config" />
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
                startIcon={<Plus size={18} />}
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
                        <Box display="flex" gap={1}>
                          <IconButton
                            color="primary"
                            onClick={() => handleEdit(item, 'likelihood')}
                          >
                            <Edit2 size={18} />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(item, 'likelihood')}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Box>
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
                <AccordionSummary expandIcon={<ChevronDown />}>
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
                              <Box display="flex" gap={1}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(item, 'impact', category)}
                                >
                                  <Edit2 size={18} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(item, 'impact', category)}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </Box>
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
                startIcon={<Plus size={18} />}
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
                      <Box mt={2} display="flex" gap={1}>
                        <Button
                          size="small"
                          startIcon={<Edit2 size={18} />}
                          onClick={() => handleEdit(item, 'appetite')}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Trash2 size={18} />}
                          onClick={() => handleDelete(item, 'appetite')}
                        >
                          Hapus
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight="bold">
                Risk Tolerance Matrix
              </Typography>
              <Box display="flex" alignItems="center" gap={3} sx={{ minWidth: 300 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Global Tolerance Threshold (Score)
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Slider
                      value={assessmentConfig?.toleranceThreshold || 15}
                      onChange={(e, val) => updateToleranceThreshold(val)}
                      min={1}
                      max={25}
                      step={1}
                      valueLabelDisplay="auto"
                      sx={{ width: 150 }}
                    />
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {assessmentConfig?.toleranceThreshold || 15}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Matrix ini mengolaborasikan <strong>Risk Appetite</strong> (Heatmap Warna) dengan <strong>Risk Tolerance</strong> (Ambang Batas Tunggal). 
              Gunakan slider di atas untuk menyesuaikan batas toleransi organisasi secara dinamis.
            </Alert>

            {/* Tolerance Matrix Visualization */}
            <Paper sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Policy Framework: Appetite vs Tolerance
                </Typography>
                <Box display="flex" gap={2}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }} />
                    <Typography variant="caption">Within Appetite</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 12, height: 12, border: '2px dashed red', borderRadius: '50%' }} />
                    <Typography variant="caption">Exceeds Tolerance</Typography>
                  </Box>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                        Likelihood \ Impact
                      </TableCell>
                      {[1, 2, 3, 4, 5].map(impact => (
                        <TableCell key={impact} align="center" sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                          I{impact}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[5, 4, 3, 2, 1].map(likelihood => (
                      <TableRow key={likelihood}>
                        <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>
                          L{likelihood}
                        </TableCell>
                        {[1, 2, 3, 4, 5].map(impact => {
                          const score = calculateScore(likelihood, impact);
                          const riskLevel = calculateRiskLevel(score);
                          const appetiteDetail = getAppetiteForLevel(riskLevel?.level);
                          const isBreached = score > (assessmentConfig?.toleranceThreshold || 15);
                          
                          return (
                            <Tooltip
                              key={impact}
                              title={
                                <Box sx={{ p: 1 }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                      L{likelihood}-I{impact} (Score: {score})
                                    </Typography>
                                    {isBreached && (
                                      <Chip label="BREACHED" size="small" color="error" variant="filled" sx={{ height: 20, fontSize: '0.6rem' }} />
                                    )}
                                  </Box>
                                  
                                  <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                                    Appetite: "{appetiteDetail?.description || 'No definition'}"
                                  </Typography>
                                  
                                  <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                                  
                                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                    <AlertTriangle size={14} color={isBreached ? "#ff5252" : "#4caf50"} />
                                    <Typography variant="caption" fontWeight="bold">
                                      TOLERANCE STATUS: {isBreached ? 'TOLERANCE EXCEEDED' : 'WITHIN TOLERANCE'}
                                    </Typography>
                                  </Box>
                                  
                                  <Typography variant="body2">
                                    Action: {appetiteDetail?.actions || 'Regular monitoring'}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <TableCell
                                align="center"
                                sx={{
                                  backgroundColor: riskLevel?.color || '#f5f5f5',
                                  color: (riskLevel?.color === '#ffeb3b' || riskLevel?.color === 'warning' || riskLevel?.color === '#81c784') ? 'text.primary' : 'white',
                                  fontWeight: 'bold',
                                  border: isBreached ? '3px dashed #d32f2f' : '1px solid white',
                                  boxShadow: isBreached ? 'inset 0 0 10px rgba(0,0,0,0.1)' : 'none',
                                  minWidth: 120,
                                  height: 90,
                                  cursor: 'help',
                                  position: 'relative',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    filter: 'brightness(0.9)',
                                    transform: 'scale(1.02)',
                                  }
                                }}
                              >
                                {isBreached && (
                                  <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                                    <AlertTriangle size={16} color="#d32f2f" />
                                  </Box>
                                )}
                                <Typography variant="caption" display="block" sx={{ opacity: 0.9, lineHeight: 1.2 }}>
                                  {riskLevel?.level}
                                </Typography>
                                <Typography variant="h5" sx={{ my: 0.5, color: isBreached ? '#d32f2f' : 'inherit' }}>
                                  {score}
                                </Typography>
                                {appetiteDetail?.actions && (
                                  <Typography 
                                    variant="caption" 
                                    display="block" 
                                    sx={{ 
                                      fontSize: '0.65rem', 
                                      lineHeight: 1,
                                      maxWidth: '100%',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {appetiteDetail.actions}
                                  </Typography>
                                )}
                              </TableCell>
                            </Tooltip>
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

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="bold">
                Risk Types (Jenis Risiko)
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => handleEdit({}, 'risk_type')}
              >
                Tambah Jenis Risiko
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell><strong>Kode</strong></TableCell>
                    <TableCell><strong>Nama</strong></TableCell>
                    <TableCell><strong>Deskripsi</strong></TableCell>
                    <TableCell><strong>Aksi</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {riskTypes.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography fontWeight="medium">{item.code || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{item.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.description || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <IconButton
                            color="primary"
                            onClick={() => handleEdit(item, 'risk_type')}
                          >
                            <Edit2 size={18} />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(item, 'risk_type')}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 5 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
             <Configuration />
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                disabled={!!editingParam?.id}
              />
            </Grid>

            {/* Field khusus untuk risk_type dan organization_unit */}
            {(formData.type === 'risk_type' || formData.type === 'organization_unit') && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Kode"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </Grid>
            )}

            {formData.type === 'organization_unit' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Parent Unit"
                  value={formData.parent}
                  onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                  placeholder="Kosongkan jika unit utama"
                />
              </Grid>
            )}

            {/* Field level untuk likelihood, impact, appetite, tolerance */}
            {['likelihood', 'impact', 'appetite', 'tolerance'].includes(formData.type) && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Level"
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              />
            </Grid>

            {['likelihood', 'impact', 'appetite', 'tolerance'].includes(formData.type) && (
              <>
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
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name || !formData.type}
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Konfirmasi Hapus Parameter
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <AlertTriangle color="#d32f2f" size={24} />
            <Typography variant="h6" color="error">
              Hapus Parameter?
            </Typography>
          </Box>
          <Typography variant="body1" paragraph>
            Anda akan menghapus parameter:
          </Typography>
          <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {deletingParam?.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {getParameterTypeLabel(deletingParam?._type)} - Level {deletingParam?.level}
            </Typography>
            {deletingParam?._category && (
              <Typography variant="body2" color="textSecondary">
                Kategori: {deletingParam?._category}
              </Typography>
            )}
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Tindakan ini tidak dapat dibatalkan. Parameter yang dihapus akan hilang permanen.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={loading}
            startIcon={<Trash2 size={18} />}
          >
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
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

export default RiskParameterSettings;