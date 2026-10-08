
// File: src/pages/RiskAssessment.js
import React, { useState, useEffect } from 'react';
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
  Popover,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Slider,
  Rating,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup,
  MenuItem
} from '@mui/material';
import {
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Filter,
  Download,
  Edit2,
  Eye,
  BarChart3,
  ChevronDown,
  X,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Settings,
  Repeat,
  Trash2,
  Plus,
  Activity,
  LineChart,
  LayoutGrid
} from 'lucide-react';
import { api } from '../services/api';
import { muatRisiko, usePeriode } from '../services/risiko';

import { useNavigate } from 'react-router-dom';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';
import HeatMapFilters from '../components/HeatMapFilters';
import RiskCellDetailModal from '../components/RiskCellDetailModal';
import { exportHeatmapAsPNG, exportHeatmapAsPDF, exportHeatmapAsCSV, exportCellDetailsAsText } from '../utils/heatmapExport';
// import { fetchRisks } from '../services/riskService'; // Dihapus pemanggilan top-level await untuk menghindari gangguan build

// Koordinat (kemungkinan, dampak) risiko di matriks. Belum dinilai = di luar matriks.
const koordinat = (risk, viewMode) => viewMode === 'inherent'
  ? [Number(risk.initialProbability) || 0, Number(risk.initialImpact) || 0]
  : [Number(risk.residualProbability) || 0, Number(risk.residualImpact) || 0];

// =======================================================================
// DEFAULT CONSTANTS (JIKA IMPORT GAGAL)
// =======================================================================
const DEFAULT_RISK_LEVELS = [
  { label: 'Rendah', min: 1, max: 5, color: '#4caf50' },
  { label: 'Sedang', min: 6, max: 12, color: '#ff9800' },
  { label: 'Tinggi', min: 13, max: 20, color: '#f44336' },
  { label: 'Ekstrim', min: 21, max: 25, color: '#7b1fa2' }
];

const DEFAULT_COORDINATE_MATRIX = [
  [1, 3, 5, 8, 20],
  [2, 7, 11, 13, 21],
  [4, 10, 14, 17, 22],
  [6, 12, 16, 19, 24],
  [9, 15, 18, 23, 25]
];

// Perbaikan logika range check: gunakan matrix untuk 1..5, jika di luar gunakan perkalian
const getCoordinateScoreDefault = (likelihood, impact) => {
  const outOfRange =
    likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5;
  if (outOfRange) return likelihood * impact;
  return DEFAULT_COORDINATE_MATRIX[likelihood - 1][impact - 1];
};

// Gunakan default constants langsung karena Configuration.js sudah dihapus
const RISK_LEVELS = DEFAULT_RISK_LEVELS;
const COORDINATE_MATRIX = DEFAULT_COORDINATE_MATRIX;
const getCoordinateScore = getCoordinateScoreDefault;

