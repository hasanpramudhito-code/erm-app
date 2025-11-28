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
  Rating,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
  Cancel,
  ExpandMore,
  Settings,
  Link
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { hasPermission, canAssessRisks, ROLES } from '../config/roles';
import { useNavigate } from 'react-router-dom';

// Konfigurasi default risk level ranges berdasarkan tabel koordinat
const DEFAULT_RISK_LEVELS = [
  { min: 1, max: 3, label: 'Sangat Rendah', color: '#4caf50' },
  { min: 4, max: 6, label: 'Rendah', color: '#81c784' },
  { min: 7, max: 10, label: 'Sedang', color: '#ffeb3b' },
  { min: 11, max: 15, label: 'Tinggi', color: '#f57c00' },
  { min: 16, max: 20, label: 'Sangat Tinggi', color: '#d32f2f' },
  { min: 21, max: 25, label: 'Ekstrim', color: '#7b1fa2' }
];

// MATRIKS KOORDINAT BERDASARKAN TABEL YANG DIBERIKAN
const COORDINATE_MATRIX = [
  // [Likelihood, Impact] -> Score
  // Likelihood: 1-5 (1: Hampir Tidak Terjadi, 5: Hampir Pasti Terjadi)
  // Impact: 1-5 (1: Tidak Signifikan, 5: Sangat Signifikan)
  [1, 1, 1],   // L1-I1
  [1, 2, 3],   // L1-I2
  [1, 3, 5],   // L1-I3
  [1, 4, 8],   // L1-I4
  [1, 5, 20],  // L1-I5
  
  [2, 1, 2],   // L2-I1
  [2, 2, 7],   // L2-I2
  [2, 3, 11],  // L2-I3
  [2, 4, 13],  // L2-I4
  [2, 5, 21],  // L2-I5
  
  [3, 1, 4],   // L3-I1
  [3, 2, 10],  // L3-I2
  [3, 3, 14],  // L3-I3
  [3, 4, 17],  // L3-I4
  [3, 5, 22],  // L3-I5
  
  [4, 1, 6],   // L4-I1
  [4, 2, 12],  // L4-I2
  [4, 3, 16],  // L4-I3
  [4, 4, 19],  // L4-I4
  [4, 5, 24],  // L4-I5
  
  [5, 1, 9],   // L5-I1
  [5, 2, 15],  // L5-I2
  [5, 3, 18],  // L5-I3
  [5, 4, 23],  // L5-I4
  [5, 5, 25]   // L5-I5
];

// Fungsi untuk mendapatkan score berdasarkan koordinat
const getCoordinateScore = (likelihood, impact) => {
  const entry = COORDINATE_MATRIX.find(
    ([l, i]) => l === likelihood && i === impact
  );
  return entry ? entry[2] : likelihood * impact; // Fallback ke perkalian jika tidak ditemukan
};

