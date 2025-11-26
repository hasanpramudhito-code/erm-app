import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  InputAdornment,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormHelperText
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Warning,
  Description,
  Business,
  Assessment,
  Schedule,
  Person,
  Category,
  AttachMoney,
  Search,
  Visibility,
  History,
  AccountCircle,
  CalendarToday
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const RiskRegister = () => {
  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [codeError, setCodeError] = useState('');
  const { userData } = useAuth();

  // Form data structure
  const [formData, setFormData] = useState({
    riskCode: '',
    riskType: '',
    classification: '',
    riskSource: '',
    riskDescription: '',
    cause: '',
    impactText: '',
    riskOwner: '',
    initialProbability: '',
    initialImpact: '',
    inherentRiskQuantification: '',
    existingControls: '',
    controlEffectiveness: '',
    residualProbability: '',
    residualImpact: '',
    residualRiskQuantification: '',
    additionalControls: '',
    controlCost: '',
    responsiblePerson: '',
    targetCompletion: ''
  });

  // Simple risk sources - Internal/External saja
  const riskSources = ['Internal', 'External'];
  const riskTypes = ['Strategis', 'Operasional', 'Finansial', 'Kepatuhan', 'Reputasi', 'Teknologi'];
  const riskClassifications = ['High Priority', 'Medium Priority', 'Low Priority', 'Critical'];
  const effectivenessLevels = ['Sangat Efektif', 'Efektif', 'Cukup Efektif', 'Kurang Efektif', 'Tidak Efektif'];
  const ratingOptions = [1, 2, 3, 4, 5];

  // Calculate risk level
  const calculateRiskLevel = (impact, probability) => {
    const score = impact * probability;
    if (score >= 20) return { level: 'Extreme', color: 'error', score };
    if (score >= 16) return { level: 'High', color: 'warning', score };
    if (score >= 10) return { level: 'Medium', color: 'info', score };
    return { level: 'Low', color: 'success', score };
  };

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      const risksQuery = query(collection(db, 'risks'), orderBy('createdAt', 'desc'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRisks(risksList);

      const unitsSnapshot = await getDocs(collection(db, 'organization_units'));
      const unitsList = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrganizationUnits(unitsList);

    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error memuat data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Validasi kode unik real-time
  useEffect(() => {
    if (formData.riskCode && !editingRisk) {
      const isCodeExists = risks.some(risk => 
        risk.riskCode?.toLowerCase() === formData.riskCode.toLowerCase() &&
        risk.id !== editingRisk?.id
      );
      if (isCodeExists) {
        setCodeError('Kode Risiko sudah digunakan! Silakan gunakan kode yang berbeda.');
      } else {
        setCodeError('');
      }
    } else {
      setCodeError('');
    }
  }, [formData.riskCode, risks, editingRisk]);

  // Handle form submit - DIPERBAIKI untuk kode manual
  const handleSubmit = async () => {
    try {
      // Validasi required fields
      if (!formData.riskCode || !formData.riskDescription || !formData.riskSource) {
        showSnackbar('Kode Risiko, Deskripsi risiko dan sumber risiko harus diisi!', 'error');
        return;
      }

      // Validasi kode unik untuk risiko baru
      if (!editingRisk) {
        const isCodeExists = risks.some(risk => 
          risk.riskCode?.toLowerCase() === formData.riskCode.toLowerCase()
        );
        if (isCodeExists) {
          showSnackbar('Kode Risiko sudah digunakan! Silakan gunakan kode yang berbeda.', 'error');
          return;
        }
      }

      const riskData = {
        ...formData,
        riskCode: formData.riskCode.toUpperCase(), // Standardize to uppercase
        initialRiskLevel: formData.initialProbability && formData.initialImpact ? 
          calculateRiskLevel(parseInt(formData.initialProbability), parseInt(formData.initialImpact)) : null,
        residualRiskLevel: formData.residualProbability && formData.residualImpact ? 
          calculateRiskLevel(parseInt(formData.residualProbability), parseInt(formData.residualImpact)) : null,
        createdAt: editingRisk ? editingRisk.createdAt : new Date(),
        createdBy: editingRisk ? editingRisk.createdBy : userData?.name,
        updatedAt: new Date(),
        updatedBy: userData?.name,
        status: 'open',
        auditTrail: [
          {
            action: editingRisk ? 'updated' : 'created',
            timestamp: new Date(),
            user: userData?.name,
            changes: editingRisk ? getChangedFields(editingRisk, formData) : []
          }
        ]
      };

      if (editingRisk) {
        const existingAuditTrail = editingRisk.auditTrail || [];
        riskData.auditTrail = [
          ...existingAuditTrail,
          {
            action: 'updated',
            timestamp: new Date(),
            user: userData?.name,
            changes: getChangedFields(editingRisk, formData)
          }
        ];
        
        await updateDoc(doc(db, 'risks', editingRisk.id), riskData);
        showSnackbar('Risiko berhasil diupdate!', 'success');
      } else {
        await addDoc(collection(db, 'risks'), riskData);
        showSnackbar('Risiko berhasil ditambahkan!', 'success');
      }

      setOpenDialog(false);
      setEditingRisk(null);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('Error saving risk:', error);
      showSnackbar('Error menyimpan risiko: ' + error.message, 'error');
    }
  };

  // Get changed fields for audit trail
  const getChangedFields = (oldData, newData) => {
    const changes = [];
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: newData[key]
        });
      }
    });
    return changes;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      riskCode: '',
      riskType: '',
      classification: '',
      riskSource: '',
      riskDescription: '',
      cause: '',
      impactText: '',
      riskOwner: '',
      initialProbability: '',
      initialImpact: '',
      inherentRiskQuantification: '',
      existingControls: '',
      controlEffectiveness: '',
      residualProbability: '',
      residualImpact: '',
      residualRiskQuantification: '',
      additionalControls: '',
      controlCost: '',
      responsiblePerson: '',
      targetCompletion: ''
    });
    setCodeError('');
  };

  // Handle edit
  const handleEdit = (risk) => {
    setEditingRisk(risk);
    setFormData({
      riskCode: risk.riskCode || '',
      riskType: risk.riskType || '',
      classification: risk.classification || '',
      riskSource: risk.riskSource || '',
      riskDescription: risk.riskDescription || '',
      cause: risk.cause || '',
      impactText: risk.impactText || '',
      riskOwner: risk.riskOwner || '',
      initialProbability: risk.initialProbability || '',
      initialImpact: risk.initialImpact || '',
      inherentRiskQuantification: risk.inherentRiskQuantification || '',
      existingControls: risk.existingControls || '',
      controlEffectiveness: risk.controlEffectiveness || '',
      residualProbability: risk.residualProbability || '',
      residualImpact: risk.residualImpact || '',
      residualRiskQuantification: risk.residualRiskQuantification || '',
      additionalControls: risk.additionalControls || '',
      controlCost: risk.controlCost || '',
      responsiblePerson: risk.responsiblePerson || '',
      targetCompletion: risk.targetCompletion || ''
    });
    setOpenDialog(true);
  };

  // Handle view detail
  const handleViewDetail = (risk) => {
    console.log('View Detail clicked:', risk);
    setSelectedRisk(risk);
    setDetailDialog(true);
  };

  // Handle delete
  const handleDelete = async (riskId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus risiko ini?')) {
      try {
        await deleteDoc(doc(db, 'risks', riskId));
        showSnackbar('Risiko berhasil dihapus!', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting risk:', error);
        showSnackbar('Error menghapus risiko: ' + error.message, 'error');
      }
    }
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Table pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter risks based on search term
  const filteredRisks = risks.filter(risk =>
    risk.riskCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.riskDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.riskType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.riskSource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.riskOwner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated risks
  const paginatedRisks = filteredRisks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
                <Warning sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Risk Register
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Identifikasi dan kelola seluruh risiko organisasi
                </Typography>
                <Typography variant="caption" color="primary">
                  ✍️ Kode Risiko sekarang input manual - lebih mudah diingat!
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              size="large"
              sx={{ borderRadius: 2 }}
              onClick={() => setOpenDialog(true)}
            >
              Tambah Risiko
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Search Box */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Cari risiko berdasarkan kode, deskripsi, jenis, sumber, atau pemilik risiko..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Risks Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Daftar Risiko ({filteredRisks.length})
          </Typography>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary" mt={1}>
                Memuat data risiko...
              </Typography>
            </Box>
          ) : risks.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Belum ada risiko yang teridentifikasi.
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Kode Risiko</strong></TableCell>
                      <TableCell><strong>Deskripsi</strong></TableCell>
                      <TableCell><strong>Jenis</strong></TableCell>
                      <TableCell><strong>Sumber</strong></TableCell>
                      <TableCell><strong>Pemilik Risiko</strong></TableCell>
                      <TableCell><strong>Inherent</strong></TableCell>
                      <TableCell><strong>Residual</strong></TableCell>
                      <TableCell><strong>PIC</strong></TableCell>
                      <TableCell><strong>Target</strong></TableCell>
                      <TableCell><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRisks.map((risk) => {
                      const initialLevel = risk.initialRiskLevel || {};
                      const residualLevel = risk.residualRiskLevel || {};
                      
                      return (
                        <TableRow key={risk.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {risk.riskCode}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 300 }}>
                              {risk.riskDescription?.substring(0, 100)}
                              {risk.riskDescription?.length > 100 && '...'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={risk.riskType} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={risk.riskSource} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {risk.riskOwner ? (
                              <Chip 
                                label={risk.riskOwner}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {initialLevel.level ? (
                              <Chip 
                                label={`${initialLevel.level} (${initialLevel.score})`}
                                size="small" 
                                color={initialLevel.color}
                              />
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                Belum dinilai
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {residualLevel.level ? (
                              <Chip 
                                label={`${residualLevel.level} (${residualLevel.score})`}
                                size="small" 
                                color={residualLevel.color}
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                Belum dinilai
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {risk.responsiblePerson ? (
                              <Chip 
                                label={risk.responsiblePerson}
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {risk.targetCompletion ? (
                              <Typography variant="body2">
                                {new Date(risk.targetCompletion).toLocaleDateString('id-ID')}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Lihat Detail">
                                <IconButton 
                                  color="info"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetail(risk);
                                  }}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Risiko">
                                <IconButton 
                                  color="primary"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(risk);
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Hapus Risiko">
                                <IconButton 
                                  color="error" 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(risk.id);
                                  }}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredRisks.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Baris per halaman:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} dari ${count} risiko`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditingRisk(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning />
            {editingRisk ? 'Edit Risiko' : 'Tambah Risiko Baru'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            {/* Section 1: Identifikasi Risiko */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description /> 1. Identifikasi Risiko
              </Typography>
              <Grid container spacing={2}>
                {/* ✅ PERBAIKAN: Kode Risiko Manual dengan Validasi */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kode Risiko *"
                    value={formData.riskCode}
                    onChange={(e) => setFormData({ ...formData, riskCode: e.target.value })}
                    placeholder="Contoh: RISK-001, OP-2024-01, FIN-001"
                    required
                    error={!!codeError}
                    helperText={codeError || "Masukkan kode unik untuk risiko ini"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Description />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Jenis Risiko</InputLabel>
                    <Select
                      value={formData.riskType}
                      label="Jenis Risiko"
                      onChange={(e) => setFormData({ ...formData, riskType: e.target.value })}
                    >
                      {riskTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Klasifikasi</InputLabel>
                    <Select
                      value={formData.classification}
                      label="Klasifikasi"
                      onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                    >
                      {riskClassifications.map((classification) => (
                        <MenuItem key={classification} value={classification}>
                          {classification}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sumber Risiko *</InputLabel>
                    <Select
                      value={formData.riskSource}
                      label="Sumber Risiko"
                      onChange={(e) => setFormData({ ...formData, riskSource: e.target.value })}
                      required
                    >
                      {riskSources.map((source) => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Deskripsi Risiko *"
                    required
                    multiline
                    rows={3}
                    value={formData.riskDescription}
                    onChange={(e) => setFormData({ ...formData, riskDescription: e.target.value })}
                    placeholder="Jelaskan risiko secara detail..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Penyebab"
                    multiline
                    rows={2}
                    value={formData.cause}
                    onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                    placeholder="Apa penyebab risiko ini?"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dampak (Teks)"
                    multiline
                    rows={2}
                    value={formData.impactText}
                    onChange={(e) => setFormData({ ...formData, impactText: e.target.value })}
                    placeholder="Jelaskan dampak yang mungkin terjadi..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Pemilik Risiko"
                    value={formData.riskOwner}
                    onChange={(e) => setFormData({ ...formData, riskOwner: e.target.value })}
                    placeholder="Nama pemilik risiko"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Section 2: Penilaian Risiko Inheren */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment /> 2. Penilaian Risiko Inheren (Awal)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Probabilitas Awal (1-5)</InputLabel>
                    <Select
                      value={formData.initialProbability}
                      label="Probabilitas Awal (1-5)"
                      onChange={(e) => setFormData({ ...formData, initialProbability: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dampak Awal (1-5)</InputLabel>
                    <Select
                      value={formData.initialImpact}
                      label="Dampak Awal (1-5)"
                      onChange={(e) => setFormData({ ...formData, initialImpact: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Risiko Inherent"
                    multiline
                    rows={2}
                    value={formData.inherentRiskQuantification}
                    onChange={(e) => setFormData({ ...formData, inherentRiskQuantification: e.target.value })}
                    placeholder="Kuantifikasi risiko inherent (dalam nilai moneter atau lainnya)..."
                  />
                </Grid>
                {formData.initialProbability && formData.initialImpact && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Risk Score: {formData.initialProbability * formData.initialImpact} - 
                      Level: {calculateRiskLevel(parseInt(formData.initialProbability), parseInt(formData.initialImpact)).level}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Section 3: Kontrol dan Penilaian Residual */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business /> 3. Kontrol dan Penilaian Residual
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kontrol Internal yang Ada"
                    multiline
                    rows={3}
                    value={formData.existingControls}
                    onChange={(e) => setFormData({ ...formData, existingControls: e.target.value })}
                    placeholder="Deskripsi kontrol yang sudah ada..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Efektivitas Kontrol</InputLabel>
                    <Select
                      value={formData.controlEffectiveness}
                      label="Efektivitas Kontrol"
                      onChange={(e) => setFormData({ ...formData, controlEffectiveness: e.target.value })}
                    >
                      {effectivenessLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Section 4: Penilaian Risiko Residual */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment /> 4. Penilaian Risiko Residual (Akhir)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Probabilitas Residual (1-5)</InputLabel>
                    <Select
                      value={formData.residualProbability}
                      label="Probabilitas Residual (1-5)"
                      onChange={(e) => setFormData({ ...formData, residualProbability: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dampak Residual (1-5)</InputLabel>
                    <Select
                      value={formData.residualImpact}
                      label="Dampak Residual (1-5)"
                      onChange={(e) => setFormData({ ...formData, residualImpact: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Risiko Residual"
                    multiline
                    rows={2}
                    value={formData.residualRiskQuantification}
                    onChange={(e) => setFormData({ ...formData, residualRiskQuantification: e.target.value })}
                    placeholder="Kuantifikasi risiko residual (dalam nilai moneter atau lainnya)..."
                  />
                </Grid>
                {formData.residualProbability && formData.residualImpact && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Risk Score: {formData.residualProbability * formData.residualImpact} - 
                      Level: {calculateRiskLevel(parseInt(formData.residualProbability), parseInt(formData.residualImpact)).level}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Section 5: Rencana Aksi */}
            <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> 5. Rencana Aksi
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Pengendalian Tambahan yang Diperlukan"
                    multiline
                    rows={3}
                    value={formData.additionalControls}
                    onChange={(e) => setFormData({ ...formData, additionalControls: e.target.value })}
                    placeholder="Rencana pengendalian tambahan untuk mengurangi risiko..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Biaya Pengendalian Tambahan"
                    type="number"
                    value={formData.controlCost}
                    onChange={(e) => setFormData({ ...formData, controlCost: e.target.value })}
                    placeholder="Dalam Rupiah"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Penanggung Jawab"
                    value={formData.responsiblePerson}
                    onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                    placeholder="Nama penanggung jawab"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Target Selesai"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.targetCompletion}
                    onChange={(e) => setFormData({ ...formData, targetCompletion: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Schedule />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingRisk(null);
              resetForm();
            }}
          >
            Batal
          </Button>
          <Button 
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.riskCode || !formData.riskDescription || !formData.riskSource || !!codeError}
          >
            {editingRisk ? 'Update Risiko' : 'Simpan Risiko'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="lg"
        fullWidth
        sx={{ 
          '& .MuiDialog-paper': { 
            minHeight: '80vh',
            maxHeight: '90vh'
          } 
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Visibility />
            Detail Risiko - {selectedRisk?.riskCode}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRisk ? (
            <Box>
              {/* Header Info */}
              <Card sx={{ mb: 3, backgroundColor: 'primary.light', color: 'white' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">Kode Risiko</Typography>
                      <Typography variant="h6">{selectedRisk.riskCode}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">Jenis Risiko</Typography>
                      <Chip label={selectedRisk.riskType} color="primary" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">Sumber Risiko</Typography>
                      <Chip label={selectedRisk.riskSource} variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Grid container spacing={3}>
                {/* Kolom Kiri - Identifikasi & Kontrol */}
                <Grid item xs={12} md={6}>
                  {/* Identifikasi Risiko */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Description />
                        Identifikasi Risiko
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Deskripsi Risiko</Typography>
                          <Typography variant="body1" paragraph>
                            {selectedRisk.riskDescription}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Klasifikasi</Typography>
                          <Typography variant="body1">{selectedRisk.classification || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Pemilik Risiko</Typography>
                          <Typography variant="body1">{selectedRisk.riskOwner || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Penyebab</Typography>
                          <Typography variant="body1">{selectedRisk.cause || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak</Typography>
                          <Typography variant="body1">{selectedRisk.impactText || '-'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Kontrol Existing */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business />
                        Kontrol Existing
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kontrol Internal yang Ada</Typography>
                          <Typography variant="body1">{selectedRisk.existingControls || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Efektivitas Kontrol</Typography>
                          <Typography variant="body1">{selectedRisk.controlEffectiveness || '-'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Rencana Aksi */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person />
                        Rencana Aksi
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Pengendalian Tambahan</Typography>
                          <Typography variant="body1">{selectedRisk.additionalControls || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Biaya Pengendalian</Typography>
                          <Typography variant="body1">
                            {selectedRisk.controlCost ? `Rp ${parseInt(selectedRisk.controlCost).toLocaleString('id-ID')}` : '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Penanggung Jawab</Typography>
                          <Typography variant="body1">{selectedRisk.responsiblePerson || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Target Selesai</Typography>
                          <Typography variant="body1">
                            {selectedRisk.targetCompletion ? 
                              new Date(selectedRisk.targetCompletion).toLocaleDateString('id-ID') : '-'
                            }
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Kolom Kanan - Penilaian & Audit Trail */}
                <Grid item xs={12} md={6}>
                  {/* Penilaian Risiko Inheren */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment />
                        Penilaian Risiko Inheren
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Probabilitas Awal</Typography>
                          <Typography variant="body1">{selectedRisk.initialProbability || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak Awal</Typography>
                          <Typography variant="body1">{selectedRisk.initialImpact || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kuantifikasi Risiko Inherent</Typography>
                          <Typography variant="body1">{selectedRisk.inherentRiskQuantification || '-'}</Typography>
                        </Grid>
                        {selectedRisk.initialRiskLevel && (
                          <Grid item xs={12}>
                            <Alert severity="info">
                              <strong>Risk Score: {selectedRisk.initialRiskLevel.score}</strong> - 
                              Level: {selectedRisk.initialRiskLevel.level}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Penilaian Risiko Residual */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment />
                        Penilaian Risiko Residual
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Probabilitas Residual</Typography>
                          <Typography variant="body1">{selectedRisk.residualProbability || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak Residual</Typography>
                          <Typography variant="body1">{selectedRisk.residualImpact || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kuantifikasi Risiko Residual</Typography>
                          <Typography variant="body1">{selectedRisk.residualRiskQuantification || '-'}</Typography>
                        </Grid>
                        {selectedRisk.residualRiskLevel && (
                          <Grid item xs={12}>
                            <Alert severity="info">
                              <strong>Risk Score: {selectedRisk.residualRiskLevel.score}</strong> - 
                              Level: {selectedRisk.residualRiskLevel.level}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Audit Trail */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History />
                        Audit Trail
                      </Typography>
                      {selectedRisk.auditTrail && selectedRisk.auditTrail.length > 0 ? (
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                          {selectedRisk.auditTrail.map((audit, index) => (
                            <ListItem key={index} divider>
                              <ListItemIcon>
                                <CalendarToday />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="subtitle1">
                                      {audit.action === 'created' ? 'Dibuat' : 'Diupdate'} oleh {audit.user}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                      {audit.timestamp?.toDate().toLocaleString('id-ID')}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  audit.changes && audit.changes.length > 0 ? (
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="body2" fontWeight="bold">
                                        Perubahan:
                                      </Typography>
                                      {audit.changes.map((change, changeIndex) => (
                                        <Typography key={changeIndex} variant="body2" sx={{ ml: 2 }}>
                                          • {change.field}: "{change.oldValue || 'kosong'}" → "{change.newValue || 'kosong'}"
                                        </Typography>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="textSecondary">
                                      Tidak ada perubahan field
                                    </Typography>
                                  )
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Alert severity="info">
                          Belum ada riwayat perubahan untuk risiko ini.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <Typography>Memuat data risiko...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDetailDialog(false)}>
            Tutup
          </Button>
          {selectedRisk && (
            <Button 
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                setDetailDialog(false);
                handleEdit(selectedRisk);
              }}
            >
              Edit Risiko
            </Button>
          )}
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

export default RiskRegister;