// =======================================================================
// AVERAGE RISK SCORE TREND (RECOMMENDED)
// =======================================================================
const AverageRiskScoreTrend = ({ risks }) => {
  const inherentScores = risks
    .filter(r => typeof r.inherentScore === 'number')
    .map(r => r.inherentScore);
  const residualScores = risks
    .filter(r => typeof r.residualScore === 'number')
    .map(r => r.residualScore);

  const avgInherent =
    inherentScores.length > 0
      ? inherentScores.reduce((a, b) => a + b, 0) / inherentScores.length
      : 0;
  const avgResidual =
    residualScores.length > 0
      ? residualScores.reduce((a, b) => a + b, 0) / residualScores.length
      : 0;

  const reduction =
    avgInherent > 0 ? ((avgInherent - avgResidual) / avgInherent) * 100 : 0;

  const maxY = Math.max(avgInherent, avgResidual, 1);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* HEADER */}
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <LineChart sx={{ color: 'primary.main' }} size={24} />
          <Typography variant="h6" fontWeight="bold">
            Average Risk Score Trend
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" mb={3}>
          Perbandingan rata-rata skor risiko sebelum dan sesudah treatment
        </Typography>

        {/* CHART */}
        <Box sx={{ position: 'relative', height: 220 }}>
          {/* Y Axis */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 30,
              width: 40,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              pr: 1
            }}
          >
            {[0, Math.round(maxY / 2), Math.round(maxY)].map((v, i) => (
              <Typography key={i} variant="caption" color="textSecondary">
                {v}
              </Typography>
            ))}
          </Box>

          {/* LINE */}
          <Box
            sx={{
              position: 'absolute',
              left: 50,
              right: 20,
              top: 20,
              bottom: 40
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Line */}
              <polyline
                fill="none"
                stroke="#1976d2"
                strokeWidth="2"
                points={`10,${100 - (avgInherent / maxY) * 80} 90,${100 - (avgResidual / maxY) * 80}`}
              />
              {/* Inherent Point */}
              <circle cx="10" cy={100 - (avgInherent / maxY) * 80} r="3" fill="#1976d2" />
              {/* Residual Point */}
              <circle cx="90" cy={100 - (avgResidual / maxY) * 80} r="3" fill="#2e7d32" />
            </svg>
          </Box>

          {/* X Axis */}
          <Box
            sx={{
              position: 'absolute',
              left: 50,
              right: 20,
              bottom: 0,
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="caption">Inherent</Typography>
            <Typography variant="caption">Residual</Typography>
          </Box>
        </Box>

        {/* SUMMARY */}
        <Grid container spacing={2} mt={2}>
          <Grid item xs={4}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Avg Inherent
              </Typography>
              <Typography variant="h6">{avgInherent.toFixed(1)}</Typography>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Avg Residual
              </Typography>
              <Typography variant="h6" color="success.main">
                {avgResidual.toFixed(1)}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Risk Reduction
              </Typography>
              <Typography
                variant="h6"
                color={reduction > 0 ? 'success.main' : 'error.main'}
              >
                {reduction.toFixed(0)}%
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* NARRATIVE */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Rata-rata skor risiko turun dari <strong>{avgInherent.toFixed(1)}</strong> menjadi{' '}
            <strong>{avgResidual.toFixed(1)}</strong>, atau berkurang sekitar{' '}
            <strong>{reduction.toFixed(0)}%</strong> setelah treatment dilakukan.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

// =======================================================================
// PROFESSIONAL RISK MATRIX
// =======================================================================
const ProfessionalRiskMatrix = ({
  risks,
  onCellClick,
  assessmentMethod,
  riskLevels,
  onHeatmapClick,
  viewMode,
  id
}) => {
  const navigate = useNavigate();
  const matrix = Array(5).fill().map(() => Array(5).fill(0));

  risks.forEach(risk => {
    const [likelihood, impact] = koordinat(risk, viewMode);
    if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
      matrix[likelihood - 1][impact - 1]++;
    }
  });

  const getScore = (likelihood, impact) => {
    return assessmentMethod === 'coordinate'
      ? getCoordinateScore(likelihood, impact)
      : likelihood * impact;
  };

  const effectiveRiskLevels =
    Array.isArray(riskLevels) && riskLevels.length ? riskLevels : RISK_LEVELS;

  const getCellColor = (likelihood, impact) => {
    const score = getScore(likelihood, impact);
    const riskLevel = effectiveRiskLevels.find(level => score >= level.min && score <= level.max);
    if (riskLevel) return riskLevel.color;
    // default fallback
    if (score <= 5) return '#4caf50';
    if (score <= 12) return '#ff9800';
    if (score <= 20) return '#f44336';
    return '#7b1fa2';
  };

  const getRiskLevel = (likelihood, impact) => {
    const score = getScore(likelihood, impact);
    const riskLevel = effectiveRiskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.label : 'Unknown';
  };

  const handleCellClickLocal = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => {
      const [L, I] = koordinat(risk, viewMode);
      return L === likelihood && I === impact;
    });

    if (cellRisks.length > 0 && onHeatmapClick) {
      const score = getScore(likelihood, impact);
      const rl = effectiveRiskLevels.find(level => score >= level.min && score <= level.max);
      if (rl) {
        onHeatmapClick(rl.label, likelihood, impact, viewMode);
      }
    }
    onCellClick?.(likelihood, impact);
  };

  const impactLabels = [
    { level: 1, label: 'Tdk Signifikan' },
    { level: 2, label: 'Minor' },
    { level: 3, label: 'Moderat' },
    { level: 4, label: 'Signifikan' },
    { level: 5, label: 'Sangat Signifikan' }
  ];

  const likelihoodLabels = [
    { level: 5, label: 'Hampir Pasti Terjadi' },
    { level: 4, label: 'Sering Terjadi' },
    { level: 3, label: 'Kadang Terjadi' },
    { level: 2, label: 'Jarang Terjadi' },
    { level: 1, label: 'Hampir Tidak Terjadi' }
  ];

  return (
    <Card sx={{ height: '100%', boxShadow: 3 }} id={id || 'heatmap-container'}>
      <CardContent>
        {/* HEADER */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <BarChart3 sx={{ fontSize: 32, color: 'primary.main' }} size={32} />
            <Box>
              <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {viewMode === 'inherent' ? 'Inherent Risk Matrix' : 'Residual Risk Matrix'}
                </Typography>
                <Chip
                  label={assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    backgroundColor: 'transparent'
                  }}
                />
                <Chip
                  label={viewMode === 'inherent' ? 'Inherent' : 'Residual'}
                  size="small"
                  sx={{
                    backgroundColor: viewMode === 'inherent' ? 'secondary.main' : 'success.main',
                    '& .MuiChip-label': { color: 'white' }
                  }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {viewMode === 'inherent'
                  ? 'Distribusi risiko inherent sebelum treatment'
                  : 'Distribusi risiko residual setelah treatment'}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Klik sel matriks untuk melihat risiko terkait">
            <Typography variant="caption" color="textSecondary">
              Tips: klik sel untuk detail
            </Typography>
          </Tooltip>
        </Box>

        {/* TABLE */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={2}
                  align="center"
                  sx={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }}
                >
                  DAMPAK (IMPACT) →
                </TableCell>
                {impactLabels.map(impact => (
                  <TableCell
                    key={impact.level}
                    align="center"
                    sx={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }}
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
              {likelihoodLabels.map(likelihood => (
                <TableRow key={likelihood.level}>
                  <TableCell
                    align="center"
                    sx={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }}
                  >
                    <Typography variant="subtitle2">L{likelihood.level}</Typography>
                    <Typography variant="caption">{likelihood.label}</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ backgroundColor: 'grey.100' }}>
                    {likelihood.level}
                  </TableCell>
                  {impactLabels.map((impact, index) => {
                    const count = matrix[likelihood.level - 1][index];
                    const cellColor = getCellColor(likelihood.level, impact.level);
                    const score = getScore(likelihood.level, impact.level);
                    const riskLevelName = getRiskLevel(likelihood.level, impact.level);
                    return (
                      <Tooltip
                        key={impact.level}
                        title={
                          <Box>
                            <Typography variant="subtitle2">
                              {impact.label} Impact, {likelihood.label}
                            </Typography>
                            <Typography variant="caption">
                              {count} risks • Score: {score} • Level: {riskLevelName}
                            </Typography>
                          </Box>
                        }
                      >
                        <TableCell
                          align="center"
                          onClick={() => handleCellClickLocal(likelihood.level, impact.level)}
                          sx={{
                            backgroundColor: cellColor,
                            color: '#fff',
                            cursor: count > 0 ? 'pointer' : 'default',
                            border: '1px solid white',
                            '&:hover': {
                              opacity: 0.9,
                              transform: count > 0 ? 'scale(1.05)' : 'none',
                              transition: 'all 0.2s'
                            }
                          }}
                        >
                          <Typography variant="h6">{count}</Typography>
                          <Typography variant="caption" display="block">
                            {riskLevelName}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Score: {score}
                          </Typography>
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* LEGEND */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Risk Level Legend:
          </Typography>
          <Grid container spacing={1}>
            {(effectiveRiskLevels || RISK_LEVELS).map((level, idx) => (
              <Grid item xs={6} sm={3} key={idx}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      backgroundColor: level.color,
                      borderRadius: 1
                    }}
                  />
                  <Typography variant="caption">
                    {level.label} ({level.min}-{level.max})
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

// =======================================================================
// CONFIGURATION DIALOG
// =======================================================================
const RiskAssessmentConfigDialog = ({ open, onClose, config }) => {
  if (!config) return null;
  const effectiveRiskLevels =
    Array.isArray(config.riskLevels) && config.riskLevels.length ? config.riskLevels : RISK_LEVELS;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings size={20} />
          <Typography variant="h6" fontWeight="bold">
            Konfigurasi Risk Assessment Saat Ini
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" paragraph color="textSecondary">
          Konfigurasi penentuan level risiko sudah dikelola secara terpusat di
          <strong> configuration.js</strong>. Untuk mengubah konfigurasi, silakan edit file tersebut.
        </Typography>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ChevronDown size={18} />}>
            <Typography variant="h6">📊 Metode Penilaian Risiko</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Assessment Method */}
              <Grid item xs={12} md={6}>
                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <ShieldCheck size={40} color="#1976d2" />
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {config.assessmentMethod === 'coordinate'
                            ? 'Metode Koordinat (Tabel)'
                            : 'Metode Perkalian (Tradisional)'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          {config.assessmentMethod === 'coordinate'
                            ? 'Menggunakan tabel koordinat 5x5'
                            : 'Perkalian sederhana Likelihood × Impact'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Risk Levels */}
              <Grid item xs={12} md={6}>
                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <TrendingUp size={40} color="#1976d2" />
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          Tingkat Risiko
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {(effectiveRiskLevels || []).length} level risiko
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {(effectiveRiskLevels || RISK_LEVELS).map((level, index) => (
                        <Box key={index} display="flex" alignItems="center" gap={1} mb={1}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: level.color,
                              borderRadius: 1,
                              border: '1px solid #ccc'
                            }}
                          />
                          <Typography variant="caption" sx={{ flex: 1 }}>
                            {level.label}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ({level.min}-{level.max})
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Informasi:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            • Konfigurasi berada di <code>src/pages/configuration.js</code>
          </Typography>
          <Typography variant="caption" display="block">
            • Perubahan mempengaruhi seluruh aplikasi
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =======================================================================
// EXPORT MENU
// =======================================================================
const CustomExportMenu = ({
  anchorEl,
  open,
  onClose,
  onExportPNG,
  onExportPDF,
  onExportCSV,
  onExportText,
  loading
}) => (
  <Popover
    open={open}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <Box sx={{ p: 2, minWidth: 200 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Export Options
      </Typography>
      <List dense>
        <ListItem button disabled={loading} onClick={() => { onExportPNG(); onClose(); }}>
          <ListItemText primary="Export as PNG" secondary="Gambar heatmap" />
        </ListItem>
        <ListItem button disabled={loading} onClick={() => { onExportPDF(); onClose(); }}>
          <ListItemText primary="Export as PDF" secondary="Laporan lengkap" />
        </ListItem>
        <ListItem button disabled={loading} onClick={() => { onExportCSV(); onClose(); }}>
          <ListItemText primary="Export as CSV" secondary="Data spreadsheet" />
        </ListItem>
        <ListItem button disabled={loading} onClick={() => { onExportText(); onClose(); }}>
          <ListItemText primary="Export as Text" secondary="Laporan teks" />
        </ListItem>
      </List>
    </Box>
  </Popover>
);

// =======================================================================
// MAIN COMPONENT
// =======================================================================
const RiskAssessment = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();

  const navigate = useNavigate();
  const { assessmentConfig, calculateScore } = useAssessmentConfig();

  const defaultConfig = {
    assessmentMethod: 'coordinate',
    riskLevels: RISK_LEVELS
  };

  const config = assessmentConfig || defaultConfig;

  const safeCalculateScore = calculateScore || ((likelihood, impact) => {
    return config.assessmentMethod === 'coordinate'
      ? getCoordinateScore(likelihood, impact)
      : likelihood * impact;
  });

  // ===================================================================
  // STATES
  // ===================================================================
  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [heatmapFilters, setHeatmapFilters] = useState({
    department: 'all',
    category: 'all',
    timeRange: 'all',
    riskLevel: 'all',
    search: ''
  });
  const [selectedCell, setSelectedCell] = useState(null);
  const [riskTypes, setRiskTypes] = useState([]);
  const [cellDetailOpen, setCellDetailOpen] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [viewMode, setViewMode] = useState('inherent');

  // ===================================================================
  // EXPORT HANDLERS
  // ===================================================================
  const prepareHeatmapData = () => {
    const heatmapData = [];
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      for (let impact = 1; impact <= 5; impact++) {
        const cellRisks = filteredRisks.filter(risk => {
          const [L, I] = koordinat(risk, viewMode);
          return L === likelihood && I === impact;
        });

        const score = safeCalculateScore(likelihood, impact);
        const rl = (config.riskLevels || RISK_LEVELS).find(
          level => score >= level.min && score <= level.max
        );
        const riskLevel = rl?.label ?? 'Unknown';

        heatmapData.push({
          likelihood,
          impact,
          riskCount: cellRisks.length,
          score,
          riskLevel,
          cellRisks
        });
      }
    }
    return heatmapData;
  };

  const handleExportPNG = async () => {
    setExportLoading(true);
    try {
      await exportHeatmapAsPNG(
        'heatmap-container',
        `risk-matrix-${viewMode}-${new Date().toISOString().slice(0, 10)}.png`
      );
      showSnackbar('Export PNG berhasil!', 'success');
    } catch (error) {
      showSnackbar(`Gagal export PNG: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const heatmapData = prepareHeatmapData();
      await exportHeatmapAsPDF(
        heatmapData,
        heatmapFilters,
        viewMode,
        `risk-report-${viewMode}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      showSnackbar('Export PDF berhasil!', 'success');
    } catch (error) {
      showSnackbar(`Gagal export PDF: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const heatmapData = prepareHeatmapData();
      exportHeatmapAsCSV(
        heatmapData,
        `risk-data-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      showSnackbar('Export CSV berhasil!', 'success');
    } catch (error) {
      showSnackbar(`Gagal export CSV: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportText = async () => {
    setExportLoading(true);
    try {
      if (selectedCell) {
        await exportCellDetailsAsText(
          selectedCell,
          `risk-cell-details-${selectedCell.likelihood}-${selectedCell.impact}-${new Date().toISOString().slice(0, 10)}.txt`
        );
        showSnackbar('Export Text berhasil!', 'success');
      } else {
        const summaryText = `
Risk Assessment Summary Report
===============================
Date: ${new Date().toLocaleString()}
View Mode: ${viewMode}
Total Risks: ${filteredRisks.length}
Assessment Method: ${config.assessmentMethod}
Filter: ${JSON.stringify(heatmapFilters, null, 2)}
`;
        const blob = new Blob([summaryText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        try {
          link.href = url;
          link.download = `risk-summary-${viewMode}-${new Date().toISOString().slice(0, 10)}.txt`;
          link.click();
          showSnackbar('Export Text berhasil!', 'success');
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      showSnackbar(`Gagal export Text: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMenuOpen = (e) => setExportMenuAnchor(e.currentTarget);
  const handleExportMenuClose = () => setExportMenuAnchor(null);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  // Helpers to get names from IDs
  const getRiskTypeName = (id) => riskTypes.find((r) => r.id === id)?.name || '-';
  const getDeptName = (id) => organizationUnits.find((u) => u.id === id)?.name || '-';

  // Handle cell click to show details
  const handleCellClick = (likelihood, impact) => {
    const cellRisks = filteredRisks.filter(risk => {
      const [L, I] = koordinat(risk, viewMode);
      return L === likelihood && I === impact;
    });
    if (cellRisks.length === 0) return;

    const score = safeCalculateScore(likelihood, impact);
    const rl = (config.riskLevels || RISK_LEVELS).find(
      level => score >= level.min && score <= level.max
    );
    const riskLevel = rl?.label ?? 'Unknown';

    // Resolve IDs to names
    const risksWithResolvedTypes = cellRisks.map(risk => ({
      ...risk,
      riskTypeName: getRiskTypeName(risk.riskType),
      departmentName: getDeptName(risk.department)
    }));

    setSelectedCell({
      likelihood,
      impact,
      risks: risksWithResolvedTypes,
      score,
      riskLevel
    });
    setCellDetailOpen(true);
  };

  const loadData = async () => {
    if (!periodeId) return;
    try {
      setLoading(true);
      const [risksList, unit, kategori] = await Promise.all([muatRisiko(periodeId), api.get('/unit'), api.get('/kategori-risiko')]);
      setRisks(risksList);
      setOrganizationUnits(unit.map((u) => ({ id: u.id, name: u.nama })));
      setRiskTypes(kategori.map((k) => ({ id: k.id, name: k.nama })));
    } catch (err) {
      showSnackbar('Error memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [periodeId]);

  // Satu jalur filter: dari HeatMapFilters.
  useEffect(() => {
    const f = heatmapFilters;
    const q = (f.search || '').toLowerCase();
    const batas = { today: 1, week: 7, month: 30, quarter: 90, year: 365 }[f.timeRange];
    setFilteredRisks(risks.filter((r) =>
      (f.department === 'all' || r.department === f.department) &&
      (f.category === 'all' || r.riskType === f.category) &&
      (f.riskLevel === 'all' || (viewMode === 'inherent' ? r.inherentLevel : r.residualLevel) === f.riskLevel) &&
      (!q || `${r.riskCode} ${r.riskDescription}`.toLowerCase().includes(q)) &&
      (!batas || Date.now() - new Date(r.createdAt) <= batas * 86400000)
    ));
  }, [heatmapFilters, risks, viewMode]);

  const stats = {
    totalRisks: risks.length,
    assessedRisks: risks.filter(r => typeof r.inherentScore === 'number').length,
    hasResidualData: risks.filter(r => typeof r.residualScore === 'number').length,
    assessmentProgress:
      risks.length === 0
        ? 0
        : (risks.filter(r => typeof r.inherentScore === 'number').length / risks.length) * 100
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* HEADER */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={2}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'primary.main',
                  borderRadius: 2,
                  color: 'white'
                }}
              >
                <ShieldCheck size={40} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Risk Assessment Dashboard
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Metode: {config.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}{' '}
                  • Total Risks: {stats.totalRisks}
                </Typography>
                <Box mt={1} display="flex" gap={2} alignItems="center">
                  <TextField
                    select
                    size="small"
                    label="Periode"
                    value={periodeId || ''}
                    onChange={(e) => setPeriodeId(e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    {daftarPeriode.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>
                    ))}
                  </TextField>
                  <ButtonGroup size="small">
                    <Button
                      variant={viewMode === 'inherent' ? 'contained' : 'outlined'}
                      onClick={() => setViewMode('inherent')}
                    >
                      Inherent
                    </Button>
                    <Button
                      variant={viewMode === 'residual' ? 'contained' : 'outlined'}
                      onClick={() => setViewMode('residual')}
                      disabled={stats.hasResidualData === 0}
                    >
                      Residual
                    </Button>
                  </ButtonGroup>
                </Box>
              </Box>
            </Box>

            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Settings size={20} />}
                onClick={() => setConfigDialog(true)}
              >
                Konfigurasi
              </Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                endIcon={<ChevronDown size={20} />}
                onClick={handleExportMenuOpen}
                disabled={exportLoading}
              >
                {exportLoading ? 'Exporting...' : 'Export'}
              </Button>
              <CustomExportMenu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
                onExportPNG={handleExportPNG}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onExportText={handleExportText}
                loading={exportLoading}
              />
            </Box>
          </Box>

          {/* Progress */}
          <Box mt={2}>
            <Typography variant="caption">Assessment Progress</Typography>
            <LinearProgress
              value={stats.assessmentProgress}
              variant="determinate"
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* FILTER BAR */}
      <HeatMapFilters
        filters={heatmapFilters}
        onFilterChange={setHeatmapFilters}
        organizationUnits={organizationUnits}
        categories={riskTypes}
        levels={config.riskLevels || []}
        onExport={handleExportPNG}
        exportLoading={exportLoading}
      />

      {/* MAIN LAYOUT - HEATMAP DI ATAS */}
      <Grid container spacing={3}>
        {/* HEATMAP - FULL WIDTH */}
        <Grid item xs={12}>
          <ProfessionalRiskMatrix
            id="heatmap-container"
            risks={filteredRisks}
            onCellClick={handleCellClick}
            assessmentMethod={config.assessmentMethod}
            riskLevels={config.riskLevels}
            // onHeatmapClick={handleHeatmapClick} // Disabled to prioritize Popup
            viewMode={viewMode}
          />
        </Grid>

        {/* LINE CHART COMPARISON */}
        <Grid item xs={12}>
          <AverageRiskScoreTrend risks={filteredRisks} />
        </Grid>

        {/* RIGHT SIDEBAR */}
        <Grid item xs={12} lg={4}>
          {/* Configuration Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">Konfigurasi Saat Ini</Typography>
              <Typography variant="caption" color="textSecondary">Metode:</Typography>
              <Typography
                variant="body2"
                sx={{
                  display: 'inline-block',
                  ml: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText'
                }}
              >
                {config.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="textSecondary">View Mode:</Typography>
              <Typography
                variant="body2"
                sx={{
                  display: 'inline-block',
                  ml: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: viewMode === 'inherent' ? 'primary.main' : 'success.main',
                  color: 'white'
                }}
              >
                {viewMode === 'inherent' ? 'Inherent' : 'Residual'}
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption">Level Risiko:</Typography>
              {(config.riskLevels || RISK_LEVELS).map((level, idx) => (
                <Box key={idx} display="flex" alignItems="center" gap={1} mt={1}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: level.color }} />
                  <Typography variant="caption">
                    {level.label} ({level.min}-{level.max})
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* DATA SUMMARY */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">Data Summary</Typography>
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Total Risks:</Typography>
                <Typography variant="body2" fontWeight="bold">{stats.totalRisks}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Assessed:</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {stats.assessedRisks}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Residual:</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {stats.hasResidualData}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Progress:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(stats.assessmentProgress)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS */}
          <Card>
            <CardContent>
              <Typography variant="h6">Quick Actions</Typography>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ShieldCheck size={20} />}
                sx={{ mt: 1 }}
                onClick={() => navigate('/risk-register')}
              >
                Buka Risk Register
              </Button>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => setViewMode(viewMode === 'inherent' ? 'residual' : 'inherent')}
              >
                Switch View Mode
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* MODALS */}
      <RiskAssessmentConfigDialog
        open={configDialog}
        onClose={() => setConfigDialog(false)}
        config={config}
      />

      {selectedCell && (
        <RiskCellDetailModal
          open={cellDetailOpen}
          onClose={() => { setCellDetailOpen(false); setSelectedCell(null); }}
          cellData={selectedCell}
          viewMode={viewMode}
          assessmentMethod={config.assessmentMethod}
          riskLevels={config.riskLevels}
          onExport={handleExportText}
        />
      )}

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={handleCloseSnackbar} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RiskAssessment;