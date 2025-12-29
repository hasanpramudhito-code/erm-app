import React, { useState, useEffect, useMemo } from 'react'; // TETAP useMemo saja
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
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Rating,
  Slider,
  Checkbox,
  ListItemText as MuiListItemText,
  InputBase,
  Popper,
  Autocomplete,
  ListSubheader
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
  CalendarToday,
  CorporateFare,
  Analytics,
  ExpandMore,
  ExpandLess,
  FilterList,
  RestartAlt,
  ArrowDropDown,
  Search as SearchIcon,
  Clear
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query as firestoreQuery,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';
import { useLocation } from 'react-router-dom';
import { calculateRisk } from '../utils/riskCalculator';
import { 
  exportRiskRegisterPDF, 
  exportRiskRegisterExcel 
} from '../services/reporting/exportRiskRegister';
import { fetchRisks } from '../services/riskService';
const risks = await fetchRisks();
import { simpleExportRiskRegisterPDF } from './simple-export';

const RiskRegister = () => {
  const [risks, setRisks] = useState([]);
  const [riskTypes, setRiskTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [assessingRisk, setAssessingRisk] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState({
    pdf: false,
    excel: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [codeError, setCodeError] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  
  // State untuk search di dropdown
  const [riskTypeSearch, setRiskTypeSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  
  // State untuk filter
  const [filters, setFilters] = useState({
    status: [],
    riskSources: [],
    departments: [],
    riskOwners: [],
    inherentLevels: [],
    residualLevels: [],
    treatmentPriorities: [],
    dateCreatedRange: { start: null, end: null },
    targetDateRange: { start: null, end: null },
    showFilters: false,
  });

  // === FILTER DARI HEATMAP ===
  const location = useLocation();
  const urlQuery = new URLSearchParams(location.search);

  const filterLikelihood = urlQuery.get("likelihood");
  const filterImpact = urlQuery.get("impact");
  const filterRiskLevel = urlQuery.get("riskLevel");
  const viewMode = urlQuery.get("viewMode") || "inherent";

  // State untuk data unik dropdown
  const [uniqueRiskOwners, setUniqueRiskOwners] = useState([]);
  const [uniqueDepartmentNames, setUniqueDepartmentNames] = useState([]);
  
  const { userData } = useAuth();
  const { 
    assessmentConfig, 
    loading: configLoading,
    calculateScore, 
    calculateRiskLevel,
    getRiskLevelOptions,
    getRiskLevelColor,
    getRiskLevelLabel,
    getRatingOptions,
    getRatingLabel,
    refreshConfig
  } = useAssessmentConfig();

  // ========== FUNGSI BARU UNTUK MENGHITUNG SCORE SESUAI KONFIGURASI ==========
  
  // 1. Fungsi calculateRiskScore baru
  const calculateRiskScore = (impact, probability, riskMethod = null) => {
    if (!impact || !probability) {
      console.log('⚠️ calculateRiskScore: Missing impact or probability, returning 1');
      return 1;
    }
    
    const impactNum = parseInt(impact) || 1;
    const probNum = parseInt(probability) || 1;
    
    // Gunakan method dari risk data jika ada, jika tidak gunakan config
    const method = riskMethod || assessmentConfig?.assessmentMethod || 'multiplication';
    const methodLower = method.toLowerCase();
    
    console.log('🔄 calculateRiskScore:', { 
      impact: impactNum, 
      probability: probNum,
      method: methodLower,
      configMethod: assessmentConfig?.assessmentMethod
    });
    
    // Jika method coordinate dan calculateScore ada
    if (methodLower === 'coordinate' && calculateScore) {
      try {
        const result = calculateScore(probNum, impactNum); // Note: calculateScore expects (likelihood, impact)
        console.log('📊 Coordinate result:', result);
        return result;
      } catch (error) {
        console.error('❌ Coordinate calculation error:', error);
        // Fallback ke perkalian
        const fallbackResult = impactNum * probNum;
        console.log('📊 Fallback to multiplication:', fallbackResult);
        return fallbackResult;
      }
    } else {
      // Multiplication method
      const result = impactNum * probNum;
      console.log('📊 Multiplication result:', result);
      return result;
    }
  };

  // 2. Debug useEffect untuk config
  useEffect(() => {
    console.log('🔍 RiskRegister Config Status:', {
      configExists: !!assessmentConfig,
      method: assessmentConfig?.assessmentMethod,
      loading: configLoading,
      hasCalculateScore: !!calculateScore
    });
    
    if (assessmentConfig) {
      console.log('✅ Config loaded:', assessmentConfig);
    }
  }, [assessmentConfig, configLoading]);

  // ========== FUNGSI UNTUK INHERENT DAN RESIDUAL RISK LEVEL ==========
  
  // Fungsi getInherentRiskLevelInfo BARU
  const getInherentRiskLevelInfo = (risk) => {
    console.log('🔍 getInherentRiskLevelInfo for:', risk.riskCode, {
      impact: risk.initialImpact,
      probability: risk.initialProbability,
      storedMethod: risk.scoreMethod,
      configMethod: assessmentConfig?.assessmentMethod
    });
    
    const method = risk.scoreMethod || assessmentConfig?.assessmentMethod || 'multiplication';
    const methodLower = method.toLowerCase();
    
    const score = calculateRiskScore(risk.initialImpact, risk.initialProbability, methodLower);
    
    console.log('✅ Inherent Score (method:', methodLower, '):', score);
    
    const levelInfo = calculateRiskLevel(score);
    console.log('✅ Inherent Level Info:', levelInfo);
    
    return levelInfo;
  };

  // Fungsi getResidualRiskLevelInfo BARU
  const getResidualRiskLevelInfo = (risk) => {
    console.log('🔍 getResidualRiskLevelInfo for:', risk.riskCode, {
      impact: risk.residualImpact,
      probability: risk.residualProbability,
      storedMethod: risk.scoreMethod,
      configMethod: assessmentConfig?.assessmentMethod
    });
    
    const method = risk.scoreMethod || assessmentConfig?.assessmentMethod || 'multiplication';
    const methodLower = method.toLowerCase();
    
    const score = calculateRiskScore(risk.residualImpact, risk.residualProbability, methodLower);
    
    console.log('✅ Residual Score (method:', methodLower, '):', score);
    
    const levelInfo = calculateRiskLevel(score);
    console.log('✅ Residual Level Info:', levelInfo);
    
    return levelInfo;
  };

  // Helper function untuk mendapatkan warna Chip yang valid
  const getValidChipColor = (color, fallback = 'default') => {
    const validColors = ['default', 'primary', 'secondary', 'error', 'warning', 'info', 'success'];
    
    if (color && validColors.includes(color)) {
      return color;
    }
    
    const colorMap = {
      'success': 'success',
      'warning': 'warning',
      'error': 'error',
      'info': 'info',
      'primary': 'primary',
      'secondary': 'secondary',
      'very_low': 'success',
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'very_high': 'error',
      'extreme': 'error'
    };
    
    if (color && colorMap[color]) {
      return colorMap[color];
    }
    
    return fallback;
  };

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
    department: '',
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
    targetCompletion: '',
    status: 'open'
  });

  // Assessment form data
  const [assessmentData, setAssessmentData] = useState({
    likelihood: 1,
    impact: 1,
    controlEffectiveness: 3,
    residualLikelihood: 1,
    residualImpact: 1,
    treatmentPriority: 'Medium - Sedang (Penanganan < 1 Bulan)',
    assessmentNotes: ''
  });

  // Data dropdown yang lebih lengkap
  const riskSources = [
    'Internal', 
    'External' 
  ];

  const riskClassifications = [
    'Critical - Prioritas Tertinggi',
    'High Priority - Prioritas Tinggi', 
    'Medium Priority - Prioritas Menengah', 
    'Low Priority - Prioritas Rendah',
    'Monitoring - Pemantauan Rutin'
  ];

  const effectivenessLevels = [
    'Sangat Efektif (90-100%)',
    'Efektif (75-89%)', 
    'Cukup Efektif (50-74%)', 
    'Kurang Efektif (25-49%)', 
    'Tidak Efektif (0-24%)'
  ];

  const treatmentPriorities = [
    'Critical - Kritis (Penanganan Segera)',
    'High - Tinggi (Penanganan < 1 Minggu)',
    'Medium - Sedang (Penanganan < 1 Bulan)',
    'Low - Rendah (Penanganan < 3 Bulan)',
    'Monitor - Pantau Saja'
  ];

  const departmentsList = [
    'Direksi',
    'Keuangan & Akuntansi',
    'SDM & Umum',
    'Operasional',
    'Pemasaran & Penjualan',
    'Teknologi Informasi',
    'HSSE',
    'Legal & Kepatuhan',
    'Procurement',
    'R&D',
    'Quality Assurance',
    'Project Management',
    'Customer Service',
    'Logistik & Supply Chain',
    'Lainnya (Input Manual)'
  ];

  const statusOptions = [
    'Open - Baru Teridentifikasi',
    'In Assessment - Dalam Penilaian',
    'Assessed - Telah Dinilai',
    'In Treatment - Dalam Penanganan',
    'Monitored - Dalam Pemantauan',
    'Closed - Ditutup',
    'Rejected - Ditolak'
  ];

  // Helper functions yang menggunakan konfigurasi dari context
  const getRatingOptionsFromConfig = () => {
    if (getRatingOptions) {
      return getRatingOptions();
    }
    return [1, 2, 3, 4, 5];
  };

  const getRatingLabelFromConfig = (value, type = 'likelihood') => {
    if (getRatingLabel) {
      return getRatingLabel(value, type);
    }
    if (type === 'likelihood') {
      const labels = {
        1: '1 - Sangat Rendah',
        2: '2 - Rendah',
        3: '3 - Sedang',
        4: '4 - Tinggi',
        5: '5 - Sangat Tinggi'
      };
      return labels[value] || `${value}`;
    } else {
      const labels = {
        1: '1 - Dampak tidak signifikan',
        2: '2 - Dampak terbatas',
        3: '3 - Dampak signifikan',
        4: '4 - Dampak kritis',
        5: '5 - Dampak katastropik'
      };
      return labels[value] || `${value}`;
    }
  };

  const getRiskLevelOptionsFromConfig = () => {
    if (getRiskLevelOptions) {
      return getRiskLevelOptions();
    }
    
    return [
      { value: 'very_low', label: 'Sangat Rendah', min: 1, max: 3, color: 'success' },
      { value: 'low', label: 'Rendah', min: 4, max: 6, color: 'success' },
      { value: 'medium', label: 'Sedang', min: 7, max: 10, color: 'warning' },
      { value: 'high', label: 'Tinggi', min: 11, max: 15, color: 'error' },
      { value: 'very_high', label: 'Sangat Tinggi', min: 16, max: 20, color: 'error' },
      { value: 'extreme', label: 'Ekstrim', min: 21, max: 25, color: 'error' }
    ];
  };

  const getRiskLevelColorFromConfig = (levelLabel) => {
    if (getRiskLevelColor) {
      return getRiskLevelColor(levelLabel);
    }
    
    const level = getRiskLevelOptionsFromConfig().find(opt => 
      opt.label.toLowerCase() === levelLabel.toLowerCase()
    );
    return level?.color || 'default';
  };

  const getRiskLevelLabelFromConfig = (levelValue) => {
    if (getRiskLevelLabel) {
      return getRiskLevelLabel(levelValue);
    }
    
    const level = getRiskLevelOptionsFromConfig().find(opt => 
      opt.value.toLowerCase() === levelValue.toLowerCase()
    );
    return level?.label || levelValue;
  };

  // Helper untuk mendapatkan nama dari ID
  const getRiskTypeName = (id) => {
    if (!id) return '-';
    const found = riskTypes.find(r => r.id === id);
    return found ? found.name : '-';
  };

  const getDepartmentName = (id) => {
    if (!id) return '-';
    const found = departments.find(u => u.id === id);
    return found ? found.name : '-';
  };

  // Filter risk types berdasarkan search
  const filteredRiskTypes = useMemo(() => {
    if (!riskTypeSearch) return riskTypes;
    return riskTypes.filter(type => 
      type.name.toLowerCase().includes(riskTypeSearch.toLowerCase()) ||
      (type.description && type.description.toLowerCase().includes(riskTypeSearch.toLowerCase()))
    );
  }, [riskTypes, riskTypeSearch]);

  // Filter departments berdasarkan search
  const filteredDepartments = useMemo(() => {
    if (!departmentSearch) return departments;
    return departments.filter(dept => 
      dept.name.toLowerCase().includes(departmentSearch.toLowerCase()) ||
      (dept.code && dept.code.toLowerCase().includes(departmentSearch.toLowerCase())) ||
      (dept.description && dept.description.toLowerCase().includes(departmentSearch.toLowerCase()))
    );
  }, [departments, departmentSearch]);

  // Render inherent risk level
  const renderInherentRiskLevel = (risk) => {
    try {
      const riskLevelInfo = getInherentRiskLevelInfo(risk);
      const validColor = getValidChipColor(riskLevelInfo.color, 'default');
      
      // Debug output
      console.log('🎨 Rendering Inherent:', {
        code: risk.riskCode,
        impact: risk.initialImpact,
        prob: risk.initialProbability,
        score: riskLevelInfo.score,
        level: riskLevelInfo.level,
        color: riskLevelInfo.color
      });
      
      return (
        <Chip 
          label={`${riskLevelInfo.level} (${riskLevelInfo.score})`}
          size="small" 
          color={validColor}
        />
      );
    } catch (error) {
      console.error('Error rendering inherent risk:', error);
      return (
        <Chip 
          label="Error"
          size="small" 
          color="error"
        />
      );
    }
  };

  // Render residual risk level
  const renderResidualRiskLevel = (risk) => {
    try {
      const riskLevelInfo = getResidualRiskLevelInfo(risk);
      const validColor = getValidChipColor(riskLevelInfo.color, 'default');
      
      // Debug output
      console.log('🎨 Rendering Residual:', {
        code: risk.riskCode,
        impact: risk.residualImpact,
        prob: risk.residualProbability,
        score: riskLevelInfo.score,
        level: riskLevelInfo.level,
        color: riskLevelInfo.color
      });
      
      return (
        <Chip 
          label={`${riskLevelInfo.level} (${riskLevelInfo.score})`}
          size="small" 
          color={validColor}
          variant="outlined"
        />
      );
    } catch (error) {
      console.error('Error rendering residual risk:', error);
      return (
        <Chip 
          label="Error"
          size="small" 
          color="error"
          variant="outlined"
        />
      );
    }
  };
    
  // Load data risiko
  const loadData = async () => {
    try {
      setLoading(true);
      
      const risksQuery = firestoreQuery(collection(db, 'risks'), orderBy('createdAt', 'desc'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRisks(risksList);

    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error memuat data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load master data dari risk_parameters
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const q = firestoreQuery(
          collection(db, 'risk_parameters'),
          where('type', 'in', ['risk_type', 'organization_unit'])
        );

        const snapshot = await getDocs(q);

        const types = [];
        const depts = [];

        snapshot.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          if (data.type === 'risk_type') types.push(data);
          if (data.type === 'organization_unit') depts.push(data);
        });

        setRiskTypes(types);
        setDepartments(depts);
      } catch (err) {
        console.error('Gagal memuat master risk parameter', err);
      }
    };

    loadMasterData();
  }, []);
    
  useEffect(() => {
    loadData();
    console.log("URL Filter:", filterLikelihood, filterImpact, filterRiskLevel);
  }, []);

  let filtered = risks;

  if (filterLikelihood) {
    filtered = filtered.filter(r =>
      (viewMode === "inherent"
        ? (r.likelihood || r.inherentLikelihood)
        : (r.residualLikelihood || r.likelihood || r.inherentLikelihood)
      ) == filterLikelihood
    );
  }

  if (filterImpact) {
    filtered = filtered.filter(r =>
      (viewMode === "inherent"
        ? (r.impact || r.inherentImpact)
        : (r.residualImpact || r.impact || r.inherentImpact)
      ) == filterImpact
    );
  }

  if (filterRiskLevel) {
    filtered = filtered.filter(r =>
      r.inherentLevel === filterRiskLevel ||
      r.residualLevel === filterRiskLevel
    );
  }

  // Extract unique data for filters
  useEffect(() => {
    if (risks.length > 0) {
      const owners = [...new Set(risks.map(risk => risk.riskOwner).filter(Boolean))];
      setUniqueRiskOwners(owners);
      
      const deptNames = [...new Set(risks.map(risk => {
        const deptId = risk.department;
        if (!deptId) return null;
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : null;
      }).filter(Boolean))];
      setUniqueDepartmentNames(deptNames);
    }
  }, [risks, departments]);

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

  // Fungsi untuk filter risiko
  const getFilteredRisks = () => {
    return risks.filter(risk => {
      // Filter dari heatmap
      if (filterLikelihood) {
        const L = (viewMode === "inherent"
          ? (risk.likelihood || risk.inherentLikelihood)
          : (risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood)
        );
        if (L != filterLikelihood) return false;
      }

      if (filterImpact) {
        const I = (viewMode === "inherent"
          ? (risk.impact || risk.inherentImpact)
          : (risk.residualImpact || risk.impact || risk.inherentImpact)
        );
        if (I != filterImpact) return false;
      }

      if (filterRiskLevel) {
        if (
          risk.inherentLevel !== filterRiskLevel &&
          risk.residualLevel !== filterRiskLevel
        ) {
          return false;
        }
      }

      // Filter lainnya
      if (filters.status.length > 0 && !filters.status.includes(risk.status)) {
        return false;
      }

      if (filters.riskSources.length > 0 && !filters.riskSources.includes(risk.riskSource)) {
        return false;
      }

      if (filters.departments.length > 0) {
        const deptName = getDepartmentName(risk.department);
        if (!filters.departments.includes(deptName)) {
          return false;
        }
      }

      if (filters.riskOwners.length > 0 && !filters.riskOwners.includes(risk.riskOwner)) {
        return false;
      }

      if (filters.treatmentPriorities.length > 0 && !filters.treatmentPriorities.includes(risk.treatmentPriority)) {
        return false;
      }

      // Inherent Risk Level menggunakan fungsi baru
      if (filters.inherentLevels.length > 0) {
        const inherentLevelInfo = getInherentRiskLevelInfo(risk);
        if (!filters.inherentLevels.some(level =>
          inherentLevelInfo.level?.toLowerCase().includes(level.toLowerCase())
        )) return false;
      }

      // Residual Risk Level menggunakan fungsi baru
      if (filters.residualLevels.length > 0) {
        const residualLevelInfo = getResidualRiskLevelInfo(risk);
        if (!filters.residualLevels.some(level =>
          residualLevelInfo.level?.toLowerCase().includes(level.toLowerCase())
        )) return false;
      }

      // Date Created Range
      if (filters.dateCreatedRange.start || filters.dateCreatedRange.end) {
        const riskDate = risk.createdAt?.toDate ? risk.createdAt.toDate() : new Date(risk.createdAt);
        
        if (filters.dateCreatedRange.start && riskDate < filters.dateCreatedRange.start) {
          return false;
        }
        if (filters.dateCreatedRange.end && riskDate > filters.dateCreatedRange.end) {
          return false;
        }
      }

      // Target Date Range
      if (filters.targetDateRange.start || filters.targetDateRange.end) {
        if (!risk.targetCompletion) return false;

        const targetDate = new Date(risk.targetCompletion);

        if (filters.targetDateRange.start && targetDate < filters.targetDateRange.start) {
          return false;
        }
        if (filters.targetDateRange.end && targetDate > filters.targetDateRange.end) return false;
      }

      // Search term
      const riskTypeName = getRiskTypeName(risk.riskType);
      const deptName = getDepartmentName(risk.department);
      
      if (searchTerm && !(
        risk.riskCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        riskTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskSource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskOwner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.status?.toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        return false;
      }

      return true;
    });
  };

  // Get changed fields for audit trail
  const getChangedFields = (oldData, newData) => {
    const changes = [];
    Object.keys(newData).forEach(key => {
      const skipFields = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'auditTrail', 'initialRiskLevel', 'residualRiskLevel'];
      if (skipFields.includes(key)) return;

      const oldValue = oldData[key];
      const newValue = newData[key];
      
      const oldVal = oldValue === null || oldValue === undefined ? '' : oldValue;
      const newVal = newValue === null || newValue === undefined ? '' : newValue;
      
      if (oldVal.toString() !== newVal.toString()) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal
        });
      }
    });
    return changes;
  };

  
  // Clean data for Firestore
  const cleanDataForFirestore = (data) => {
    const cleaned = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        cleaned[key] = data[key];
      }
    });
    return cleaned;
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      console.log('[DEBUG] assessmentMethod =', assessmentConfig?.assessmentMethod)
      if (!formData.riskCode || !formData.riskDescription || !formData.riskSource) {
        showSnackbar('Kode Risiko, Deskripsi risiko dan sumber risiko harus diisi!', 'error');
        return;
      }

      if (!editingRisk) {
        const isCodeExists = risks.some(risk => 
          risk.riskCode?.toLowerCase() === formData.riskCode.toLowerCase()
        );
        if (isCodeExists) {
          showSnackbar('Kode Risiko sudah digunakan! Silakan gunakan kode yang berbeda.', 'error');
          return;
        }
      }

      const riskDataToSave = {
        riskCode: formData.riskCode.toUpperCase(),
        riskType: formData.riskType || '',
        classification: formData.classification || '',
        riskSource: formData.riskSource || '',
        riskDescription: formData.riskDescription || '',
        cause: formData.cause || '',
        impactText: formData.impactText || '',
        riskOwner: formData.riskOwner || '',
        department: formData.department || '',
        initialProbability: formData.initialProbability || '',
        initialImpact: formData.initialImpact || '',
        inherentRiskQuantification: formData.inherentRiskQuantification || '',
        existingControls: formData.existingControls || '',
        controlEffectiveness: formData.controlEffectiveness || '',
        residualProbability: formData.residualProbability || '',
        residualImpact: formData.residualImpact || '',
        residualRiskQuantification: formData.residualRiskQuantification || '',
        additionalControls: formData.additionalControls || '',
        controlCost: formData.controlCost || '',
        responsiblePerson: formData.responsiblePerson || '',
        targetCompletion: formData.targetCompletion || '',
        status: formData.status || 'open',
        
        // Metadata
        createdAt: editingRisk ? editingRisk.createdAt : new Date(),
        createdBy: editingRisk ? editingRisk.createdBy : userData?.name || 'System',
        updatedAt: new Date(),
        updatedBy: userData?.name || 'System'
      };

      // Tentukan metode aktif dari Configuration (via context)
      const method = assessmentConfig?.assessmentMethod || 'multiplication';

      // Hitung score jika ada probability dan impact (Inherent)
      if (formData.initialProbability && formData.initialImpact) {
        const likelihood = parseInt(formData.initialProbability) || 1;
        const impact = parseInt(formData.initialImpact) || 1;

        // GUNAKAN FUNGSI BARU yang mengikuti config
        const inhScore = calculateRiskScore(impact, likelihood, method);
        const inhLevel = calculateRiskLevel(inhScore);

        // Simpan nilai mentah
        riskDataToSave.initialProbability = likelihood;
        riskDataToSave.initialImpact = impact;
        riskDataToSave.likelihood = likelihood;
        riskDataToSave.impact = impact;

        // Simpan hasil akhir ke Firestore
        riskDataToSave.inherentScore = inhScore;
        riskDataToSave.initialRiskLevel = inhLevel;
      }

      // Hitung score untuk Residual (jika ada)
      if (formData.residualProbability && formData.residualImpact) {
        const residualLikelihood = parseInt(formData.residualProbability) || 1;
        const residualImpact = parseInt(formData.residualImpact) || 1;

        // GUNAKAN FUNGSI BARU yang mengikuti config
        const resScore = calculateRiskScore(residualImpact, residualLikelihood, method);
        const resLevel = calculateRiskLevel(resScore);

        riskDataToSave.residualProbability = residualLikelihood;
        riskDataToSave.residualImpact = residualImpact;
        riskDataToSave.residualLikelihood = residualLikelihood;
        riskDataToSave.residualImpact = residualImpact;

        riskDataToSave.residualScore = resScore;
        riskDataToSave.residualRiskLevel = resLevel;
      }

      // Simpan jejak metode yang dipakai (untuk audit & ekspor)
      riskDataToSave.scoreMethod = assessmentConfig?.assessmentMethod || 'multiplication';

      const cleanedRiskData = cleanDataForFirestore(riskDataToSave);

      if (editingRisk) {
        const existingAuditTrail = editingRisk.auditTrail || [];
        cleanedRiskData.auditTrail = [
          ...existingAuditTrail,
          {
            action: 'updated',
            timestamp: new Date(),
            user: userData?.name || 'System',
            changes: getChangedFields(editingRisk, riskDataToSave)
          }
        ];
        
        await updateDoc(doc(db, "risks", editingRisk.id), cleanedRiskData);
        showSnackbar('Risiko berhasil diupdate!', 'success');
      } else {
        cleanedRiskData.auditTrail = [
          {
            action: 'created',
            timestamp: new Date(),
            user: userData?.name || 'System',
            changes: []
          }
        ];
        
        await addDoc(collection(db, "risks"), cleanedRiskData);
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
      department: '',
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
      targetCompletion: '',
      status: 'open'
    });
    setCodeError('');
    setRiskTypeSearch('');
    setDepartmentSearch('');
  };

  // Reset filter
  const resetFilters = () => {
    setFilters({
      status: [],
      riskSources: [],
      departments: [],
      riskOwners: [],
      inherentLevels: [],
      residualLevels: [],
      treatmentPriorities: [],
      dateCreatedRange: { start: null, end: null },
      targetDateRange: { start: null, end: null },
      showFilters: filters.showFilters,
    });
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
      department: risk.department || '',
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
      targetCompletion: risk.targetCompletion || '',
      status: risk.status || 'open'
    });
    setOpenDialog(true);
  };

  // Handle assessment
  const handleAssessment = (risk) => {
    setAssessingRisk(risk);
    setAssessmentData({
      likelihood: risk.initialProbability || 1,
      impact: risk.initialImpact || 1,
      controlEffectiveness: risk.controlEffectiveness || 3,
      residualLikelihood: risk.residualProbability || risk.initialProbability || 1,
      residualImpact: risk.residualImpact || risk.initialImpact || 1,
      treatmentPriority: risk.treatmentPriority || 'Medium - Sedang (Penanganan < 1 Bulan)',
      assessmentNotes: risk.assessmentNotes || ''
    });
    setAssessmentDialog(true);
  };
  
  // Handle Export PDF
  const handleExportPDF = async () => {
    if (filteredRisks.length === 0) {
      showSnackbar('Tidak ada data untuk di-export!', 'warning');
      return;
    }

    try {
      setExportLoading(prev => ({ ...prev, pdf: true }));
      
      await exportRiskRegisterPDF({
        risks: filteredRisks,
        reportConfig: { 
          dateRange: `${new Date().getFullYear()}-Q${Math.floor((new Date().getMonth() + 3) / 3)}`,
          company: 'PT Odira Energy Karang Agung'
        },
        userData,
        assessmentConfig, // INI PENTING - kirim konfigurasi
      });
      
      showSnackbar('Export PDF berhasil!', 'success');
    } catch (error) {
      console.error('Export PDF error:', error);
      showSnackbar(`Error export PDF: ${error.message}`, 'error');
    } finally {
      setExportLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // Handle Export Excel
  const handleExportExcel = async () => {
    if (filteredRisks.length === 0) {
      showSnackbar('Tidak ada data untuk di-export!', 'warning');
      return;
    }

    try {
      setExportLoading(prev => ({ ...prev, excel: true }));
      
      await exportRiskRegisterExcel({
        risks: filteredRisks,
        userData,
        assessmentConfig, // INI PENTING - kirim konfigurasi
      });
      
      showSnackbar('Export Excel berhasil!', 'success');
    } catch (error) {
      console.error('Export Excel error:', error);
      showSnackbar(`Error export Excel: ${error.message}`, 'error');
    } finally {
      setExportLoading(prev => ({ ...prev, excel: false }));
    }
  };

  // Handle view detail
  const handleViewDetail = (risk) => {
    setSelectedRisk(risk);
    setDetailDialog(true);
  };

  // Handle assessment submit
  const handleAssessmentSubmit = async () => {
    console.log('[DEBUG] assessmentMethod =', assessmentConfig?.assessmentMethod)
    if (!assessingRisk) return;

    try {
      setLoading(true);

      // Ambil metode aktif dari Configuration (via context)
      const method = assessmentConfig?.assessmentMethod || 'multiplication';

      // Pastikan nilai numerik
      const L  = parseInt(assessmentData.likelihood) || 1;
      const I  = parseInt(assessmentData.impact) || 1;
      const RL = parseInt(assessmentData.residualLikelihood) || 1;
      const RI = parseInt(assessmentData.residualImpact) || 1;

      // Hitung skor dengan fungsi baru yang mengikuti config
      const inhScore = calculateRiskScore(I, L, method);
      const resScore = calculateRiskScore(RI, RL, method);

      const inhLevel = calculateRiskLevel(inhScore);
      const resLevel = calculateRiskLevel(resScore);

      // SATU objek update saja (tidak duplikasi)
      const assessmentUpdate = {
        // nilai mentah
        likelihood: L,
        impact: I,
        controlEffectiveness: assessmentData.controlEffectiveness || 3,
        residualLikelihood: RL,
        residualImpact: RI,

        // hasil util (angka + level)
        inherentScore: inhScore,
        initialRiskLevel: inhLevel,

        residualScore: resScore,
        residualRiskLevel: resLevel,

        // jejak metode
        scoreMethod: method,

        // metadata lain
        treatmentPriority: assessmentData.treatmentPriority || 'Medium - Sedang (Penanganan < 1 Bulan)',
        assessmentNotes: assessmentData.assessmentNotes || '',
        assessedAt: new Date(),
        assessedBy: userData?.name || 'System',
        status: 'Assessed - Telah Dinilai',
        updatedAt: new Date(),
        updatedBy: userData?.name || 'System'
      };

      // Bersihkan nilai undefined/null sebelum kirim
      const cleanAssessmentData = {};
      Object.keys(assessmentUpdate).forEach(key => {
        if (assessmentUpdate[key] !== undefined && assessmentUpdate[key] !== null) {
          cleanAssessmentData[key] = assessmentUpdate[key];
        }
      });

      await updateDoc(doc(db, "risks", assessingRisk.id), cleanAssessmentData);

      showSnackbar('Assessment risiko berhasil disimpan!', 'success');
      setAssessmentDialog(false);
      setAssessingRisk(null);
      setAssessmentData({
        likelihood: 1,
        impact: 1,
        controlEffectiveness: 3,
        residualLikelihood: 1,
        residualImpact: 1,
        treatmentPriority: 'Medium - Sedang (Penanganan < 1 Bulan)',
        assessmentNotes: ''
      });
      loadData();

    } catch (error) {
      console.error('Error saving assessment:', error);
      showSnackbar('Error menyimpan assessment: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
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

  // Toggle row expansion
  const toggleRowExpansion = (riskId) => {
    setExpandedRows(prev => ({
      ...prev,
      [riskId]: !prev[riskId]
    }));
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

  // Filter risks based on search term and filters
  const filteredRisks = getFilteredRisks();

  // Paginated risks
  const paginatedRisks = filteredRisks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Count active filters
  const countActiveFilters = () => {
    let count = 0;
    
    count += filters.status.length;
    count += filters.riskSources.length;
    count += filters.departments.length;
    count += filters.riskOwners.length;
    count += filters.inherentLevels.length;
    count += filters.residualLevels.length;
    count += filters.treatmentPriorities.length;
    
    if (filters.dateCreatedRange.start) count++;
    if (filters.dateCreatedRange.end) count++;
    if (filters.targetDateRange.start) count++;
    if (filters.targetDateRange.end) count++;
    
    return count;
  };

  // Komponen Select dengan Search untuk Jenis Risiko
  const RiskTypeSelectWithSearch = () => {
    const MenuProps = {
      PaperProps: {
        style: {
          maxHeight: 300,
        },
      },
    };

    return (
      <FormControl fullWidth>
        <InputLabel>Jenis Risiko</InputLabel>
        <Select
          value={formData.riskType}
          label="Jenis Risiko"
          onChange={(e) => setFormData({ ...formData, riskType: e.target.value })}
          MenuProps={MenuProps}
          renderValue={(selected) => {
            const selectedType = riskTypes.find(type => type.id === selected);
            return selectedType ? selectedType.name : '';
          }}
        >
          {/* Search Box */}
          <ListSubheader>
            <Box sx={{ p: 1 }}>
              <TextField
                size="small"
                autoFocus
                placeholder="Cari jenis risiko..."
                fullWidth
                value={riskTypeSearch}
                onChange={(e) => setRiskTypeSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') {
                    e.stopPropagation();
                  }
                }}
                InputProps={{
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: riskTypeSearch && (
                    <IconButton
                      size="small"
                      onClick={() => setRiskTypeSearch('')}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  )
                }}
                variant="outlined"
              />
            </Box>
          </ListSubheader>
          
          {/* Hasil Filter */}
          {filteredRiskTypes.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Tidak ditemukan jenis risiko "{riskTypeSearch}"
              </Typography>
            </MenuItem>
          ) : (
            filteredRiskTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                <Box>
                  <Typography variant="body1">{type.name}</Typography>
                  {type.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {type.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
        <FormHelperText>
          {filteredRiskTypes.length} jenis risiko tersedia
        </FormHelperText>
      </FormControl>
    );
  };

  // Komponen Select dengan Search untuk Departemen
  const DepartmentSelectWithSearch = () => {
    const MenuProps = {
      PaperProps: {
        style: {
          maxHeight: 300,
        },
      },
    };

    return (
      <FormControl fullWidth>
        <InputLabel>Departemen</InputLabel>
        <Select
          value={formData.department}
          label="Departemen"
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          MenuProps={MenuProps}
          renderValue={(selected) => {
            const selectedDept = departments.find(dept => dept.id === selected);
            return selectedDept ? selectedDept.name : '';
          }}
        >
          {/* Search Box */}
          <ListSubheader>
            <Box sx={{ p: 1 }}>
              <TextField
                size="small"
                autoFocus
                placeholder="Cari departemen..."
                fullWidth
                value={departmentSearch}
                onChange={(e) => setDepartmentSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') {
                    e.stopPropagation();
                  }
                }}
                InputProps={{
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: departmentSearch && (
                    <IconButton
                      size="small"
                      onClick={() => setDepartmentSearch('')}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  )
                }}
                variant="outlined"
              />
            </Box>
          </ListSubheader>
          
          {/* Hasil Filter */}
          {filteredDepartments.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Tidak ditemukan departemen "{departmentSearch}"
              </Typography>
            </MenuItem>
          ) : (
            filteredDepartments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                <Box>
                  <Typography variant="body1">{dept.name}</Typography>
                  {dept.code && (
                    <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                      Kode: {dept.code}
                    </Typography>
                  )}
                  {dept.parent && (
                    <Typography variant="caption" color="textSecondary">
                      Parent: {dept.parent}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
        <FormHelperText>
          {filteredDepartments.length} departemen tersedia
        </FormHelperText>
      </FormControl>
    );
  };

  // Debug log untuk melihat konfigurasi
  console.log('⚙️ Current Assessment Config:', {
    method: assessmentConfig?.assessmentMethod,
    config: assessmentConfig,
    hasCalculateScore: !!calculateScore,
    configLoading
  });

  // Jika config belum loading, tampilkan loading state
  if (configLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Memuat konfigurasi assessment...
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Method: {assessmentConfig?.assessmentMethod || 'Loading...'}
        </Typography>
      </Box>
    );
  }

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
                  Total {risks.length} risiko teridentifikasi • {risks.filter(r => r.status === 'Assessed - Telah Dinilai').length} telah dinilai
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

      {/* Config Status Panel - TAMBAHAN BARU */}
      <Card sx={{ mb: 2, backgroundColor: assessmentConfig ? '#e8f5e9' : '#ffebee' }}>
        <CardContent sx={{ py: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" fontWeight="bold">
                ⚙️ Assessment Configuration
              </Typography>
              {assessmentConfig ? (
                <Chip 
                  label={assessmentConfig.assessmentMethod || 'multiplication'} 
                  size="small" 
                  color={assessmentConfig.assessmentMethod === 'coordinate' ? 'primary' : 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
              ) : (
                <Chip 
                  label="Not Loaded" 
                  size="small" 
                  color="warning"
                />
              )}
            </Box>
            {refreshConfig && (
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => {
                  refreshConfig();
                  showSnackbar('Configuration refreshed!', 'info');
                }}
                disabled={configLoading}
                startIcon={configLoading ? <CircularProgress size={16} /> : <RestartAlt fontSize="small" />}
              >
                {configLoading ? 'Loading...' : 'Refresh'}
              </Button>
            )}
          </Box>
          <Typography variant="caption" color="textSecondary">
            {assessmentConfig 
              ? `Using: ${assessmentConfig.assessmentMethod === 'coordinate' ? 'Coordinate Matrix' : 'Multiplication'}`
              : 'Loading configuration...'}
          </Typography>
        </CardContent>
      </Card>

      {/* Debug Panel - Hanya di development */}
      {process.env.NODE_ENV === 'development' && (
        <Card sx={{ mb: 2, backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }}>
          <CardContent sx={{ py: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" fontWeight="bold">
                🔧 Debug Assessment Method
              </Typography>
              <Chip 
                label={assessmentConfig?.assessmentMethod || 'multiplication'} 
                size="small" 
                color={assessmentConfig?.assessmentMethod === 'coordinate' ? 'primary' : 'default'}
              />
            </Box>
            <Typography variant="caption">
              Hitung skor dengan: {assessmentConfig?.assessmentMethod === 'coordinate' ? 'Coordinate Matrix (IxL)' : 'Multiplication (I*L)'}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Box */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Cari risiko berdasarkan kode, deskripsi, jenis, sumber, departemen, atau pemilik risiko..."
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
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setFilters({...filters, showFilters: !filters.showFilters})}
                >
                  {filters.showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                  {countActiveFilters() > 0 && (
                    <Chip 
                      size="small" 
                      label={countActiveFilters()}
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
                <Tooltip title="Reset Filter">
                  <IconButton 
                    onClick={resetFilters}
                    color="primary"
                  >
                    <RestartAlt />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filter Panel */}
      {filters.showFilters && (
        <Card sx={{ mb: 3, boxShadow: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                🔍 Filter Risiko
              </Typography>
              <Box display="flex" gap={1}>
                <Button 
                  size="small" 
                  onClick={resetFilters}
                  variant="outlined"
                  startIcon={<Delete />}
                >
                  Reset Filter
                </Button>
                <Button 
                  size="small" 
                  onClick={() => setFilters({...filters, showFilters: false})}
                >
                  Tutup
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {/* Filter Status */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    label="Status"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        <Checkbox checked={filters.status.indexOf(status) > -1} />
                        <MuiListItemText primary={status} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Risk Source */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sumber Risiko</InputLabel>
                  <Select
                    multiple
                    value={filters.riskSources}
                    onChange={(e) => setFilters({...filters, riskSources: e.target.value})}
                    label="Sumber Risiko"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {riskSources.map((source) => (
                      <MenuItem key={source} value={source}>
                        <Checkbox checked={filters.riskSources.indexOf(source) > -1} />
                        <MuiListItemText primary={source} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Department */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Departemen</InputLabel>
                  <Select
                    multiple
                    value={filters.departments}
                    onChange={(e) => setFilters({...filters, departments: e.target.value})}
                    label="Departemen"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {uniqueDepartmentNames.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        <Checkbox checked={filters.departments.indexOf(dept) > -1} />
                        <MuiListItemText primary={dept} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Risk Owner */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Pemilik Risiko</InputLabel>
                  <Select
                    multiple
                    value={filters.riskOwners}
                    onChange={(e) => setFilters({...filters, riskOwners: e.target.value})}
                    label="Pemilik Risiko"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {uniqueRiskOwners.map((owner) => (
                      <MenuItem key={owner} value={owner}>
                        <Checkbox checked={filters.riskOwners.indexOf(owner) > -1} />
                        <MuiListItemText primary={owner} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Treatment Priority */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Treatment Priority</InputLabel>
                  <Select
                    multiple
                    value={filters.treatmentPriorities}
                    onChange={(e) => setFilters({...filters, treatmentPriorities: e.target.value})}
                    label="Treatment Priority"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {treatmentPriorities.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        <Checkbox checked={filters.treatmentPriorities.indexOf(priority) > -1} />
                        <MuiListItemText primary={priority} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Inherent Risk Level */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Inherent Risk Level</InputLabel>
                  <Select
                    multiple
                    value={filters.inherentLevels}
                    onChange={(e) => setFilters({...filters, inherentLevels: e.target.value})}
                    label="Inherent Risk Level"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const levelOption = getRiskLevelOptionsFromConfig().find(opt => opt.value === value);
                          const chipColor = getValidChipColor(
                            getRiskLevelColorFromConfig(levelOption?.label || value),
                            'default'
                          );
                          return (
                            <Chip 
                              key={value} 
                              label={getRiskLevelLabelFromConfig(value)}
                              size="small" 
                              color={chipColor}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {getRiskLevelOptionsFromConfig().map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        <Checkbox checked={filters.inherentLevels.indexOf(level.value) > -1} />
                        <MuiListItemText primary={level.label} />
                        <Box sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: `${getValidChipColor(level.color, 'default')}.main`,
                          ml: 1 
                        }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Residual Risk Level */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Residual Risk Level</InputLabel>
                  <Select
                    multiple
                    value={filters.residualLevels}
                    onChange={(e) => setFilters({...filters, residualLevels: e.target.value})}
                    label="Residual Risk Level"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const levelOption = getRiskLevelOptionsFromConfig().find(opt => opt.value === value);
                          const chipColor = getValidChipColor(
                            getRiskLevelColorFromConfig(levelOption?.label || value),
                            'default'
                          );
                          return (
                            <Chip 
                              key={value} 
                              label={getRiskLevelLabelFromConfig(value)}
                              size="small" 
                              color={chipColor}
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {getRiskLevelOptionsFromConfig().map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        <Checkbox checked={filters.residualLevels.indexOf(level.value) > -1} />
                        <MuiListItemText primary={level.label} />
                        <Box sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: `${getValidChipColor(level.color, 'default')}.main`,
                          ml: 1 
                        }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Date Created Range */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>Tanggal Dibuat</Typography>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Dari"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateCreatedRange.start ? filters.dateCreatedRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      dateCreatedRange: {
                        ...filters.dateCreatedRange,
                        start: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Sampai"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateCreatedRange.end ? filters.dateCreatedRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      dateCreatedRange: {
                        ...filters.dateCreatedRange,
                        end: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                </Box>
              </Grid>

              {/* Filter Target Date Range */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>Target Selesai</Typography>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Dari"
                    InputLabelProps={{ shrink: true }}
                    value={filters.targetDateRange.start ? filters.targetDateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      targetDateRange: {
                        ...filters.targetDateRange,
                        start: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Sampai"
                    InputLabelProps={{ shrink: true }}
                    value={filters.targetDateRange.end ? filters.targetDateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      targetDateRange: {
                        ...filters.targetDateRange,
                        end: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                </Box>
              </Grid>

              {/* Summary Filter Aktif */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 1, backgroundColor: 'grey.50' }}>
                  <Typography variant="body2" color="textSecondary">
                    Filter aktif: {countActiveFilters()} • Menampilkan {filteredRisks.length} dari {risks.length} risiko
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Export Buttons */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              variant="outlined"
              startIcon={exportLoading.pdf ? <CircularProgress size={20} /> : <Description />}
              onClick={handleExportPDF}
              disabled={exportLoading.pdf || filteredRisks.length === 0}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={exportLoading.excel ? <CircularProgress size={20} /> : <Description />}
              onClick={handleExportExcel}
              disabled={exportLoading.excel || filteredRisks.length === 0}
            >
              Export Excel
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Risks Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Daftar Risiko ({filteredRisks.length})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Klik ⬇️ untuk detail lengkap
            </Typography>
          </Box>
          
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
              <TableContainer sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width="50px"></TableCell>
                      <TableCell width="120px"><strong>Kode</strong></TableCell>
                      <TableCell width="200px"><strong>Deskripsi</strong></TableCell>
                      <TableCell width="120px"><strong>Jenis</strong></TableCell>
                      <TableCell width="150px"><strong>Sumber</strong></TableCell>
                      <TableCell width="120px"><strong>Departemen</strong></TableCell>
                      <TableCell width="120px"><strong>Pemilik</strong></TableCell>
                      <TableCell width="100px"><strong>Status</strong></TableCell>
                      <TableCell width="100px"><strong>Inherent</strong></TableCell>
                      <TableCell width="100px"><strong>Residual</strong></TableCell>
                      <TableCell width="120px"><strong>Treatment Priority</strong></TableCell>
                      <TableCell width="100px"><strong>PIC</strong></TableCell>
                      <TableCell width="100px"><strong>Target</strong></TableCell>
                      <TableCell width="150px"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRisks.map((risk) => {
                      const isExpanded = expandedRows[risk.id];
                      const statusChipColor = getValidChipColor(
                        risk.status?.includes('Critical') || risk.status?.includes('Extreme') ? 'error' :
                        risk.status?.includes('High') ? 'warning' :
                        risk.status?.includes('Assessed') ? 'info' :
                        risk.status?.includes('Closed') ? 'success' : 'default',
                        'default'
                      );
                      const treatmentPriorityColor = getValidChipColor(
                        risk.treatmentPriority?.includes('Critical') ? 'error' :
                        risk.treatmentPriority?.includes('High') ? 'warning' :
                        risk.treatmentPriority?.includes('Medium') ? 'info' : 'default',
                        'default'
                      );
                      const riskTypeName = getRiskTypeName(risk.riskType);
                      const departmentName = getDepartmentName(risk.department);
                      
                      return (
                        <React.Fragment key={risk.id}>
                          {/* Main Row */}
                          <TableRow hover sx={{ backgroundColor: isExpanded ? 'action.hover' : 'inherit' }}>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => toggleRowExpansion(risk.id)}
                              >
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {risk.riskCode}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={risk.riskDescription}>
                                <Typography variant="body2" sx={{ 
                                  maxWidth: 200,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {risk.riskDescription}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={riskTypeName} 
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
                                color="secondary"
                              />
                            </TableCell>
                            <TableCell>
                              {departmentName ? (
                                <Chip 
                                  label={departmentName}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.riskOwner ? (
                                <Chip 
                                  label={risk.riskOwner}
                                  size="small"
                                  variant="outlined"
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={risk.status || 'Open'}
                                size="small"
                                color={statusChipColor}
                              />
                            </TableCell>
                            {/* GUNAKAN FUNGSI BARU */}
                            <TableCell>
                              {renderInherentRiskLevel(risk)}
                            </TableCell>
                            <TableCell>
                              {renderResidualRiskLevel(risk)}
                            </TableCell>
                            <TableCell>
                              {risk.treatmentPriority ? (
                                <Chip 
                                  label={risk.treatmentPriority}
                                  size="small"
                                  color={treatmentPriorityColor}
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.responsiblePerson ? (
                                <Typography variant="body2" fontSize="0.75rem">
                                  {risk.responsiblePerson}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.targetCompletion ? (
                                <Typography variant="body2" fontSize="0.75rem">
                                  {new Date(risk.targetCompletion).toLocaleDateString('id-ID')}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                <Tooltip title="Lihat Detail">
                                  <IconButton 
                                    color="info"
                                    size="small"
                                    onClick={() => handleViewDetail(risk)}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Assessment">
                                  <IconButton 
                                    color="warning"
                                    size="small"
                                    onClick={() => handleAssessment(risk)}
                                  >
                                    <Assessment fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton 
                                    color="primary"
                                    size="small"
                                    onClick={() => handleEdit(risk)}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Hapus">
                                  <IconButton 
                                    color="error" 
                                    size="small"
                                    onClick={() => handleDelete(risk.id)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row dengan Detail Lengkap */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={14} sx={{ 
                                backgroundColor: 'grey.50',
                                borderBottom: '1px solid',
                                borderBottomColor: 'divider'
                              }}>
                                <Grid container spacing={2} sx={{ p: 2 }}>
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                      📋 Identifikasi Risiko
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Penyebab:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.cause || '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Dampak:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.impactText || '-'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold">Klasifikasi:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.classification || '-'}
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  <Grid item xs={12} md={4}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                      🛡️ Kontrol & Assessment
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Kontrol Existing:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.existingControls ? risk.existingControls.substring(0, 100) + '...' : '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Efektivitas:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.controlEffectiveness || '-'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold">Kontrol Tambahan:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.additionalControls ? risk.additionalControls.substring(0, 100) + '...' : '-'}
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  <Grid item xs={12} md={4}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                      📊 Kuantifikasi & Timeline
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Inherent:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.inherentRiskQuantification || '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Residual:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.residualRiskQuantification || '-'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold">Biaya Kontrol:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.controlCost ? `Rp ${parseInt(risk.controlCost).toLocaleString('id-ID')}` : '-'}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50, 100]}
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
                {/* Kode Risiko */}
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

                {/* Jenis Risiko dengan Search */}
                <Grid item xs={12} sm={6}>
                  <RiskTypeSelectWithSearch />
                </Grid>

                {/* Klasifikasi */}
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

                {/* Sumber Risiko */}
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

                {/* Departemen dengan Search */}
                <Grid item xs={12} sm={6}>
                  <DepartmentSelectWithSearch />
                </Grid>

                {/* Status */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Deskripsi Risiko */}
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

                {/* Penyebab */}
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

                {/* Dampak */}
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

                {/* Pemilik Risiko */}
                <Grid item xs={12} sm={6}>
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

                {/* Penanggung Jawab */}
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
                    <InputLabel>Probabilitas Awal</InputLabel>
                    <Select
                      value={formData.initialProbability}
                      label="Probabilitas Awal"
                      onChange={(e) => setFormData({ ...formData, initialProbability: e.target.value })}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'likelihood')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dampak Awal</InputLabel>
                    <Select
                      value={formData.initialImpact}
                      label="Dampak Awal"
                      onChange={(e) => setFormData({ ...formData, initialImpact: e.target.value })}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'impact')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Risiko Inherent"
                    type="number"
                    multiline
                    rows={2}
                    value={formData.inherentRiskQuantification}
                    onChange={(e) => setFormData({ ...formData, inherentRiskQuantification: e.target.value })}
                    placeholder="Kuantifikasi risiko inherent (dalam nilai rupiah atau lainnya)..."
                      InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

              {formData.initialProbability && formData.initialImpact && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    {(() => {
                      const score = calculateRiskScore(formData.initialImpact, formData.initialProbability);
                      const level = calculateRiskLevel(score);
                      return <>Risk Score: {score} • Level: {level.level}</>;
                    })()}
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
                    <InputLabel>Probabilitas Residual</InputLabel>
                    <Select
                      value={formData.residualProbability}
                      label="Probabilitas Residual"
                      onChange={(e) => setFormData({ ...formData, residualProbability: e.target.value })}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'likelihood')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dampak Residual</InputLabel>
                    <Select
                      value={formData.residualImpact}
                      label="Dampak Residual"
                      onChange={(e) => setFormData({ ...formData, residualImpact: e.target.value })}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'impact')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Risiko Residual"
                    type="number"
                    multiline
                    rows={2}
                    value={formData.residualRiskQuantification}
                    onChange={(e) => setFormData({ ...formData, residualRiskQuantification: e.target.value })}
                    placeholder="Kuantifikasi risiko residual (dalam nilai rupiah atau lainnya)..."
                      InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

            {formData.residualProbability && formData.residualImpact && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {(() => {
                    const score = calculateRiskScore(formData.residualImpact, formData.residualProbability);
                    const level = calculateRiskLevel(score);
                    return <>Risk Score: {score} • Level: {level.level}</>;
                  })()}
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
                    placeholder="dalam nilai rupiah atau lainnya"
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

      {/* Assessment Dialog */}
      <Dialog 
        open={assessmentDialog} 
        onClose={() => {
          setAssessmentDialog(false);
          setAssessingRisk(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Assessment />
            Risk Assessment - {assessingRisk?.riskCode}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {assessingRisk && (
            <Box sx={{ mt: 2 }}>
              <Stepper activeStep={0} sx={{ mb: 4 }}>
                <Step><StepLabel>Inherent Risk</StepLabel></Step>
                <Step><StepLabel>Control Assessment</StepLabel></Step>
                <Step><StepLabel>Residual Risk</StepLabel></Step>
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
                    <Typography variant="body2" gutterBottom>Likelihood</Typography>
                    <Select
                      value={assessmentData.likelihood}
                      onChange={(e) => setAssessmentData({...assessmentData, likelihood: e.target.value})}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'likelihood')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>Impact</Typography>
                    <Select
                      value={assessmentData.impact}
                      onChange={(e) => setAssessmentData({...assessmentData, impact: e.target.value})}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'impact')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Control Effectiveness */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Control Effectiveness
                  </Typography>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Efektivitas Kontrol (1-5)
                    </Typography>
                    <Slider
                      value={assessmentData.controlEffectiveness}
                      onChange={(e, newValue) => setAssessmentData({...assessmentData, controlEffectiveness: newValue})}
                      min={1}
                      max={5}
                      marks
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
                    <Typography variant="body2" gutterBottom>Residual Likelihood</Typography>
                    <Select
                      value={assessmentData.residualLikelihood}
                      onChange={(e) => setAssessmentData({...assessmentData, residualLikelihood: e.target.value})}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'likelihood')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>Residual Impact</Typography>
                    <Select
                      value={assessmentData.residualImpact}
                      onChange={(e) => setAssessmentData({...assessmentData, residualImpact: e.target.value})}
                    >
                      {getRatingOptionsFromConfig().map((option) => (
                        <MenuItem key={option} value={option}>
                          {getRatingLabelFromConfig(option, 'impact')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Treatment Priority */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Treatment Priority</InputLabel>
                    <Select
                      value={assessmentData.treatmentPriority}
                      label="Treatment Priority"
                      onChange={(e) => setAssessmentData({...assessmentData, treatmentPriority: e.target.value})}
                    >
                      {treatmentPriorities.map((priority) => (
                        <MenuItem key={priority} value={priority}>
                          {priority}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Assessment Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assessment Notes"
                    multiline
                    rows={3}
                    value={assessmentData.assessmentNotes}
                    onChange={(e) => setAssessmentData({...assessmentData, assessmentNotes: e.target.value})}
                    placeholder="Catatan tambahan untuk assessment..."
                  />
                </Grid>

                {/* Risk Score Display */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ backgroundColor: 'grey.50', p: 2 }}>
                    <Grid container spacing={2}>
                      {/* Inherent preview */}
                      <Grid item xs={6}>
                        {(() => {
                          const inhScore = calculateRiskScore(assessmentData.impact, assessmentData.likelihood);
                          const inhLevel = calculateRiskLevel(inhScore);
                          return (
                            <>
                              <Typography variant="h4" color="primary">{inhScore}</Typography>
                              <Chip
                                label={inhLevel.level}
                                color={getValidChipColor(inhLevel.color, 'default')}
                              />
                            </>
                          );
                        })()}
                      </Grid>

                      {/* Residual preview */}
                      <Grid item xs={6}>
                        {(() => {
                          const resScore = calculateRiskScore(assessmentData.residualImpact, assessmentData.residualLikelihood);
                          const resLevel = calculateRiskLevel(resScore);
                          return (
                            <>
                              <Typography variant="h4" color="secondary">{resScore}</Typography>
                              <Chip
                                label={resLevel.level}
                                color={getValidChipColor(resLevel.color, 'default')}
                                variant="outlined"
                              />
                            </>
                          );
                        })()}
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAssessmentDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained"
            onClick={handleAssessmentSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan Assessment'}
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
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Kode Risiko</Typography>
                      <Typography variant="h6">{selectedRisk.riskCode}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Jenis Risiko</Typography>
                      <Chip label={getRiskTypeName(selectedRisk.riskType)} color="primary" sx={{ background: 'white', color: 'primary.main' }} />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Sumber Risiko</Typography>
                      <Chip label={selectedRisk.riskSource} variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Status</Typography>
                      <Chip 
                        label={selectedRisk.status || 'Open'} 
                        color={getValidChipColor(
                          selectedRisk.status?.includes('Critical') || selectedRisk.status?.includes('Extreme') ? 'error' :
                          selectedRisk.status?.includes('High') ? 'warning' :
                          selectedRisk.status?.includes('Assessed') ? 'info' :
                          selectedRisk.status?.includes('Closed') ? 'success' : 'default',
                          'default'
                        )}
                        sx={{ background: 'white' }}
                      />
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
                          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.riskDescription}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Klasifikasi</Typography>
                          <Typography variant="body1">{selectedRisk.classification || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Departemen</Typography>
                          <Typography variant="body1">{getDepartmentName(selectedRisk.department) || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Pemilik Risiko</Typography>
                          <Typography variant="body1">{selectedRisk.riskOwner || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Penanggung Jawab</Typography>
                          <Typography variant="body1">{selectedRisk.responsiblePerson || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Penyebab</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.cause || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.impactText || '-'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Kontrol Existing */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business />
                        Kontrol & Rencana Aksi
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kontrol Internal yang Ada</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.existingControls || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Efektivitas Kontrol</Typography>
                          <Typography variant="body1">{selectedRisk.controlEffectiveness || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Pengendalian Tambahan</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.additionalControls || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Biaya Pengendalian</Typography>
                          <Typography variant="body1">
                            {selectedRisk.controlCost ? `Rp ${parseInt(selectedRisk.controlCost).toLocaleString('id-ID')}` : '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
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

                {/* Kolom Kanan - Penilaian & Assessment */}
                <Grid item xs={12} md={6}>
                  {/* Penilaian Risiko Inheren - GUNAKAN FUNGSI BARU */}
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
                        {selectedRisk.initialProbability && selectedRisk.initialImpact && (
                          <Grid item xs={12}>
                            <Alert severity="info">
                              {(() => {
                                const inherentInfo = getInherentRiskLevelInfo(selectedRisk);
                                return (
                                  <Box>
                                    <strong>Risk Score: {inherentInfo.score}</strong> - 
                                    Level: {inherentInfo.level}
                                    {selectedRisk.scoreMethod && (
                                      <Typography variant="caption" display="block">
                                        Method: {selectedRisk.scoreMethod}
                                      </Typography>
                                    )}
                                  </Box>
                                );
                              })()}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Penilaian Risiko Residual - GUNAKAN FUNGSI BARU */}
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
                        {selectedRisk.residualProbability && selectedRisk.residualImpact && (
                          <Grid item xs={12}>
                            <Alert severity="info">
                              {(() => {
                                const residualInfo = getResidualRiskLevelInfo(selectedRisk);
                                return (
                                  <Box>
                                    <strong>Risk Score: {residualInfo.score}</strong> - 
                                    Level: {residualInfo.level}
                                    {selectedRisk.scoreMethod && (
                                      <Typography variant="caption" display="block">
                                        Method: {selectedRisk.scoreMethod}
                                      </Typography>
                                    )}
                                  </Box>
                                );
                              })()}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Assessment Data */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Analytics />
                        Assessment Data
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Likelihood</Typography>
                          <Typography variant="body1">{selectedRisk.likelihood || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Impact</Typography>
                          <Typography variant="body1">{selectedRisk.impact || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Inherent Score</Typography>
                          <Typography variant="body1">{selectedRisk.inherentScore || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Residual Score</Typography>
                          <Typography variant="body1">{selectedRisk.residualScore || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Treatment Priority</Typography>
                          <Typography variant="body1">{selectedRisk.treatmentPriority || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Assessment Notes</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.assessmentNotes || '-'}
                          </Typography>
                        </Grid>
                        {selectedRisk.assessedBy && (
                          <Grid item xs={12}>
                            <Alert severity="success">
                              Dinilai oleh: {selectedRisk.assessedBy} pada {selectedRisk.assessedAt ? new Date(selectedRisk.assessedAt.seconds * 1000).toLocaleDateString('id-ID') : '-'}
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