// Professional Heatmap Component dengan pilihan metode
const ProfessionalRiskMatrix = ({ 
  risks, 
  onCellClick, 
  assessmentMethod,
  riskLevels,
  onHeatmapClick 
}) => {
  const navigate = useNavigate();
  
  // Initialize 5x5 matrix - [likelihood][impact]
  const matrix = Array(5).fill().map(() => Array(5).fill(0));
  
  // Count risks in each cell
  risks.forEach(risk => {
    const likelihood = risk.likelihood || 1;
    const impact = risk.impact || 1;
    if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
      matrix[likelihood - 1][impact - 1]++;
    }
  });

  // Get color based on risk level - DIPERBAIKI: menggunakan riskLevels yang dikustomisasi
  const getCellColor = (likelihood, impact) => {
    let score;
    
    if (assessmentMethod === 'coordinate') {
      // Risk level berdasarkan matriks koordinat
      score = getCoordinateScore(likelihood, impact);
    } else {
      // Risk level berdasarkan perkalian
      score = likelihood * impact;
    }
    
    const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.color : '#cccccc';
  };

  // Get risk level text - DIPERBAIKI: menggunakan riskLevels yang dikustomisasi
  const getRiskLevel = (likelihood, impact) => {
    let score;
    
    if (assessmentMethod === 'coordinate') {
      // Risk level berdasarkan matriks koordinat
      score = getCoordinateScore(likelihood, impact);
    } else {
      // Risk level berdasarkan perkalian
      score = likelihood * impact;
    }
    
    const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.label : 'Unknown';
  };

  // Get score untuk display - DIPERBAIKI
  const getScore = (likelihood, impact) => {
    if (assessmentMethod === 'coordinate') {
      return getCoordinateScore(likelihood, impact);
    } else {
      return likelihood * impact;
    }
  };

  // Handle cell click dengan navigasi ke risk register
  const handleCellClick = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => 
      risk.likelihood === likelihood && risk.impact === impact
    );
    
    if (cellRisks.length > 0 && onHeatmapClick) {
      const score = getScore(likelihood, impact);
      const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
      
      if (riskLevel) {
        onHeatmapClick(riskLevel.label, likelihood, impact);
      }
    }
    
    onCellClick?.(likelihood, impact);
  };

  // Impact labels (X-Axis - Horizontal) - dari kiri ke kanan - DIPERBAIKI
  const impactLabels = [
    { level: 1, label: 'Tdk Signifikan', description: 'Dampak tidak signifikan' },
    { level: 2, label: 'Minor', description: 'Dampak minor' },
    { level: 3, label: 'Moderat', description: 'Dampak moderat' },
    { level: 4, label: 'Signifikan', description: 'Dampak signifikan' },
    { level: 5, label: 'Sangat Signifikan', description: 'Dampak sangat signifikan' }
  ];

  // Likelihood labels (Y-Axis - Vertical) - dari ATAS ke BAWAH (5→1) - DIPERBAIKI
  const likelihoodLabels = [
    { level: 5, label: 'Hampir Pasti Terjadi', description: 'Hampir pasti terjadi' },
    { level: 4, label: 'Sering Terjadi', description: 'Sering terjadi' },
    { level: 3, label: 'Kadang Terjadi', description: 'Kadang terjadi' },
    { level: 2, label: 'Jarang Terjadi', description: 'Jarang terjadi' },
    { level: 1, label: 'Hampir Tidak Terjadi', description: 'Hampir tidak terjadi' }
  ];

  return (
    <Card sx={{ height: '100%', boxShadow: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <BarChart sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" color="primary">
                Risk Matrix Heatmap 
                <Chip 
                  label={assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {assessmentMethod === 'coordinate' 
                  ? 'Distribusi risiko berdasarkan matriks koordinat'
                  : 'Distribusi risiko berdasarkan perkalian likelihood × impact'
                }
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Klik sel untuk lihat risiko terkait">
            <Link color="action" />
          </Tooltip>
        </Box>

        {/* Heatmap Table */}
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
                  {/* Likelihood Label */}
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

                  {/* Heatmap Cells */}
                  {impactLabels.map((impact, impactIndex) => {
                    const count = matrix[likelihood.level - 1][impactIndex];
                    const riskLevel = getRiskLevel(likelihood.level, impact.level);
                    const cellColor = getCellColor(likelihood.level, impact.level);
                    const score = getScore(likelihood.level, impact.level);
                    
                    return (
                      <Tooltip
                        key={`${likelihood.level}-${impact.level}`}
                        title={
                          <Box>
                            <Typography variant="subtitle2">
                              {impact.label} Impact, {likelihood.label} Likelihood
                            </Typography>
                            <Typography variant="body2">
                              Score: {score} | Risks: {count} | Level: {riskLevel}
                            </Typography>
                            <Typography variant="caption">
                              Posisi: L{likelihood.level}-I{impact.level}
                            </Typography>
                            {count > 0 && (
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                Klik untuk lihat {count} risiko
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                      >
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: cellColor,
                            color: riskLevel.includes('Sedang') ? '#333' : 'white',
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
                          onClick={() => handleCellClick(likelihood.level, impact.level)}
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
                            <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
                              Score: {score}
                            </Typography>
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

        {/* Legend */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Risk Levels:
              </Typography>
              <Grid container spacing={1}>
                {riskLevels.map((level, index) => (
                  <Grid item xs={12} key={index}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: level.color, 
                          borderRadius: 1,
                          border: '1px solid #ccc'
                        }} 
                      />
                      <Box>
                        <Typography variant="caption" fontWeight="medium">
                          {level.label} ({level.min}-{level.max})
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Score range: {level.min}-{level.max}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Metode: {assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}
              </Typography>
              <Box sx={{ fontSize: '0.8rem' }}>
                <Typography variant="caption" display="block">
                  <strong>X-Axis (Horizontal):</strong> Impact
                </Typography>
                <Typography variant="caption" display="block">
                  I1 (Tdk Signifikan) → I5 (Sangat Signifikan)
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  <strong>Y-Axis (Vertical):</strong> Likelihood
                </Typography>
                <Typography variant="caption" display="block">
                  ↑ L5 (Hampir Pasti) → L1 (Hampir Tidak) ↓
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                  {assessmentMethod === 'coordinate' 
                    ? 'Risk Level berdasarkan matriks koordinat'
                    : 'Risk Level = Likelihood × Impact'
                  }
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Matrix Values Reference */}
        {assessmentMethod === 'coordinate' && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="info.main">
              Referensi Matriks Koordinat:
            </Typography>
            <Typography variant="caption" display="block">
              Nilai score berdasarkan kombinasi Likelihood (L) dan Impact (I):
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, fontSize: '0.7rem' }}>
              {COORDINATE_MATRIX.slice(0, 8).map(([l, i, score], index) => (
                <Chip 
                  key={index}
                  label={`L${l}-I${i}=${score}`}
                  size="small"
                  variant="outlined"
                />
              ))}
              <Chip label="..." size="small" variant="outlined" />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Configuration Dialog untuk Risk Assessment Settings (tetap sama)
const RiskAssessmentConfigDialog = ({ open, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [newLevel, setNewLevel] = useState({ min: 1, max: 5, label: '', color: '#4caf50' });

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleAddLevel = () => {
    if (newLevel.label && newLevel.min <= newLevel.max) {
      const updatedLevels = [...localConfig.riskLevels, { ...newLevel }];
      setLocalConfig({
        ...localConfig,
        riskLevels: updatedLevels.sort((a, b) => a.min - b.min)
      });
      setNewLevel({ min: newLevel.max + 1, max: newLevel.max + 5, label: '', color: '#4caf50' });
    }
  };

  const handleRemoveLevel = (index) => {
    const updatedLevels = localConfig.riskLevels.filter((_, i) => i !== index);
    setLocalConfig({
      ...localConfig,
      riskLevels: updatedLevels
    });
  };

  const handleUpdateLevel = (index, field, value) => {
    const updatedLevels = localConfig.riskLevels.map((level, i) => 
      i === index ? { ...level, [field]: value } : level
    );
    setLocalConfig({
      ...localConfig,
      riskLevels: updatedLevels.sort((a, b) => a.min - b.min)
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          <Typography variant="h6">Konfigurasi Risk Assessment</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <Typography variant="h6" gutterBottom>
                Metode Assessment
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={localConfig.assessmentMethod === 'coordinate'}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      assessmentMethod: e.target.checked ? 'coordinate' : 'multiplication'
                    })}
                  />
                }
                label={
                  localConfig.assessmentMethod === 'coordinate' 
                    ? 'Metode Koordinat (Berdasarkan matriks koordinat)'
                    : 'Metode Perkalian (Likelihood × Impact)'
                }
              />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Kustomisasi Tingkat Risiko
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Tentukan range score dan label untuk setiap tingkat risiko
            </Typography>
          </Grid>

          {/* Existing Risk Levels */}
          <Grid item xs={12}>
            <List>
              {localConfig.riskLevels.map((level, index) => (
                <ListItem key={index} divider>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 20, 
                        backgroundColor: level.color,
                        borderRadius: 1 
                      }} 
                    />
                    <TextField
                      size="small"
                      label="Min Score"
                      type="number"
                      value={level.min}
                      onChange={(e) => handleUpdateLevel(index, 'min', parseInt(e.target.value))}
                      sx={{ width: 100 }}
                    />
                    <Typography>-</Typography>
                    <TextField
                      size="small"
                      label="Max Score"
                      type="number"
                      value={level.max}
                      onChange={(e) => handleUpdateLevel(index, 'max', parseInt(e.target.value))}
                      sx={{ width: 100 }}
                    />
                    <TextField
                      size="small"
                      label="Label"
                      value={level.label}
                      onChange={(e) => handleUpdateLevel(index, 'label', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Color"
                      type="color"
                      value={level.color}
                      onChange={(e) => handleUpdateLevel(index, 'color', e.target.value)}
                      sx={{ width: 80 }}
                    />
                    <IconButton 
                      onClick={() => handleRemoveLevel(index)}
                      color="error"
                      size="small"
                    >
                      <Close />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Add New Level */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Tambah Tingkat Risiko Baru</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Min"
                      type="number"
                      value={newLevel.min}
                      onChange={(e) => setNewLevel({...newLevel, min: parseInt(e.target.value)})}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Max"
                      type="number"
                      value={newLevel.max}
                      onChange={(e) => setNewLevel({...newLevel, max: parseInt(e.target.value)})}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Label"
                      value={newLevel.label}
                      onChange={(e) => setNewLevel({...newLevel, label: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Color"
                      type="color"
                      value={newLevel.color}
                      onChange={(e) => setNewLevel({...newLevel, color: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button 
                      variant="contained" 
                      onClick={handleAddLevel}
                      disabled={!newLevel.label || newLevel.min > newLevel.max}
                    >
                      Tambah
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Preview */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Preview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {localConfig.riskLevels.map((level, index) => (
                <Chip
                  key={index}
                  label={`${level.label} (${level.min}-${level.max})`}
                  sx={{ backgroundColor: level.color, color: 'white' }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Batal</Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={localConfig.riskLevels.length === 0}
        >
          Simpan Konfigurasi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Custom Export Menu (tetap sama)
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

// Enhanced Risk Assessment Component - DIPERBAIKI: focus pada visualisasi saja
const RiskAssessment = () => {
  const { currentUser, userData } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [configDialog, setConfigDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // ✅ STATE BARU UNTUK KONFIGURASI
  const [assessmentConfig, setAssessmentConfig] = useState({
    assessmentMethod: 'multiplication', // 'multiplication' or 'coordinate'
    riskLevels: DEFAULT_RISK_LEVELS
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

  // ===============================
  // FUNGSI UTAMA
  // ===============================

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Load data
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

  // Load configuration from Firestore
  const loadConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'risk_assessment_config', 'default'));
      if (configDoc.exists()) {
        setAssessmentConfig(configDoc.data());
      } else {
        // Jika dokumen belum ada, buat dengan konfigurasi default
        await setDoc(doc(db, 'risk_assessment_config', 'default'), {
          assessmentMethod: 'multiplication',
          riskLevels: DEFAULT_RISK_LEVELS
        });
        setAssessmentConfig({
          assessmentMethod: 'multiplication',
          riskLevels: DEFAULT_RISK_LEVELS
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      // Fallback ke default config jika error
      setAssessmentConfig({
        assessmentMethod: 'multiplication',
        riskLevels: DEFAULT_RISK_LEVELS
      });
    }
  };

  // Save configuration to Firestore
  const saveConfig = async (newConfig) => {
    try {
      // Gunakan setDoc dengan merge: true untuk create atau update
      await setDoc(doc(db, 'risk_assessment_config', 'default'), newConfig, { merge: true });
      setAssessmentConfig(newConfig);
      showSnackbar('Konfigurasi berhasil disimpan!', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      showSnackbar('Error menyimpan konfigurasi: ' + error.message, 'error');
    }
  };

  // Handle cell click
  const handleCellClick = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => 
      risk.likelihood === likelihood && risk.impact === impact
    );
    console.log(`Risks in cell L${likelihood}-I${impact}:`, cellRisks);
  };

  // Export menu handlers
  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  // Calculate risk level berdasarkan konfigurasi
  const calculateRiskLevel = (risk) => {
    let score;
    
    if (assessmentConfig.assessmentMethod === 'coordinate') {
      // Risk level berdasarkan matriks koordinat
      score = getCoordinateScore(risk.likelihood || 1, risk.impact || 1);
    } else {
      // Risk level berdasarkan perkalian
      score = (risk.likelihood || 1) * (risk.impact || 1);
    }
    
    const riskLevel = assessmentConfig.riskLevels.find(level => 
      score >= level.min && score <= level.max
    );
    
    if (riskLevel) {
      return { 
        level: riskLevel.label, 
        color: 'primary',
        customColor: riskLevel.color,
        score: score
      };
    }
    
    // Fallback untuk score di luar range
    if (score >= 20) return { level: 'Extreme', color: 'error', score };
    if (score >= 16) return { level: 'High', color: 'warning', score };
    if (score >= 10) return { level: 'Medium', color: 'info', score };
    if (score >= 5) return { level: 'Low', color: 'success', score };
    return { level: 'Very Low', color: 'success', score };
  };

  // Handle heatmap click - navigasi ke risk register dengan filter
  const handleHeatmapClick = (riskLevel, likelihood, impact) => {
    const queryParams = new URLSearchParams({
      riskLevel: riskLevel,
      likelihood: likelihood,
      impact: impact,
      assessmentMethod: assessmentConfig.assessmentMethod
    });
    
    navigate(`/risk-register?${queryParams.toString()}`);
    showSnackbar(`Membuka Risk Register dengan filter: ${riskLevel}`, 'info');
  };

  // Load data dan config saat component mount
  useEffect(() => {
    loadData();
    loadConfig();
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

  // Helper functions
  const getStatusLabel = (status) => {
    const statusInfo = riskStatuses.find(s => s.value === status);
    return statusInfo ? statusInfo.label : 'Teridentifikasi';
  };

  const getUnitName = (unitId) => {
    const unit = organizationUnits.find(u => u.id === unitId);
    return unit ? unit.name : 'Tidak ada';
  };

  // Statistics
  const stats = {
    totalRisks: risks.length,
    assessedRisks: risks.filter(r => r.status === 'assessed').length,
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
                  Visualisasi dan analisis tingkat risiko organisasi
                </Typography>
                <Typography variant="caption" color="primary" fontWeight="bold">
                  Metode: {assessmentConfig.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} | 
                  Total Risks: {risks.length} | Assessed: {stats.assessedRisks}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" gap={2}>
              {/* Configuration Button */}
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setConfigDialog(true)}
              >
                Konfigurasi
              </Button>
              
              {/* Export Button */}
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
              
              <CustomExportMenu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
                onExportPDF={() => {/* implement PDF export */}}
                onExportCSV={() => {/* implement CSV export */}}
                onExportText={() => {/* implement Text export */}}
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
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column - PROFESSIONAL HEATMAP dengan konfigurasi baru */}
        <Grid item xs={12} lg={8}>
          <ProfessionalRiskMatrix 
            risks={risks} 
            onCellClick={handleCellClick}
            assessmentMethod={assessmentConfig.assessmentMethod}
            riskLevels={assessmentConfig.riskLevels}
            onHeatmapClick={handleHeatmapClick}
          />
        </Grid>

        {/* Right Column - Filters dan Info */}
        <Grid item xs={12} lg={4}>
          {/* Configuration Info Card */}
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Settings color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Konfigurasi Saat Ini
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Metode Assessment:
                </Typography>
                <Chip 
                  label={assessmentConfig.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} 
                  color="primary" 
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Tingkat Risiko:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {assessmentConfig.riskLevels.slice(0, 3).map((level, index) => (
                  <Box key={index} display="flex" alignItems="center" gap={1}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: level.color,
                        borderRadius: 1 
                      }} 
                    />
                    <Typography variant="caption">
                      {level.label} ({level.min}-{level.max})
                    </Typography>
                  </Box>
                ))}
                {assessmentConfig.riskLevels.length > 3 && (
                  <Typography variant="caption" color="textSecondary">
                    +{assessmentConfig.riskLevels.length - 3} level lainnya...
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<Assessment />}
                onClick={() => navigate('/risk-register')}
                sx={{ mb: 1 }}
              >
                Buka Risk Register
              </Button>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                Untuk melakukan assessment risiko, buka menu Risk Register
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Configuration Dialog */}
      <RiskAssessmentConfigDialog
        open={configDialog}
        onClose={() => setConfigDialog(false)}
        config={assessmentConfig}
        onSave={saveConfig}
      />

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