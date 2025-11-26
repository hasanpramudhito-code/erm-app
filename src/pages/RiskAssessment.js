import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Snackbar,
  Menu,
  Popover,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Slider,
  Rating
} from '@mui/material';
import {
  Warning,
  TrendingUp,
  Assessment,
  FilterList,
  Download,
  Edit,
  Visibility,
  BarChart,
  KeyboardArrowDown,
  Close,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import ApprovalWorkflow from '../components/Approval/ApprovalWorkflow';
import { hasPermission, canAssessRisks, ROLES } from '../config/roles';

// Professional Heatmap Component dengan sumbu X = Impact, Y = Likelihood (bawah ke atas)
const ProfessionalRiskMatrix = ({ risks, onCellClick }) => {
  // Initialize 5x5 matrix - [likelihood][impact]
  const matrix = Array(5).fill().map(() => Array(5).fill(0));
  
  // Count risks in each cell - likelihood sebagai row (bawah=1, atas=5), impact sebagai column
  risks.forEach(risk => {
    const likelihood = risk.likelihood || 1;
    const impact = risk.impact || 1;
    if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
      // Sekarang likelihood 1 = row 4 (bawah), likelihood 5 = row 0 (atas)
      matrix[likelihood - 1][impact - 1]++;
    }
  });

  // Get color based on risk level - BERUBAH: sekarang berdasarkan koordinat, bukan perkalian
  const getCellColor = (likelihood, impact) => {
    // Risk level berdasarkan posisi di matrix, bukan perkalian
    // Area merah: likelihood tinggi + impact tinggi (kanan atas)
    if (likelihood >= 4 && impact >= 4) return '#d32f2f'; // Red - Extreme
    if (likelihood >= 4 && impact >= 3) return '#f57c00'; // Orange - High
    if (likelihood >= 3 && impact >= 3) return '#f57c00'; // Orange - High
    if (likelihood >= 3 && impact >= 2) return '#ffeb3b'; // Yellow - Medium
    if (likelihood >= 2 && impact >= 2) return '#ffeb3b'; // Yellow - Medium
    if (likelihood >= 2 && impact >= 1) return '#81c784'; // Green - Low
    return '#4caf50'; // Dark Green - Very Low
  };

  // Get risk level text - BERUBAH: berdasarkan koordinat
  const getRiskLevel = (likelihood, impact) => {
    // Risk level berdasarkan posisi di matrix
    if (likelihood >= 4 && impact >= 4) return 'Extreme';
    if (likelihood >= 4 && impact >= 3) return 'High';
    if (likelihood >= 3 && impact >= 3) return 'High';
    if (likelihood >= 3 && impact >= 2) return 'Medium';
    if (likelihood >= 2 && impact >= 2) return 'Medium';
    if (likelihood >= 2 && impact >= 1) return 'Low';
    return 'Very Low';
  };

  // Get risk level for statistics - TETAP menggunakan perkalian untuk kompatibilitas
  const getRiskLevelForStats = (likelihood, impact) => {
    const score = likelihood * impact;
    if (score >= 20) return 'Extreme';
    if (score >= 16) return 'High';
    if (score >= 10) return 'Medium';
    if (score >= 5) return 'Low';
    return 'Very Low';
  };

  // Impact labels (X-Axis - Horizontal) - dari kiri ke kanan
  const impactLabels = [
    { level: 1, label: 'Insignificant', description: 'Dampak sangat kecil' },
    { level: 2, label: 'Minor', description: 'Dampak kecil' },
    { level: 3, label: 'Moderate', description: 'Dampak sedang' },
    { level: 4, label: 'Major', description: 'Dampak besar' },
    { level: 5, label: 'Catastrophic', description: 'Dampak sangat besar' }
  ];

  // Likelihood labels (Y-Axis - Vertical) - dari ATAS ke BAWAH (5→1)
  const likelihoodLabels = [
    { level: 5, label: 'Highly Probable', description: 'Sangat sering terjadi' },
    { level: 4, label: 'Probable', description: 'Sering terjadi' },
    { level: 3, label: 'Possible', description: 'Mungkin terjadi' },
    { level: 2, label: 'Unlikely', description: 'Jarang terjadi' },
    { level: 1, label: 'Remote', description: 'Sangat jarang terjadi' }
  ];

  return (
    <Card sx={{ height: '100%', boxShadow: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <BarChart sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Risk Matrix Heatmap (Koordinat)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Distribusi risiko berdasarkan posisi koordinat - X: Dampak, Y: Probabilitas
            </Typography>
          </Box>
        </Box>

        {/* Heatmap Table dengan X = Impact, Y = Likelihood (bawah→atas: 1→5) */}
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell 
                  align="center" 
                  colSpan={2}
                  sx={{ 
                    backgroundColor: '#1976d2', 
                    color: 'white',
                    fontWeight: 'bold',
                    border: '2px solid #dee2e6'
                  }}
                >
                  DAMPAK (IMPACT) →
                </TableCell>
                {impactLabels.map((impact) => (
                  <TableCell
                    key={impact.level}
                    align="center"
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold',
                      border: '2px solid #dee2e6',
                      minWidth: 100
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">I{impact.level}</Typography>
                      <Typography variant="caption">{impact.label}</Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {likelihoodLabels.map((likelihood, likelihoodIndex) => (
                <TableRow key={likelihood.level}>
                  {/* Likelihood Label - sekarang dari atas (5) ke bawah (1) */}
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold',
                      border: '2px solid #dee2e6',
                      minWidth: 120
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">L{likelihood.level}</Typography>
                      <Typography variant="caption">{likelihood.label}</Typography>
                    </Box>
                  </TableCell>
                  
                  {/* Likelihood Level Number */}
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: 'grey.100',
                      fontWeight: 'bold',
                      border: '2px solid #dee2e6'
                    }}
                  >
                    {likelihood.level}
                  </TableCell>

                  {/* Heatmap Cells - impact sebagai column, likelihood sebagai row (atas=5, bawah=1) */}
                  {impactLabels.map((impact, impactIndex) => {
                    const count = matrix[likelihood.level - 1][impactIndex];
                    const riskLevel = getRiskLevel(likelihood.level, impact.level);
                    const cellColor = getCellColor(likelihood.level, impact.level);
                    
                    return (
                      <Tooltip
                        key={`${likelihood.level}-${impact.level}`}
                        title={
                          <Box>
                            <Typography variant="subtitle2">
                              {impact.label} Impact, {likelihood.label} Likelihood
                            </Typography>
                            <Typography variant="body2">
                              Risks: {count} | Level: {riskLevel}
                            </Typography>
                            <Typography variant="caption">
                              Posisi: L{likelihood.level}-I{impact.level}
                            </Typography>
                          </Box>
                        }
                        arrow
                      >
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: cellColor,
                            color: riskLevel === 'Medium' ? '#333' : 'white',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            border: '2px solid white',
                            cursor: count > 0 ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            minWidth: 100,
                            height: 80,
                            '&:hover': count > 0 ? {
                              transform: 'scale(1.05)',
                              boxShadow: 3,
                              zIndex: 10
                            } : {}
                          }}
                          onClick={() => count > 0 && onCellClick?.(likelihood.level, impact.level)}
                        >
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {count > 0 ? count : '0'}
                            </Typography>
                            {count > 0 && (
                              <Typography variant="caption" display="block">
                                {riskLevel}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Legend - BERUBAH: sekarang berdasarkan zona koordinat */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Risk Zones (Berdasarkan Posisi):
              </Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Extreme Zone', color: '#d32f2f', desc: 'L4-L5 & I4-I5' },
                  { label: 'High Zone', color: '#f57c00', desc: 'L3-L5 & I3-I5' },
                  { label: 'Medium Zone', color: '#ffeb3b', desc: 'L2-L4 & I2-I4' },
                  { label: 'Low Zone', color: '#81c784', desc: 'L1-L3 & I1-I3' },
                  { label: 'Very Low Zone', color: '#4caf50', desc: 'L1-L2 & I1-I2' }
                ].map((item, index) => (
                  <Grid item xs={12} key={index}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: item.color, 
                          borderRadius: 1,
                          border: '1px solid #ccc'
                        }} 
                      />
                      <Box>
                        <Typography variant="caption" fontWeight="medium">
                          {item.label}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Axis Legend:
              </Typography>
              <Box sx={{ fontSize: '0.8rem' }}>
                <Typography variant="caption" display="block">
                  <strong>X-Axis (Horizontal):</strong> Impact
                </Typography>
                <Typography variant="caption" display="block">
                  I1 (Insignificant) → I5 (Catastrophic)
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  <strong>Y-Axis (Vertical):</strong> Likelihood
                </Typography>
                <Typography variant="caption" display="block">
                  ↑ L5 (Highly Probable) → L1 (Remote) ↓
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Risk Level ditentukan oleh posisi koordinat (L,I)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Summary Statistics - TETAP menggunakan perkalian untuk kompatibilitas */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[
            { 
              label: 'Total Risks', 
              value: risks.length, 
              color: 'primary.main',
              icon: <Assessment />
            },
            { 
              label: 'Extreme Risks', 
              value: risks.filter(r => getRiskLevelForStats(r.likelihood || 1, r.impact || 1) === 'Extreme').length,
              color: '#d32f2f',
              icon: <Warning />
            },
            { 
              label: 'High Risks', 
              value: risks.filter(r => getRiskLevelForStats(r.likelihood || 1, r.impact || 1) === 'High').length,
              color: '#f57c00',
              icon: <TrendingUp />
            },
            { 
              label: 'Assessed', 
              value: risks.filter(r => r.status === 'assessed').length,
              color: 'success.main',
              icon: <Assessment />
            }
          ].map((stat, index) => (
            <Grid item xs={6} sm={3} key={index}>
              <Card variant="outlined" sx={{ textAlign: 'center', py: 1 }}>
                <CardContent>
                  <Box sx={{ color: stat.color, mb: 1 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color={stat.color}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

// Custom Menu Component untuk menghindari accessibility warning
const CustomExportMenu = ({ anchorEl, open, onClose, onExportPDF, onExportCSV, onExportText, loading }) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      sx={{
        '& .MuiPopover-paper': {
          boxShadow: 3,
          borderRadius: 2,
          minWidth: 200,
        }
      }}
    >
      <Box sx={{ p: 1 }}>
        <Button
          fullWidth
          startIcon={<Download />}
          onClick={onExportPDF}
          disabled={loading}
          sx={{ 
            justifyContent: 'flex-start',
            mb: 0.5,
            fontWeight: 'bold'
          }}
        >
          Export ke PDF
        </Button>
        <Button
          fullWidth
          startIcon={<Download />}
          onClick={onExportCSV}
          disabled={loading}
          sx={{ 
            justifyContent: 'flex-start',
            mb: 0.5
          }}
        >
          Export ke CSV
        </Button>
        <Button
          fullWidth
          startIcon={<Download />}
          onClick={onExportText}
          disabled={loading}
          sx={{ 
            justifyContent: 'flex-start'
          }}
        >
          Export ke Text
        </Button>
      </Box>
    </Popover>
  );
};

// Enhanced Risk Assessment Component dengan TIGA Fitur Export (CSV, Text, PDF)
const RiskAssessment = () => {
  const { currentUser, userData } = useAuth();
  const { settings } = useSettings();
  
  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [editingRisk, setEditingRisk] = useState(null);
  const [viewingRisk, setViewingRisk] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // ✅ STATE BARU UNTUK APPROVAL SYSTEM
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);

  const [assessmentData, setAssessmentData] = useState({
    likelihood: 1,
    impact: 1,
    controlEffectiveness: 3,
    residualLikelihood: 1,
    residualImpact: 1,
    treatmentPriority: 'medium'
  });

  // Risk categories
  const riskCategories = [
    'Strategis',
    'Operasional',
    'Finansial',
    'HSSE',
    'IT & Teknologi',
    'Legal & Kepatuhan',
    'Fraud',
    'Reputasi',
    'Lainnya'
  ];

  // Risk status options
  const riskStatuses = [
    { value: 'identified', label: 'Teridentifikasi', color: 'default' },
    { value: 'assessed', label: 'Telah Dinilai', color: 'primary' },
    { value: 'treated', label: 'Dalam Treatment', color: 'warning' },
    { value: 'monitored', label: 'Dimonitor', color: 'info' },
    { value: 'closed', label: 'Ditutup', color: 'success' }
  ];

  // Load risks and organization units
  const loadData = async () => {
    try {
      setLoading(true);
      // Load risks
      const risksSnapshot = await getDocs(collection(db, 'risks'));
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        risksList.push({ id: doc.id, ...doc.data() });
      });
      setRisks(risksList);
      setFilteredRisks(risksList);

      // Load organization units
      const unitsSnapshot = await getDocs(collection(db, 'organization_units'));
      const unitsList = [];
      unitsSnapshot.forEach((doc) => {
        unitsList.push({ id: doc.id, ...doc.data() });
      });
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

  // Filter risks
  useEffect(() => {
    let filtered = risks;
    
    if (selectedUnit !== 'all') {
      filtered = filtered.filter(risk => risk.unitId === selectedUnit);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(risk => risk.category === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(risk => risk.status === selectedStatus);
    }
    
    setFilteredRisks(filtered);
  }, [selectedUnit, selectedCategory, selectedStatus, risks]);

  // ✅ FUNGSI BARU: Handle Risk Approval
  const handleRiskApproval = async (approvalData) => {
    if (!editingRisk) return;

    setLoading(true);
    try {
      // Simpan approval ke database
      const riskRef = doc(db, 'risks', editingRisk.id);
      const newApproval = {
        ...approvalData,
        id: Date.now().toString()
      };

      // Update approval history
      const updatedApprovals = [...(editingRisk.approvals || []), newApproval];
      setApprovalHistory(updatedApprovals);

      // Update risk document dengan approval data
      await updateDoc(riskRef, {
        approvals: updatedApprovals,
        lastApproval: newApproval,
        status: approvalData.action === 'approved' ? 'approved' : 'rejected',
        updatedAt: new Date()
      });

      showSnackbar(`Assessment ${approvalData.action === 'approved' ? 'disetujui' : 'ditolak'}!`, 'success');
      
      // Jika approved, reload data
      if (approvalData.action === 'approved') {
        loadData();
      }

    } catch (error) {
      console.error('Error saving approval:', error);
      showSnackbar('Error menyimpan approval: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNGSI BARU: Check Permission sebelum Assess
  const handleAssessmentWithPermission = (risk) => {
    if (!canAssessRisks(currentUser.role)) {
      showSnackbar('Anda tidak memiliki izin untuk melakukan assessment risiko', 'warning');
      return;
    }
    
    // Lanjutkan dengan assessment normal
    handleAssessment(risk);
  };

  // ===============================
  // VIEW DETAIL FUNCTION
  // ===============================
  const handleViewDetails = (risk) => {
    setViewingRisk(risk);
    setViewDialog(true);
  };

  // ===============================
  // ASSESS RISK FUNCTION
  // ===============================
  const handleAssessment = (risk) => {
    setEditingRisk(risk);
    setAssessmentData({
      likelihood: risk.likelihood || 1,
      impact: risk.impact || 1,
      controlEffectiveness: risk.controlEffectiveness || 3,
      residualLikelihood: risk.residualLikelihood || risk.likelihood || 1,
      residualImpact: risk.residualImpact || risk.impact || 1,
      treatmentPriority: risk.treatmentPriority || 'medium'
    });
    setOpenDialog(true);
  };

  const handleSaveAssessment = async () => {
    if (!editingRisk) return;

    setLoading(true);
    try {
      const residualScore = assessmentData.residualLikelihood * assessmentData.residualImpact;
      const inherentScore = assessmentData.likelihood * assessmentData.impact;
      
      await updateDoc(doc(db, 'risks', editingRisk.id), {
        likelihood: assessmentData.likelihood,
        impact: assessmentData.impact,
        controlEffectiveness: assessmentData.controlEffectiveness,
        residualLikelihood: assessmentData.residualLikelihood,
        residualImpact: assessmentData.residualImpact,
        residualScore: residualScore,
        inherentScore: inherentScore,
        treatmentPriority: assessmentData.treatmentPriority,
        assessedAt: new Date(),
        assessedBy: userData?.name,
        status: 'assessed'
      });

      setOpenDialog(false);
      setEditingRisk(null);
      loadData();
      showSnackbar('Assessment berhasil disimpan!', 'success');
    } catch (error) {
      console.error('Error saving assessment:', error);
      showSnackbar('Error menyimpan assessment: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate risk level - FUNGSI YANG SUDAH ADA (JANGAN DIUBAH)
  const calculateRiskLevel = (score) => {
    if (score >= 20) return { level: 'Extreme', color: 'error' };
    if (score >= 16) return { level: 'High', color: 'warning' };
    if (score >= 10) return { level: 'Medium', color: 'info' };
    if (score >= 5) return { level: 'Low', color: 'success' };
    return { level: 'Very Low', color: 'success' };
  };

  // TAMBAHKAN FUNGSI BARU INI - untuk heatmap koordinat
  const calculateRiskLevelByCoordinate = (likelihood, impact) => {
    // Risk level berdasarkan posisi di matrix
    if (likelihood >= 4 && impact >= 4) return { level: 'Extreme', color: 'error' };
    if (likelihood >= 4 && impact >= 3) return { level: 'High', color: 'warning' };
    if (likelihood >= 3 && impact >= 3) return { level: 'High', color: 'warning' };
    if (likelihood >= 3 && impact >= 2) return { level: 'Medium', color: 'info' };
    if (likelihood >= 2 && impact >= 2) return { level: 'Medium', color: 'info' };
    if (likelihood >= 2 && impact >= 1) return { level: 'Low', color: 'success' };
    return { level: 'Very Low', color: 'success' };
  };

  // Get likelihood label
  const getLikelihoodLabel = (level) => {
    const labels = {
      1: 'Remote (Sangat Jarang)',
      2: 'Unlikely (Jarang)', 
      3: 'Possible (Mungkin)',
      4: 'Probable (Sering)',
      5: 'Highly Probable (Sangat Sering)'
    };
    return labels[level] || 'Unknown';
  };

  // Get impact label
  const getImpactLabel = (level) => {
    const labels = {
      1: 'Insignificant (Sangat Kecil)',
      2: 'Minor (Kecil)',
      3: 'Moderate (Sedang)',
      4: 'Major (Besar)',
      5: 'Catastrophic (Sangat Besar)'
    };
    return labels[level] || 'Unknown';
  };

  // Get treatment priority label
  const getTreatmentPriorityLabel = (priority) => {
    const labels = {
      low: 'Rendah',
      medium: 'Sedang',
      high: 'Tinggi',
      critical: 'Kritis'
    };
    return labels[priority] || priority;
  };

  // ===============================
  // EKSPORT CSV FUNCTION
  // ===============================
  const exportToCSV = () => {
    try {
      setExportLoading(true);
      setExportMenuAnchor(null);
      
      // Prepare CSV content
      const headers = [
        'Kode Risiko',
        'Deskripsi Risiko', 
        'Kategori',
        'Unit Organisasi',
        'Likelihood',
        'Impact',
        'Risk Score',
        'Risk Level',
        'Status',
        'Tanggal Assessment',
        'Assessed By',
        'Control Effectiveness',
        'Residual Likelihood',
        'Residual Impact',
        'Residual Score',
        'Treatment Priority',
        'Approval Status',  // ✅ BARU
        'Last Approver',    // ✅ BARU
        'Approval Date'     // ✅ BARU
      ];

      const csvData = filteredRisks.map(risk => [
        risk.riskCode || 'N/A',
        risk.title || risk.riskDescription || 'N/A',
        risk.category || 'N/A',
        getUnitName(risk.unitId),
        risk.likelihood || 1,
        risk.impact || 1,
        (risk.likelihood * risk.impact) || 1,
        calculateRiskLevel(risk.likelihood * risk.impact).level,
        getStatusLabel(risk.status),
        risk.assessedAt ? new Date(risk.assessedAt.seconds * 1000).toLocaleDateString('id-ID') : 'Belum Assess',
        risk.assessedBy || 'N/A',
        risk.controlEffectiveness || 'N/A',
        risk.residualLikelihood || 'N/A',
        risk.residualImpact || 'N/A',
        risk.residualScore || 'N/A',
        risk.treatmentPriority || 'N/A',
        risk.approvals ? risk.approvals[risk.approvals.length - 1]?.status || 'Pending' : 'Pending', // ✅ BARU
        risk.lastApproval?.approvedBy || 'N/A', // ✅ BARU
        risk.lastApproval?.timestamp ? new Date(risk.lastApproval.timestamp).toLocaleDateString('id-ID') : 'N/A' // ✅ BARU
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Risk_Assessment_CSV_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Laporan CSV berhasil diexport!', 'success');
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showSnackbar('Error mengexport CSV: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // ===============================
  // EKSPORT TEXT FUNCTION
  // ===============================
  const exportToText = () => {
    try {
      setExportLoading(true);
      setExportMenuAnchor(null);
      
      const reportContent = `
LAPORAN RISK ASSESSMENT - SISTEM ERM
=====================================

Tanggal Generate: ${new Date().toLocaleDateString('id-ID', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
Dibuat Oleh: ${userData?.name || 'System'}
Total Data Risiko: ${risks.length} risiko

SUMMARY EKSEKUTIF
==================
Total Semua Risiko: ${risks.length}
Risiko Extreme: ${risks.filter(r => (r.likelihood * r.impact) >= 20).length}
Risiko High: ${risks.filter(r => (r.likelihood * r.impact) >= 16 && (r.likelihood * r.impact) < 20).length}
Risiko Medium: ${risks.filter(r => (r.likelihood * r.impact) >= 10 && (r.likelihood * r.impact) < 16).length}
Risiko Low: ${risks.filter(r => (r.likelihood * r.impact) >= 5 && (r.likelihood * r.impact) < 10).length}
Risiko Very Low: ${risks.filter(r => (r.likelihood * r.impact) < 5).length}
Telah Dinilai: ${risks.filter(r => r.status === 'assessed').length}
Progress Assessment: ${Math.round((risks.filter(r => r.status === 'assessed').length / Math.max(risks.length, 1)) * 100)}%

DISTRIBUSI RISK MATRIX
=======================
${generateMatrixText()}

DETAIL RISK REGISTER
=====================
${generateRiskDetailsText()}

STATISTICS PER KATEGORI
========================
${generateCategoryStats()}

APPROVAL STATUS
================
Total Approved: ${risks.filter(r => r.approvals && r.approvals.some(a => a.status === 'approved')).length}
Total Pending: ${risks.filter(r => !r.approvals || r.approvals.length === 0).length}
Total Rejected: ${risks.filter(r => r.approvals && r.approvals.some(a => a.status === 'rejected')).length}

RINGKASAN
==========
- Total risiko yang perlu perhatian (Extreme + High): ${risks.filter(r => (r.likelihood * r.impact) >= 16).length}
- Tingkat kematangan assessment: ${Math.round((risks.filter(r => r.status === 'assessed').length / Math.max(risks.length, 1)) * 100)}%
- Risiko dengan treatment priority High: ${risks.filter(r => r.treatmentPriority === 'high').length}
- Risiko yang sudah disetujui: ${risks.filter(r => r.approvals && r.approvals.some(a => a.status === 'approved')).length}

*** Laporan ini digenerate secara otomatis dari Sistem ERM ***
      `.trim();

      // Create and download text file
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Risk_Assessment_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Laporan Text berhasil diexport!', 'success');
      
    } catch (error) {
      console.error('Error exporting text:', error);
      showSnackbar('Error mengexport laporan: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // ===============================
  // EKSPORT PDF FUNCTION - DIPERBAIKI
  // ===============================
  const exportToPDF = async () => {
    try {
      setExportLoading(true);
      setExportMenuAnchor(null);

      // Dynamic import untuk menghindari error
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin;

      // Header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN RISK ASSESSMENT', pageWidth / 2, 12, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 18, { align: 'center' });
      doc.text(`By: ${userData?.name || 'System'}`, pageWidth / 2, 22, { align: 'center' });

      yPosition = 35;

      // Executive Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryLines = [
        `Total Risks: ${risks.length}`,
        `Extreme Risks: ${risks.filter(r => (r.likelihood * r.impact) >= 20).length}`,
        `High Risks: ${risks.filter(r => (r.likelihood * r.impact) >= 16 && (r.likelihood * r.impact) < 20).length}`,
        `Assessed Risks: ${risks.filter(r => r.status === 'assessed').length}`,
        `Approved Risks: ${risks.filter(r => r.approvals && r.approvals.some(a => a.status === 'approved')).length}`,
        `Assessment Progress: ${Math.round((risks.filter(r => r.status === 'assessed').length / Math.max(risks.length, 1)) * 100)}%`
      ];

      summaryLines.forEach(line => {
        doc.text(`• ${line}`, margin + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      // Risk Matrix Section
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RISK MATRIX DISTRIBUTION', margin, yPosition);
      yPosition += 8;

      // Create simple matrix table for PDF
      const matrix = Array(5).fill().map(() => Array(5).fill(0));
      risks.forEach(risk => {
        const likelihood = risk.likelihood || 1;
        const impact = risk.impact || 1;
        if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
          matrix[likelihood - 1][impact - 1]++;
        }
      });

      // Matrix header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Likelihood/Impact', margin, yPosition);
      for (let i = 0; i < 5; i++) {
        doc.text(`I${i+1}`, margin + 40 + (i * 15), yPosition);
      }
      yPosition += 5;

      // Matrix rows
      const likelihoodLabels = ['L5 (High Prob)', 'L4 (Probable)', 'L3 (Possible)', 'L2 (Unlikely)', 'L1 (Remote)'];
      matrix.forEach((row, index) => {
        doc.setFontSize(7);
        doc.text(likelihoodLabels[index], margin, yPosition);
        row.forEach((count, colIndex) => {
          const xPos = margin + 40 + (colIndex * 15);
          doc.text(count.toString(), xPos, yPosition);
        });
        yPosition += 4;
      });

      yPosition += 10;

      // Risk Details Section
      if (yPosition > 200) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED RISK REGISTER', margin, yPosition);
      yPosition += 8;

      if (filteredRisks.length > 0) {
        doc.setFontSize(7);
        filteredRisks.forEach((risk, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = margin;
          }

          const score = (risk.likelihood * risk.impact) || 1;
          const riskLevel = calculateRiskLevel(score);
          const approvalStatus = risk.approvals ? 
            risk.approvals[risk.approvals.length - 1]?.status || 'Pending' : 'Pending';
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${risk.riskCode || 'RISK-' + (index + 1)}`, margin, yPosition);
          yPosition += 4;
          
          doc.setFont('helvetica', 'normal');
          doc.text(`   Deskripsi: ${(risk.title || risk.riskDescription || 'N/A').substring(0, 60)}...`, margin, yPosition);
          yPosition += 4;
          doc.text(`   Kategori: ${risk.category || 'N/A'} | Unit: ${getUnitName(risk.unitId)}`, margin, yPosition);
          yPosition += 4;
          doc.text(`   Likelihood: ${risk.likelihood || 1} | Impact: ${risk.impact || 1} | Score: ${score} | Level: ${riskLevel.level}`, margin, yPosition);
          yPosition += 4;
          doc.text(`   Status: ${getStatusLabel(risk.status)} | Approval: ${approvalStatus}`, margin, yPosition);
          yPosition += 6;

          if (index < filteredRisks.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 4;
          }
        });
      } else {
        doc.setFontSize(9);
        doc.text('Tidak ada data risiko dengan filter saat ini.', margin, yPosition);
        yPosition += 10;
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Halaman ${i} dari ${totalPages} - Laporan Risk Assessment - ${new Date().toLocaleDateString('id-ID')}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`Laporan_Risk_Assessment_${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('Laporan PDF berhasil diexport!', 'success');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      showSnackbar('Error mengexport PDF: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Helper function to generate matrix text
  const generateMatrixText = () => {
    const matrix = Array(5).fill().map(() => Array(5).fill(0));
    
    risks.forEach(risk => {
      const likelihood = risk.likelihood || 1;
      const impact = risk.impact || 1;
      if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
        matrix[likelihood - 1][impact - 1]++;
      }
    });

    const impactLabels = ['I1(Insignificant)', 'I2(Minor)', 'I3(Moderate)', 'I4(Major)', 'I5(Catastrophic)'];
    const likelihoodLabels = [
      'L5 (Highly Probable)',
      'L4 (Probable)',
      'L3 (Possible)', 
      'L2 (Unlikely)',
      'L1 (Remote)'
    ];
    
    let matrixText = '                ' + impactLabels.join('   ') + '\n';
    matrixText += '                ' + '-'.repeat(65) + '\n';
    
    matrix.forEach((row, index) => {
      matrixText += likelihoodLabels[index].padEnd(18) + '| ' + 
                   row.map(count => count.toString().padStart(2).padEnd(5)).join('  ') + '\n';
    });
    
    return matrixText;
  };

  // Helper function to generate risk details text
  const generateRiskDetailsText = () => {
    if (filteredRisks.length === 0) return 'Tidak ada risiko yang sesuai dengan filter saat ini.\n';
    
    let detailsText = '';
    
    filteredRisks.forEach((risk, index) => {
      const score = (risk.likelihood * risk.impact) || 1;
      const riskLevel = calculateRiskLevel(score).level;
      const approvalStatus = risk.approvals ? 
        risk.approvals[risk.approvals.length - 1]?.status || 'Pending' : 'Pending';
      
      detailsText += `\n${index + 1}. ${risk.riskCode || 'RISK-' + (index + 1).toString().padStart(3, '0')}\n`;
      detailsText += `   Deskripsi   : ${risk.title || risk.riskDescription || 'N/A'}\n`;
      detailsText += `   Kategori    : ${risk.category || 'N/A'}\n`;
      detailsText += `   Unit        : ${getUnitName(risk.unitId)}\n`;
      detailsText += `   Likelihood  : ${risk.likelihood || 1} (${getLikelihoodLabel(risk.likelihood)}) | Impact: ${risk.impact || 1} (${getImpactLabel(risk.impact)})\n`;
      detailsText += `   Risk Score  : ${score} | Level: ${riskLevel}\n`;
      detailsText += `   Status      : ${getStatusLabel(risk.status)} | Approval: ${approvalStatus}\n`;
      
      if (risk.assessedBy) {
        detailsText += `   Assessed By : ${risk.assessedBy}\n`;
        detailsText += `   Assessed At : ${risk.assessedAt ? new Date(risk.assessedAt.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}\n`;
      }
      
      if (risk.controlEffectiveness) {
        detailsText += `   Control Eff.: ${risk.controlEffectiveness}/5\n`;
      }
      
      if (risk.residualScore) {
        detailsText += `   Residual    : L${risk.residualLikelihood} x I${risk.residualImpact} = Score ${risk.residualScore}\n`;
      }
      
      if (risk.treatmentPriority) {
        detailsText += `   Treatment   : ${risk.treatmentPriority}\n`;
      }

      // ✅ TAMBAHKAN APPROVAL INFO
      if (risk.approvals && risk.approvals.length > 0) {
        const lastApproval = risk.approvals[risk.approvals.length - 1];
        detailsText += `   Last Approval: ${lastApproval.status} by ${lastApproval.approvedBy || lastApproval.rejectedBy} on ${new Date(lastApproval.timestamp).toLocaleDateString('id-ID')}\n`;
      }
      
      detailsText += '   ' + '─'.repeat(50) + '\n';
    });
    
    return detailsText;
  };

  // Helper function to generate category statistics
  const generateCategoryStats = () => {
    const categoryStats = {};
    
    riskCategories.forEach(category => {
      const categoryRisks = risks.filter(risk => risk.category === category);
      categoryStats[category] = {
        total: categoryRisks.length,
        extreme: categoryRisks.filter(r => (r.likelihood * r.impact) >= 20).length,
        high: categoryRisks.filter(r => (r.likelihood * r.impact) >= 16 && (r.likelihood * r.impact) < 20).length,
        assessed: categoryRisks.filter(r => r.status === 'assessed').length,
        approved: categoryRisks.filter(r => r.approvals && r.approvals.some(a => a.status === 'approved')).length
      };
    });

    let statsText = '';
    riskCategories.forEach(category => {
      const stats = categoryStats[category];
      if (stats.total > 0) {
        statsText += `- ${category}: ${stats.total} risks (Extreme: ${stats.extreme}, High: ${stats.high}, Assessed: ${stats.assessed}, Approved: ${stats.approved})\n`;
      }
    });
    
    return statsText || 'Tidak ada data kategori.';
  };

  // Helper functions
  const getStatusLabel = (status) => {
    const statusInfo = riskStatuses.find(s => s.value === status);
    return statusInfo ? statusInfo.label : 'Teridentifikasi';
  };

  const getUnitName = (unitId) => {
    const unit = organizationUnits.find(u => u.id === unitId);
    return unit ? unit.name : 'Tidak ada';
  };

  // Export Menu Handlers
  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCellClick = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => 
      risk.likelihood === likelihood && risk.impact === impact
    );
    console.log(`Risks in cell L${likelihood}-I${impact}:`, cellRisks);
  };

  // Statistics
  const stats = {
    totalRisks: risks.length,
    assessedRisks: risks.filter(r => r.status === 'assessed').length,
    extremeRisks: risks.filter(r => (r.likelihood * r.impact) >= 20).length,
    highRisks: risks.filter(r => (r.likelihood * r.impact) >= 16 && (r.likelihood * r.impact) < 20).length,
    approvedRisks: risks.filter(r => r.approvals && r.approvals.some(a => a.status === 'approved')).length,
    assessmentProgress: risks.length > 0 ? (risks.filter(r => r.status === 'assessed').length / risks.length) * 100 : 0
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
                  Risk Assessment Dashboard
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Analisis dan evaluasi tingkat risiko organisasi
                </Typography>
                {/* ✅ TAMBAHKAN USER ROLE INFO */}
                <Typography variant="caption" color="primary" fontWeight="bold">
                  Role: {ROLES[currentUser?.role]?.name || 'Unknown'} | 
                  Permissions: {canAssessRisks(currentUser?.role) ? 'Can Assess' : 'View Only'}
                </Typography>
              </Box>
            </Box>
            
            {/* Export Button dengan Custom Menu */}
            <Box>
              <Button 
                variant="contained" 
                endIcon={<KeyboardArrowDown />}
                startIcon={<Download />}
                size="large"
                sx={{ borderRadius: 2, minWidth: 160 }}
                onClick={handleExportMenuOpen}
                disabled={exportLoading}
              >
                {exportLoading ? <CircularProgress size={24} /> : 'Export Report'}
              </Button>
              
              {/* Custom Export Menu untuk menghindari accessibility warning */}
              <CustomExportMenu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
                onExportPDF={exportToPDF}
                onExportCSV={exportToCSV}
                onExportText={exportToText}
                loading={exportLoading}
              />
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Assessment Progress
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.assessedRisks} / {stats.totalRisks} ({Math.round(stats.assessmentProgress)}%)
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={stats.assessmentProgress}
              sx={{ height: 8, borderRadius: 4 }}
              color={stats.assessmentProgress >= 80 ? "success" : "primary"}
            />
            
            {/* ✅ TAMBAHKAN APPROVAL PROGRESS BAR */}
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="textSecondary">
                  Approval Progress
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.approvedRisks} / {stats.assessedRisks} ({stats.assessedRisks > 0 ? Math.round((stats.approvedRisks / stats.assessedRisks) * 100) : 0}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.assessedRisks > 0 ? (stats.approvedRisks / stats.assessedRisks) * 100 : 0}
                sx={{ height: 8, borderRadius: 4 }}
                color="secondary"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column - PROFESSIONAL HEATMAP */}
        <Grid item xs={12} lg={8}>
          <ProfessionalRiskMatrix risks={risks} onCellClick={handleCellClick} />
        </Grid>

        {/* Right Column - Filters and Quick Stats */}
        <Grid item xs={12} lg={4}>
          {/* Filters Card */}
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <FilterList color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Filters & Controls
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Unit Organisasi</InputLabel>
                    <Select
                      value={selectedUnit}
                      label="Unit Organisasi"
                      onChange={(e) => setSelectedUnit(e.target.value)}
                    >
                      <MenuItem value="all">Semua Unit</MenuItem>
                      {organizationUnits.map((unit) => (
                        <MenuItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Kategori Risiko</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Kategori Risiko"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <MenuItem value="all">Semua Kategori</MenuItem>
                      {riskCategories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedStatus}
                      label="Status"
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <MenuItem value="all">Semua Status</MenuItem>
                      {riskStatuses.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* ✅ TAMBAHKAN APPROVAL STATUS FILTER */}
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status Approval</InputLabel>
                    <Select
                      value={selectedStatus}
                      label="Status Approval"
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <MenuItem value="all">Semua Status</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    size="small"
                    startIcon={<Assessment />}
                    disabled={!canAssessRisks(currentUser?.role)}
                  >
                    Bulk Assess
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    size="small"
                    startIcon={<Download />}
                    onClick={handleExportMenuOpen}
                    disabled={exportLoading}
                  >
                    Export
                  </Button>
                </Grid>
              </Grid>

              {/* ✅ TAMBAHKAN PERMISSION INFO */}
              {!canAssessRisks(currentUser?.role) && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Anda hanya dapat melihat data. Tidak memiliki izin untuk assessment.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risks List Table */}
      <Card sx={{ mt: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Risks untuk Assessment ({filteredRisks.length})
          </Typography>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary" mt={1}>
                Memuat data risiko...
              </Typography>
            </Box>
          ) : filteredRisks.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Tidak ada risiko yang sesuai dengan filter yang dipilih.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell width="25%">Risiko</TableCell>
                    <TableCell width="15%">Kategori</TableCell>
                    <TableCell width="10%" align="center">Score</TableCell>
                    <TableCell width="15%" align="center">Level</TableCell>
                    <TableCell width="15%" align="center">Status</TableCell>
                    <TableCell width="10%" align="center">Approval</TableCell>
                    <TableCell width="10%" align="center">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRisks.map((risk) => {
                    const inherentScore = risk.likelihood * risk.impact;
                    const inherentLevel = calculateRiskLevel(inherentScore);
                    const statusInfo = riskStatuses.find(s => s.value === risk.status) || riskStatuses[0];
                    const approvalStatus = risk.approvals ? 
                      risk.approvals[risk.approvals.length - 1]?.status || 'Pending' : 'Pending';
                    
                    return (
                      <TableRow 
                        key={risk.id} 
                        hover
                        sx={{ 
                          '&:last-child td, &:last-child th': { border: 0 },
                          backgroundColor: risk.status === 'assessed' ? 'success.50' : 'white'
                        }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {risk.title || risk.riskDescription}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {getUnitName(risk.unitId)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={risk.category}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" fontWeight="bold">
                            {inherentScore}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            L{risk.likelihood}×I{risk.impact}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={inherentLevel.level}
                            color={inherentLevel.color}
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={statusInfo.label}
                            color={statusInfo.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={approvalStatus}
                            color={
                              approvalStatus === 'approved' ? 'success' :
                              approvalStatus === 'rejected' ? 'error' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={risk.status === 'assessed' ? 'Edit Assessment' : 'Assess Risk'}>
                            <IconButton 
                              color={risk.status === 'assessed' ? 'primary' : 'warning'}
                              onClick={() => handleAssessmentWithPermission(risk)}
                              size="small"
                              disabled={!canAssessRisks(currentUser?.role)}
                            >
                              {risk.status === 'assessed' ? <Edit /> : <Assessment />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                            <IconButton 
                              color="info" 
                              size="small"
                              onClick={() => handleViewDetails(risk)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
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

      {/* =============================== */}
      {/* DIALOG VIEW DETAILS */}
      {/* =============================== */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              Detail Risiko
            </Typography>
            <IconButton onClick={() => setViewDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingRisk && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Informasi Dasar
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          Kode Risiko
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {viewingRisk.riskCode || 'Tidak ada kode'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          Kategori
                        </Typography>
                        <Chip 
                          label={viewingRisk.category} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">
                          Deskripsi Risiko
                        </Typography>
                        <Typography variant="body1">
                          {viewingRisk.title || viewingRisk.riskDescription}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          Unit Organisasi
                        </Typography>
                        <Typography variant="body1">
                          {getUnitName(viewingRisk.unitId)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          Status
                        </Typography>
                        <Chip 
                          label={getStatusLabel(viewingRisk.status)}
                          color={riskStatuses.find(s => s.value === viewingRisk.status)?.color || 'default'}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Risk Assessment
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Likelihood
                        </Typography>
                        <Typography variant="h6" color="warning.main">
                          L{viewingRisk.likelihood || 1}
                        </Typography>
                        <Typography variant="caption">
                          {getLikelihoodLabel(viewingRisk.likelihood)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Impact
                        </Typography>
                        <Typography variant="h6" color="error.main">
                          I{viewingRisk.impact || 1}
                        </Typography>
                        <Typography variant="caption">
                          {getImpactLabel(viewingRisk.impact)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="body2" color="textSecondary">
                            Risk Score
                          </Typography>
                          <Typography variant="h3" fontWeight="bold" color="primary">
                            {(viewingRisk.likelihood * viewingRisk.impact) || 1}
                          </Typography>
                          <Chip 
                            label={calculateRiskLevel(viewingRisk.likelihood * viewingRisk.impact).level}
                            color={calculateRiskLevel(viewingRisk.likelihood * viewingRisk.impact).color}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Residual Risk
                    </Typography>
                    {viewingRisk.residualScore ? (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Residual Likelihood
                          </Typography>
                          <Typography variant="h6" color="warning.main">
                            L{viewingRisk.residualLikelihood}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Residual Impact
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            I{viewingRisk.residualImpact}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="body2" color="textSecondary">
                              Residual Score
                            </Typography>
                            <Typography variant="h3" fontWeight="bold" color="secondary">
                              {viewingRisk.residualScore}
                            </Typography>
                            <Chip 
                              label={calculateRiskLevel(viewingRisk.residualScore).level}
                              color={calculateRiskLevel(viewingRisk.residualScore).color}
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                        Belum dilakukan assessment residual
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* ✅ TAMBAHKAN APPROVAL INFO SECTION */}
              {viewingRisk.approvals && viewingRisk.approvals.length > 0 && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Approval History
                      </Typography>
                      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {viewingRisk.approvals.map((approval, index) => (
                          <Box key={index} sx={{ mb: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" fontWeight="bold">
                                {ROLES[approval.role]?.name}
                              </Typography>
                              <Chip 
                                label={approval.status}
                                color={approval.status === 'approved' ? 'success' : 'error'}
                                size="small"
                              />
                            </Box>
                            <Typography variant="caption">
                              By: {approval.approvedBy || approval.rejectedBy}
                            </Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                              {new Date(approval.timestamp).toLocaleString('id-ID')}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {viewingRisk.assessedBy && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Assessment Info
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Dinilai Oleh
                          </Typography>
                          <Typography variant="body1">
                            {viewingRisk.assessedBy}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Tanggal Assessment
                          </Typography>
                          <Typography variant="body1">
                            {viewingRisk.assessedAt ? 
                              new Date(viewingRisk.assessedAt.seconds * 1000).toLocaleDateString('id-ID') : 
                              'Tidak tersedia'
                            }
                          </Typography>
                        </Grid>
                        {viewingRisk.controlEffectiveness && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="textSecondary">
                              Control Effectiveness
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Rating value={viewingRisk.controlEffectiveness} readOnly size="small" />
                              <Typography variant="body2">
                                ({viewingRisk.controlEffectiveness}/5)
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {viewingRisk.treatmentPriority && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="textSecondary">
                              Treatment Priority
                            </Typography>
                            <Chip 
                              label={getTreatmentPriorityLabel(viewingRisk.treatmentPriority)}
                              color={
                                viewingRisk.treatmentPriority === 'critical' ? 'error' :
                                viewingRisk.treatmentPriority === 'high' ? 'warning' :
                                viewingRisk.treatmentPriority === 'medium' ? 'info' : 'default'
                              }
                              size="small"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>
            Tutup
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setViewDialog(false);
              handleAssessmentWithPermission(viewingRisk);
            }}
            disabled={!canAssessRisks(currentUser?.role)}
          >
            {viewingRisk?.status === 'assessed' ? 'Edit Assessment' : 'Assess Risk'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================== */}
      {/* DIALOG ASSESS RISK */}
      {/* =============================== */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              {editingRisk?.status === 'assessed' ? 'Edit Assessment' : 'Assess Risk'}
            </Typography>
            <IconButton onClick={() => setOpenDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingRisk && (
            <Box sx={{ mt: 2 }}>
              {/* Risk Information */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {editingRisk.title || editingRisk.riskDescription}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Kategori: {editingRisk.category} | Unit: {getUnitName(editingRisk.unitId)}
                  </Typography>
                </CardContent>
              </Card>

              <Stepper activeStep={0} sx={{ mb: 4 }}>
                <Step>
                  <StepLabel>Inherent Risk Assessment</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Control Assessment</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Residual Risk Assessment</StepLabel>
                </Step>
              </Stepper>

              <Grid container spacing={3}>
                {/* Inherent Risk Assessment */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Inherent Risk Assessment
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Likelihood (Kemungkinan Terjadi)
                    </Typography>
                    <Select
                      value={assessmentData.likelihood}
                      onChange={(e) => setAssessmentData({
                        ...assessmentData,
                        likelihood: e.target.value,
                        residualLikelihood: assessmentData.residualLikelihood === assessmentData.likelihood ? 
                          e.target.value : assessmentData.residualLikelihood
                      })}
                    >
                      <MenuItem value={1}>1 - Remote (Sangat Jarang)</MenuItem>
                      <MenuItem value={2}>2 - Unlikely (Jarang)</MenuItem>
                      <MenuItem value={3}>3 - Possible (Mungkin)</MenuItem>
                      <MenuItem value={4}>4 - Probable (Sering)</MenuItem>
                      <MenuItem value={5}>5 - Highly Probable (Sangat Sering)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Impact (Dampak)
                    </Typography>
                    <Select
                      value={assessmentData.impact}
                      onChange={(e) => setAssessmentData({
                        ...assessmentData,
                        impact: e.target.value,
                        residualImpact: assessmentData.residualImpact === assessmentData.impact ? 
                          e.target.value : assessmentData.residualImpact
                      })}
                    >
                      <MenuItem value={1}>1 - Insignificant (Sangat Kecil)</MenuItem>
                      <MenuItem value={2}>2 - Minor (Kecil)</MenuItem>
                      <MenuItem value={3}>3 - Moderate (Sedang)</MenuItem>
                      <MenuItem value={4}>4 - Major (Besar)</MenuItem>
                      <MenuItem value={5}>5 - Catastrophic (Sangat Besar)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Inherent Risk Score Display */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ backgroundColor: 'grey.50' }}>
                    <CardContent>
                      <Box textAlign="center">
                        <Typography variant="body2" color="textSecondary">
                          Inherent Risk Score
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary">
                          {assessmentData.likelihood * assessmentData.impact}
                        </Typography>
                        <Chip 
                          label={calculateRiskLevel(assessmentData.likelihood * assessmentData.impact).level}
                          color={calculateRiskLevel(assessmentData.likelihood * assessmentData.impact).color}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Control Effectiveness */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Control Effectiveness
                  </Typography>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Efektivitas Kontrol yang Ada
                    </Typography>
                    <Slider
                      value={assessmentData.controlEffectiveness}
                      onChange={(e, newValue) => setAssessmentData({
                        ...assessmentData,
                        controlEffectiveness: newValue
                      })}
                      min={1}
                      max={5}
                      marks={[
                        { value: 1, label: '1 - Very Weak' },
                        { value: 2, label: '2 - Weak' },
                        { value: 3, label: '3 - Moderate' },
                        { value: 4, label: '4 - Strong' },
                        { value: 5, label: '5 - Very Strong' }
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </FormControl>
                </Grid>

                {/* Residual Risk Assessment */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Residual Risk Assessment
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Residual Likelihood
                    </Typography>
                    <Select
                      value={assessmentData.residualLikelihood}
                      onChange={(e) => setAssessmentData({
                        ...assessmentData,
                        residualLikelihood: e.target.value
                      })}
                    >
                      <MenuItem value={1}>1 - Remote (Sangat Jarang)</MenuItem>
                      <MenuItem value={2}>2 - Unlikely (Jarang)</MenuItem>
                      <MenuItem value={3}>3 - Possible (Mungkin)</MenuItem>
                      <MenuItem value={4}>4 - Probable (Sering)</MenuItem>
                      <MenuItem value={5}>5 - Highly Probable (Sangat Sering)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Residual Impact
                    </Typography>
                    <Select
                      value={assessmentData.residualImpact}
                      onChange={(e) => setAssessmentData({
                        ...assessmentData,
                        residualImpact: e.target.value
                      })}
                    >
                      <MenuItem value={1}>1 - Insignificant (Sangat Kecil)</MenuItem>
                      <MenuItem value={2}>2 - Minor (Kecil)</MenuItem>
                      <MenuItem value={3}>3 - Moderate (Sedang)</MenuItem>
                      <MenuItem value={4}>4 - Major (Besar)</MenuItem>
                      <MenuItem value={5}>5 - Catastrophic (Sangat Besar)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Residual Risk Score Display */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ backgroundColor: 'grey.50' }}>
                    <CardContent>
                      <Box textAlign="center">
                        <Typography variant="body2" color="textSecondary">
                          Residual Risk Score
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="secondary">
                          {assessmentData.residualLikelihood * assessmentData.residualImpact}
                        </Typography>
                        <Chip 
                          label={calculateRiskLevel(assessmentData.residualLikelihood * assessmentData.residualImpact).level}
                          color={calculateRiskLevel(assessmentData.residualLikelihood * assessmentData.residualImpact).color}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Treatment Priority */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Treatment Priority
                    </Typography>
                    <Select
                      value={assessmentData.treatmentPriority}
                      onChange={(e) => setAssessmentData({
                        ...assessmentData,
                        treatmentPriority: e.target.value
                      })}
                    >
                      <MenuItem value="low">Low (Rendah)</MenuItem>
                      <MenuItem value="medium">Medium (Sedang)</MenuItem>
                      <MenuItem value="high">High (Tinggi)</MenuItem>
                      <MenuItem value="critical">Critical (Kritis)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* ✅ TAMBAHKAN APPROVAL WORKFLOW SECTION */}
                {editingRisk?.status === 'assessed' && (
                  <Grid item xs={12}>
                    <ApprovalWorkflow
                      riskData={{
                        id: editingRisk.id,
                        level: calculateRiskLevel(
                          assessmentData.likelihood * assessmentData.impact
                        ).level.toUpperCase(),
                        title: editingRisk.title || editingRisk.riskDescription
                      }}
                      currentApprovals={editingRisk.approvals || []}
                      onApprove={handleRiskApproval}
                      onReject={handleRiskApproval}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveAssessment}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {loading ? 'Menyimpan...' : 'Simpan Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default RiskAssessment;