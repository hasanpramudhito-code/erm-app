import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Snackbar,
  Paper,
  Tooltip,
  Avatar,
  Badge
} from '@mui/material';
import {
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BellRing,
  BarChart3 as Analytics,
  RefreshCcw,
  History,
  User,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import KRIService from '../services/kriService';
import KRIMonitoringService from '../services/kriMonitoringService';
import { useAuth } from '../contexts/AuthContext'; // ✅ IMPORT AUTHCONTEXT

const KRIMonitoring = () => {
  // ✅ AMBIL USER DATA DARI AUTHCONTEXT
  const { userData, currentUser, authReady } = useAuth();

  const [kris, setKris] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKri, setEditingKri] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openValueDialog, setOpenValueDialog] = useState(false);
  const [selectedKri, setSelectedKri] = useState(null);
  const [newKriValue, setNewKriValue] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [selectedKriForAudit, setSelectedKriForAudit] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data_source: 'manual',
    metric_type: 'percentage',
    threshold_green: 70,
    threshold_yellow: 85,
    threshold_red: 95,
    target_direction: 'lower',
    frequency: 'monthly',
    responsible_person: '',
    unit: '%'
  });

  // Frequency options
  const frequencyOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'quarterly', label: 'Kuartalan' }
  ];

  // Data source options
  const dataSourceOptions = [
    { value: 'manual', label: 'Manual Input' },
    { value: 'risk_count', label: 'Jumlah Risiko' },
    { value: 'treatment_progress', label: 'Progress Treatment' },
    { value: 'high_risk_count', label: 'Jumlah Risiko Tinggi' },
    { value: 'overdue_treatments', label: 'Treatment Terlambat' },
    { value: 'incident_count', label: 'Jumlah Insiden' }
  ];

  // Target direction options
  const targetDirectionOptions = [
    { value: 'lower', label: 'Lower is Better' },
    { value: 'higher', label: 'Higher is Better' }
  ];

  // ✅ FUNGSI UNTUK LOG AUDIT DENGAN USER DARI AUTHCONTEXT
  const logAudit = async (action, kriData, changes = {}) => {
    try {
      // ✅ GUNAKAN USER DATA DARI AUTHCONTEXT
      let userEmail = 'unknown@email.com';
      let userName = 'Unknown User';
      let userRole = 'unknown';
      let userId = 'unknown';

      if (userData) {
        // Prioritaskan userData dari AuthContext (dari Firestore)
        userEmail = userData.email || currentUser?.email || 'unknown@email.com';
        userName = userData.displayName || userData.name || userEmail.split('@')[0];
        userRole = userData.role || 'unknown';
        userId = userData.uid || currentUser?.uid || 'unknown';
      } else if (currentUser) {
        // Fallback ke currentUser dari Firebase Auth
        userEmail = currentUser.email || 'unknown@email.com';
        userName = currentUser.displayName || userEmail.split('@')[0];
        userId = currentUser.uid || 'unknown';
      }

      const auditData = {
        action: action,
        kri_id: kriData.id,
        kri_name: kriData.name,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_role: userRole,
        changes: changes,
        timestamp: Timestamp.now(),
        previous_value: kriData.current_value,
        new_value: changes.current_value || kriData.current_value
      };

      await addDoc(collection(db, 'kri_audit_logs'), auditData);

    } catch (error) {
    }
  };

  // ✅ LOAD AUDIT LOGS UNTUK KRI TERTENTU
  const loadAuditLogs = async (kriId) => {
    try {
      const auditRef = collection(db, 'kri_audit_logs');
      const q = query(auditRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      const logs = snapshot.docs
        .filter(doc => doc.data().kri_id === kriId)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : new Date())
          };
        });

      setAuditLogs(logs);
      setShowAuditDialog(true);
    } catch (error) {
      showSnackbar('Error memuat audit logs', 'error');
    }
  };

  // ✅ LOAD KRIs DARI KRI SERVICE
  const loadKris = async () => {
    try {
      setLoading(true);
      const krisData = await KRIService.getAllKRIs();
      setKris(krisData);
    } catch (error) {
      showSnackbar('Error memuat data KRI: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MANUAL REFRESH KRI DATA
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await KRIMonitoringService.manualTrigger();
      await loadKris();
      showSnackbar('KRI data refreshed successfully!', 'success');
    } catch (error) {
      showSnackbar('Error refreshing KRI data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 🔒 GERBANG UTAMA (INI KUNCI)
    if (!authReady || !currentUser) {
      return;
    }

    loadKris();

  }, [authReady, currentUser]);

  // ✅ GET CURRENT STATUS FOR KRI
  const getKriStatus = (kri) => {
    const currentValue = kri.current_value || 0;

    if (kri.target_direction === 'lower') {
      if (currentValue <= kri.threshold_green) return { status: 'green', label: 'Normal', color: 'success' };
      if (currentValue <= kri.threshold_yellow) return { status: 'yellow', label: 'Warning', color: 'warning' };
      return { status: 'red', label: 'Critical', color: 'error' };
    } else {
      if (currentValue >= kri.threshold_green) return { status: 'green', label: 'Normal', color: 'success' };
      if (currentValue >= kri.threshold_yellow) return { status: 'yellow', label: 'Warning', color: 'warning' };
      return { status: 'red', label: 'Critical', color: 'error' };
    }
  };

  // ✅ HITUNG STATUS BERDASARKAN VALUE
  const calculateStatusByValue = (kri, value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return kri.status || 'green';

    if (kri.target_direction === 'lower') {
      if (val <= kri.threshold_green) return 'green';
      if (val <= kri.threshold_yellow) return 'yellow';
      return 'red';
    } else {
      if (val >= kri.threshold_green) return 'green';
      if (val >= kri.threshold_yellow) return 'yellow';
      return 'red';
    }
  };

  // ✅ GET STATUS ICON
  const getStatusIcon = (status) => {
    switch (status) {
      case 'green': return <CheckCircle2 color="#2e7d32" size={20} />;
      case 'yellow': return <AlertTriangle color="#ed6c02" size={20} />;
      case 'red': return <BellRing color="#d32f2f" size={20} />;
      default: return <CheckCircle2 color="#757575" size={20} />;
    }
  };

  // ✅ HANDLE CREATE/UPDATE KRI (DENGAN USER INFO)
  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.description) {
        showSnackbar('Nama dan Deskripsi KRI harus diisi!', 'error');
        return;
      }

      // 🔒 VALIDASI LOGIKA THRESHOLD
      const green = parseFloat(formData.threshold_green);
      const yellow = parseFloat(formData.threshold_yellow);
      const red = parseFloat(formData.threshold_red);

      if (isNaN(green) || isNaN(yellow) || isNaN(red)) {
        showSnackbar('Threshold harus berupa angka yang valid', 'error');
        return;
      }

      if (green >= yellow || yellow >= red) {
        showSnackbar('Threshold harus berurutan (Green < Yellow < Red)', 'error');
        return;
      }

      // ✅ AMBIL USER INFO DARI AUTHCONTEXT
      const currentUserEmail = userData?.email || currentUser?.email || 'unknown@email.com';
      const currentUserName = userData?.displayName || userData?.name || currentUserEmail.split('@')[0];
      const currentUserId = userData?.uid || currentUser?.uid || 'unknown';

      const kriData = {
        ...formData,
        threshold_green: parseFloat(formData.threshold_green),
        threshold_yellow: parseFloat(formData.threshold_yellow),
        threshold_red: parseFloat(formData.threshold_red),
        last_updated_by: currentUserEmail,
        last_updated_by_name: currentUserName,
        last_updated_by_id: currentUserId,
        last_updated_at: Timestamp.now(),
        ...(editingKri
          ? {}
          : {
            current_value: 0,
            previous_value: 0,
            status: 'inactive',
            trend: 'stable',
            created_by: currentUserEmail,
            created_by_name: currentUserName,
            created_by_id: currentUserId,
            created_at: Timestamp.now()
          })
      };

      if (editingKri) {
        // ✅ LOG AUDIT SEBELUM UPDATE
        await logAudit('update', editingKri, {
          old_name: editingKri.name,
          new_name: formData.name,
          old_thresholds: {
            green: editingKri.threshold_green,
            yellow: editingKri.threshold_yellow,
            red: editingKri.threshold_red
          },
          new_thresholds: {
            green: formData.threshold_green,
            yellow: formData.threshold_yellow,
            red: formData.threshold_red
          }
        });

        // Update existing KRI
        await updateDoc(doc(db, 'kris', editingKri.id), kriData);
        showSnackbar('KRI berhasil diupdate!', 'success');
      } else {
        // Create new KRI menggunakan KRIService
        const newKriRef = await KRIService.createKRI(kriData);

        // ✅ LOG AUDIT SETELAH CREATE
        const newKriWithId = { ...kriData, id: newKriRef.id };
        await logAudit('create', newKriWithId);

        showSnackbar('KRI berhasil dibuat!', 'success');
      }

      setOpenDialog(false);
      setEditingKri(null);
      resetForm();
      await loadKris();

    } catch (error) {
      showSnackbar('Error menyimpan KRI: ' + error.message, 'error');
    }
  };

  // ✅ RESET FORM
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      data_source: 'manual',
      metric_type: 'percentage',
      threshold_green: 70,
      threshold_yellow: 85,
      threshold_red: 95,
      target_direction: 'lower',
      frequency: 'monthly',
      responsible_person: '',
      unit: '%'
    });
  };

  // ✅ HANDLE EDIT
  const handleEdit = (kri) => {
    setEditingKri(kri);
    setFormData({
      name: kri.name,
      description: kri.description,
      data_source: kri.data_source || 'manual',
      metric_type: kri.metric_type || 'percentage',
      threshold_green: kri.threshold_green || 70,
      threshold_yellow: kri.threshold_yellow || 85,
      threshold_red: kri.threshold_red || 95,
      target_direction: kri.target_direction || 'lower',
      frequency: kri.frequency || 'monthly',
      responsible_person: kri.responsible_person || '',
      unit: kri.unit || '%'
    });
    setOpenDialog(true);
  };

  // ✅ HANDLE DELETE (DENGAN AUDIT LOG)
  const handleDelete = async (kriId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus KRI ini?')) {
      try {
        const kriToDelete = kris.find(k => k.id === kriId);

        // ✅ LOG AUDIT SEBELUM DELETE
        await logAudit('delete', kriToDelete);

        await deleteDoc(doc(db, 'kris', kriId));
        showSnackbar('KRI berhasil dihapus!', 'success');
        loadKris();
      } catch (error) {
        showSnackbar('Error menghapus KRI: ' + error.message, 'error');
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

  // Statistics
  const stats = {
    total: kris.length,
    critical: kris.filter(kri => getKriStatus(kri).status === 'red').length,
    warning: kris.filter(kri => getKriStatus(kri).status === 'yellow').length,
    normal: kris.filter(kri => getKriStatus(kri).status === 'green').length
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
                backgroundColor: 'warning.main',
                borderRadius: 2,
                color: 'white'
              }}>
                <Analytics size={40} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  KRI Monitoring
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Key Risk Indicators - Real-time Monitoring System
                </Typography>
                {/* ✅ TAMPILKAN USER INFO */}
                {userData && (
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                      {userData.name?.charAt(0) || userData.email?.charAt(0) || 'U'}
                    </Avatar>
                    <Typography variant="caption" color="textSecondary">
                      Logged in as: <strong>{userData.name || userData.email}</strong>
                      {userData.role && ` (${userData.role})`}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshCcw size={18} />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                size="large"
                sx={{ borderRadius: 2 }}
                onClick={() => setOpenDialog(true)}
              >
                Buat KRI Baru
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Analytics size={40} color="#1976d2" style={{ marginBottom: 8 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total KRI
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle2 size={40} color="#2e7d32" />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.normal}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Normal Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AlertTriangle size={40} color="#ed6c02" />
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.warning}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Warning Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BellRing size={40} color="#d32f2f" />
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.critical}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Critical Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KRI Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Daftar Key Risk Indicators ({kris.length})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Last updated: {new Date().toLocaleString()}
            </Typography>
          </Box>

          {loading ? (
            <Box textAlign="center" py={4}>
              <LinearProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Memuat data KRI...
              </Typography>
            </Box>
          ) : kris.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Belum ada KRI yang dibuat. Klik "Buat KRI Baru" untuk membuat yang pertama.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell width="18%">KRI Name</TableCell>
                    <TableCell width="15%">Description</TableCell>
                    <TableCell width="10%">Current Value</TableCell>
                    <TableCell width="10%">Status</TableCell>
                    <TableCell width="10%">Trend</TableCell>
                    <TableCell width="12%">Thresholds</TableCell>
                    <TableCell width="15%">Last Updated By</TableCell>
                    <TableCell width="10%">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kris.map((kri) => {
                    const status = getKriStatus(kri);
                    const currentValue = kri.current_value || 0;

                    return (
                      <TableRow key={kri.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {kri.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {kri.unit || '%'} • {frequencyOptions.find(f => f.value === kri.frequency)?.label}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Source: {dataSourceOptions.find(d => d.value === kri.data_source)?.label}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {kri.description}
                          </Typography>
                          {kri.responsible_person && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              PIC: {kri.responsible_person}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" fontWeight="bold" color={status.color}>
                            {currentValue}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Target: {kri.target_direction === 'lower' ? 'Lower' : 'Higher'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(status.status)}
                            label={status.label}
                            color={status.color}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={kri.trend === 'increasing' ? 'Trend Naik' : kri.trend === 'decreasing' ? 'Trend Turun' : 'Stabil'}>
                            <TrendingUp
                              sx={{
                                color: kri.trend === 'increasing' ? 'error.main' : kri.trend === 'decreasing' ? 'success.main' : 'text.secondary',
                                transform: kri.trend === 'decreasing' ? 'rotate(180deg)' : 'none'
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              Green: {kri.target_direction === 'lower' ? '≤' : '≥'} {kri.threshold_green}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Yellow: {kri.threshold_yellow}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Red: {kri.target_direction === 'lower' ? '>' : '<'} {kri.threshold_red}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                              {kri.last_updated_by?.charAt(0) || kri.created_by?.charAt(0) || '?'}
                            </Avatar>
                            <Box>
                              <Typography variant="caption" display="block">
                                {kri.last_updated_by_name || kri.last_updated_by || kri.created_by_name || kri.created_by || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="block">
                                {kri.last_updated_at?.toDate?.().toLocaleDateString() ||
                                  kri.created_at?.toDate?.().toLocaleDateString() ||
                                  'N/A'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Edit KRI">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleEdit(kri)}
                              >
                                <Edit2 size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Update Value">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  setSelectedKri(kri);
                                  setNewKriValue(kri.current_value ?? '');
                                  setOpenValueDialog(true);
                                }}
                              >
                                Update Nilai
                              </Button>
                            </Tooltip>
                            <Tooltip title="Audit Trail">
                              <IconButton
                                color="info"
                                size="small"
                                onClick={() => {
                                  setSelectedKriForAudit(kri);
                                  loadAuditLogs(kri.id);
                                }}
                              >
                                <History size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete KRI">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDelete(kri.id)}
                              >
                                <Trash2 size={18} />
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingKri(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingKri ? 'Edit Key Risk Indicator' : 'Buat Key Risk Indicator Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nama KRI"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="metric-type-label">Metric Type</InputLabel>
                <Select
                  labelId="metric-type-label"
                  label="Metric Type"
                  value={formData.metric_type}
                  onChange={(e) => {
                    const metricType = e.target.value;
                    let unit = formData.unit;
                    if (metricType === 'percentage') unit = '%';
                    if (metricType === 'currency') unit = 'Rp';
                    if (metricType === 'count') unit = '';
                    if (metricType === 'ratio') unit = '';
                    setFormData({
                      ...formData,
                      metric_type: metricType,
                      unit
                    });
                  }}
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="ratio">Ratio</MenuItem>
                  <MenuItem value="count">Count</MenuItem>
                  <MenuItem value="currency">Currency</MenuItem>
                </Select>
              </FormControl>
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
              <FormControl fullWidth>
                <InputLabel>Sumber Data</InputLabel>
                <Select
                  value={formData.data_source}
                  label="Sumber Data"
                  onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                >
                  {dataSourceOptions.map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Arah Target</InputLabel>
                <Select
                  value={formData.target_direction}
                  label="Arah Target"
                  onChange={(e) => setFormData({ ...formData, target_direction: e.target.value })}
                >
                  {targetDirectionOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Threshold Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Green Threshold"
                type="number"
                inputProps={{ step: '0.01' }}
                value={formData.threshold_green}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    threshold_green: parseFloat(e.target.value.replace(',', '.'))
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Yellow Threshold"
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                value={formData.threshold_yellow}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    threshold_yellow: parseFloat(e.target.value.replace(',', '.'))
                  })
                }
                helperText="Ambang Warning (boleh desimal, mis: 0.1)"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Red Threshold"
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                value={formData.threshold_red}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    threshold_red: parseFloat(e.target.value.replace(',', '.'))
                  })
                }
                helperText="Ambang Critical (boleh desimal, mis: 0.15)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frekuensi Monitoring</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Frekuensi Monitoring"
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  {frequencyOptions.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Penanggung Jawab"
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setEditingKri(null);
              resetForm();
            }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.description}
          >
            {editingKri ? 'Update KRI' : 'Buat KRI'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔽 Dialog Update Nilai KRI */}
      <Dialog
        open={openValueDialog}
        onClose={() => setOpenValueDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Nilai KRI</DialogTitle>
        <DialogContent>
          {selectedKri && (
            <>
              <Typography fontWeight="bold" gutterBottom>
                {selectedKri.name}
              </Typography>

              {/* ✅ TAMPILKAN INFO USER YANG AKAN MENGEDIT */}
              {userData && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                      {userData.name?.charAt(0) || userData.email?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        Perubahan akan dicatat atas nama:
                      </Typography>
                      <Typography variant="subtitle2">
                        <strong>{userData.name || userData.email}</strong>
                        {userData.role && ` (${userData.role})`}
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              )}

              <TextField
                fullWidth
                label={`Nilai Saat Ini (${selectedKri.unit || ''})`}
                type="text"
                inputProps={{ inputMode: 'decimal' }}
                value={newKriValue}
                onChange={(e) => setNewKriValue(e.target.value.replace(',', '.'))}
                helperText="Boleh menggunakan angka desimal (mis: 0,1 atau 0.05)"
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenValueDialog(false)}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!selectedKri) return;

              try {
                const status = calculateStatusByValue(selectedKri, newKriValue);

                // ✅ LOG AUDIT DENGAN USER INFO
                await logAudit('value_update', selectedKri, {
                  old_value: selectedKri.current_value || 0,
                  new_value: newKriValue,
                  status_change: status
                });

                // ✅ AMBIL USER INFO DARI AUTHCONTEXT
                const currentUserEmail = userData?.email || currentUser?.email || 'unknown@email.com';
                const currentUserName = userData?.displayName || userData?.name || currentUserEmail.split('@')[0];
                const currentUserId = userData?.uid || currentUser?.uid || 'unknown';

                await updateDoc(doc(db, 'kris', selectedKri.id), {
                  previous_value: selectedKri.current_value || 0,
                  current_value: Number(newKriValue),
                  status,
                  updated_at: new Date(),
                  last_updated_by: currentUserEmail,
                  last_updated_by_name: currentUserName,
                  last_updated_by_id: currentUserId,
                  last_updated_at: Timestamp.now()
                });

                showSnackbar('Nilai KRI berhasil diupdate', 'success');
                setOpenValueDialog(false);
                setSelectedKri(null);
                setNewKriValue('');
                loadKris();
              } catch (err) {
                showSnackbar('Gagal update nilai KRI', 'error');
              }
            }}
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ DIALOG AUDIT TRAIL */}
      <Dialog
        open={showAuditDialog}
        onClose={() => setShowAuditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <History size={18} />
            Audit Trail - {selectedKriForAudit?.name || 'KRI'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {auditLogs.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Belum ada aktivitas untuk KRI ini.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Waktu</TableCell>
                    <TableCell>Aksi</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Perubahan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.timestamp?.toLocaleString() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={
                            log.action === 'create' ? 'success' :
                              log.action === 'update' ? 'warning' :
                                log.action === 'delete' ? 'error' : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {log.user_name?.charAt(0).toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="caption" display="block">
                              {log.user_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              {log.user_email}
                            </Typography>
                            {log.user_role && log.user_role !== 'unknown' && (
                              <Typography variant="caption" color="textSecondary" display="block">
                                Role: {log.user_role}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.action === 'value_update' ? (
                          <Typography variant="caption">
                            {log.changes?.old_value} → {log.changes?.new_value}
                            {log.changes?.status_change && ` (Status: ${log.changes.status_change})`}
                          </Typography>
                        ) : log.action === 'update' ? (
                          <Typography variant="caption">
                            Update configuration
                          </Typography>
                        ) : (
                          <Typography variant="caption">
                            {log.action === 'create' ? 'KRI dibuat' : 'KRI dihapus'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAuditDialog(false)}>
            Tutup
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

export default KRIMonitoring;