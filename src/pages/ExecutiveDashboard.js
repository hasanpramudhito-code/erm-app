import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning,
  CheckCircle,
  Schedule,
  Assignment,
  BarChart,
  Refresh,
  Add
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import CompositeScoreService from '../services/compositeScoreService';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

const ExecutiveDashboard = () => {
  const [risks, setRisks] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [compositeScore, setCompositeScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const { assessmentConfig, calculateScore, calculateRiskLevel } = useAssessmentConfig();
  
  // ✅ CREATE SAMPLE DATA UNTUK TESTING
  const createSampleData = async () => {
    try {
      console.log('🔄 Creating sample data for testing...');
      
      // Sample treatment plans
      const sampleTreatments = [
        {
          title: "Implementasi Kontrol Keamanan Data",
          description: "Peningkatan sistem keamanan data perusahaan",
          status: "completed",
          progress: 100,
          responsible: "IT Security Team",
          dueDate: new Date(),
          createdAt: new Date()
        },
        {
          title: "Pelatihan Risk Awareness",
          description: "Training untuk seluruh karyawan tentang manajemen risiko",
          status: "in_progress",
          progress: 65,
          responsible: "HR Department",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          createdAt: new Date()
        },
        {
          title: "Audit Internal Q3",
          description: "Audit internal triwulan ketiga",
          status: "planned",
          progress: 0,
          responsible: "Internal Audit",
          dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        },
        {
          title: "Pemeliharaan Server",
          description: "Maintenance rutin server utama",
          status: "delayed",
          progress: 30,
          responsible: "IT Infrastructure",
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Overdue
          createdAt: new Date()
        }
      ];

      // Sample incidents
      const sampleIncidents = [
        {
          title: "Data Breach Attempt",
          description: "Percobaan pembobolan data karyawan",
          severity: "critical",
          status: "resolved",
          incidentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          resolvedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        },
        {
          title: "Server Downtime",
          description: "Server utama down selama 2 jam",
          severity: "high",
          status: "resolved",
          incidentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          resolvedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        },
        {
          title: "Phishing Email Campaign",
          description: "Serangan phishing melalui email internal",
          severity: "medium",
          status: "in_progress",
          incidentDate: new Date(),
          createdAt: new Date()
        }
      ];

      // Add sample treatment plans to Firestore
      for (const treatment of sampleTreatments) {
        await addDoc(collection(db, 'treatment_plans'), treatment);
      }

      // Add sample incidents to Firestore
      for (const incident of sampleIncidents) {
        await addDoc(collection(db, 'incidents'), incident);
      }

      console.log('✅ Sample data created successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      return false;
    }
  };

  // ✅ CHECK IF DATA EXISTS, IF NOT CREATE SAMPLE DATA
  const checkAndCreateSampleData = async () => {
    try {
      // Check if treatment_plans collection has data
      const treatmentsSnapshot = await getDocs(collection(db, 'treatment_plans'));
      const incidentsSnapshot = await getDocs(collection(db, 'incidents'));
      
      if (treatmentsSnapshot.empty || incidentsSnapshot.empty) {
        console.log('📝 No data found, creating sample data...');
        const created = await createSampleData();
        if (created) {
          console.log('🔄 Sample data created, reloading...');
          await loadRealData(); // Reload data after creating samples
        }
      } else {
        console.log('✅ Data exists, loading real data...');
        await loadRealData();
      }
    } catch (error) {
      console.error('Error checking data:', error);
      // Fallback to loading whatever data exists
      await loadRealData();
    }
  };

  // ✅ LOAD REAL DATA FROM FIRESTORE
  const loadRealData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading real data from Firestore...');
      
      // Load risks
      const risksQuery = query(collection(db, 'risks'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = risksSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data()
      }));
      
      console.log('📊 Risks loaded:', risksList.length);

      // Standardize risks data
      const standardizedRisks = risksList.map(risk => {
        try {
          const likelihood = risk.likelihood || risk.initialProbability || risk.probability || 1;
          const impact = risk.impact || risk.initialImpact || 1;
          const inherentScore = risk.inherentScore || calculateScore(likelihood, impact);
          const riskLevel = calculateRiskLevel(inherentScore);
          
          return {
            ...risk,
            likelihood: Number(likelihood),
            impact: Number(impact),
            inherentScore: Number(inherentScore),
            riskLevel
          };
        } catch (error) {
          console.error('Error standardizing risk:', risk.id, error);
          return {
            ...risk,
            likelihood: 1,
            impact: 1,
            inherentScore: 1,
            riskLevel: calculateRiskLevel(1)
          };
        }
      });
      
      setRisks(standardizedRisks);

      // Load treatment plans - DIPERBAIKI: Handle berbagai collection names
      let treatmentPlansData = [];
      try {
        const plansQuery = query(collection(db, 'treatment_plans'));
        const plansSnapshot = await getDocs(plansQuery);
        treatmentPlansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📋 Treatment plans loaded:', treatmentPlansData.length);
      } catch (error) {
        console.error('Error loading treatment_plans:', error);
        // Coba collection name alternatif
        try {
          const plansQuery = query(collection(db, 'treatmentPlans'));
          const plansSnapshot = await getDocs(plansQuery);
          treatmentPlansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('📋 TreatmentPlans loaded:', treatmentPlansData.length);
        } catch (error2) {
          console.error('Error loading treatmentPlans:', error2);
        }
      }
      setTreatmentPlans(treatmentPlansData);

      // Load incidents - DIPERBAIKI: Handle berbagai collection names
      let incidentsData = [];
      try {
        const incidentsQuery = query(collection(db, 'incidents'));
        const incidentsSnapshot = await getDocs(incidentsQuery);
        incidentsData = incidentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('🚨 Incidents loaded:', incidentsData.length);
      } catch (error) {
        console.error('Error loading incidents:', error);
      }
      setIncidents(incidentsData);

      // Load composite score
      try {
        const latestScore = await CompositeScoreService.manualCalculate();
        setCompositeScore(latestScore);
        const history = await CompositeScoreService.getScoreHistory();
        setScoreHistory(history);
      } catch (scoreError) {
        console.log('Composite score not available yet:', scoreError);
        setCompositeScore(null);
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      console.log('✅ Data loading completed');
    }
  };

  // ✅ REFRESH COMPOSITE SCORE
  const handleRefreshScore = async () => {
    try {
      setRefreshing(true);
      const newScore = await CompositeScoreService.manualCalculate();
      setCompositeScore(newScore);
      const history = await CompositeScoreService.getScoreHistory();
      setScoreHistory(history);
    } catch (error) {
      console.error('Error refreshing composite score:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAndCreateSampleData();
  }, []);

  // ✅ HITUNG STATISTIK DENGAN DATA REAL
  const calculateStats = () => {
    const totalRisks = risks.length;
    
    // Hitung risks by level
    const extremeRisks = risks.filter(risk => 
      risk.riskLevel?.level === 'Extreme' || risk.riskLevel?.level === 'Ekstrim'
    ).length;

    const highRisks = risks.filter(risk => 
      risk.riskLevel?.level === 'High' || risk.riskLevel?.level === 'Tinggi'
    ).length;

    const mediumRisks = risks.filter(risk => 
      risk.riskLevel?.level === 'Medium' || risk.riskLevel?.level === 'Sedang'
    ).length;

    const lowRisks = risks.filter(risk => 
      risk.riskLevel?.level === 'Low' || risk.riskLevel?.level === 'Rendah' || 
      risk.riskLevel?.level === 'Very Low' || risk.riskLevel?.level === 'Sangat Rendah'
    ).length;

    // Treatment stats - DIPERBAIKI: Handle berbagai format status
    const totalTreatments = treatmentPlans.length;
    const completedTreatments = treatmentPlans.filter(p => 
      p.status?.toLowerCase().includes('completed') || 
      p.status?.toLowerCase().includes('selesai') ||
      p.status === 'completed' ||
      p.status === 'Done'
    ).length;

    const inProgressTreatments = treatmentPlans.filter(p => 
      p.status?.toLowerCase().includes('progress') || 
      p.status?.toLowerCase().includes('dalam') ||
      p.status === 'in_progress' ||
      p.status === 'In Progress'
    ).length;

    const delayedTreatments = treatmentPlans.filter(p => 
      p.status?.toLowerCase().includes('delayed') || 
      p.status?.toLowerCase().includes('tertunda') ||
      p.status === 'delayed'
    ).length;

    const plannedTreatments = treatmentPlans.filter(p => 
      p.status?.toLowerCase().includes('planned') || 
      p.status?.toLowerCase().includes('rencana') ||
      p.status === 'planned'
    ).length;

    const avgProgress = treatmentPlans.length > 0 
      ? treatmentPlans.reduce((sum, plan) => sum + (Number(plan.progress) || 0), 0) / treatmentPlans.length 
      : 0;

    // Incident statistics - DIPERBAIKI: Handle berbagai format
    const totalIncidents = incidents.length;
    const criticalIncidents = incidents.filter(incident => 
      incident.severity?.toLowerCase().includes('critical') || 
      incident.severity?.toLowerCase().includes('kritis') ||
      incident.severity === 'critical'
    ).length;

    const resolvedIncidents = incidents.filter(incident => 
      incident.status?.toLowerCase().includes('resolved') || 
      incident.status?.toLowerCase().includes('selesai') ||
      incident.status?.toLowerCase().includes('closed') ||
      incident.status === 'resolved'
    ).length;

    const stats = {
      totalRisks,
      extremeRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      totalTreatments,
      completedTreatments,
      inProgressTreatments,
      delayedTreatments,
      plannedTreatments,
      avgProgress: Math.round(avgProgress),
      totalIncidents,
      criticalIncidents,
      resolvedIncidents
    };

    console.log('📈 Final stats:', stats);
    return stats;
  };

  // ✅ GET COMPOSITE SCORE COLOR
  const getCompositeScoreColor = (score) => {
    if (!score) return '#1976d2';
    if (score >= 80) return '#f44336';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#2196f3';
    return '#4caf50';
  };

  // ✅ GET COMPOSITE SCORE CHIP COLOR
  const getCompositeScoreChipColor = (score) => {
    if (!score) return 'default';
    if (score >= 80) return 'error';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'info';
    return 'success';
  };

  // ✅ GET TREND ICON
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingDown sx={{ color: 'success.main' }} />;
      case 'deteriorating': return <TrendingUp sx={{ color: 'error.main' }} />;
      default: return <TrendingFlat sx={{ color: 'warning.main' }} />;
    }
  };

  // ✅ GET TOP 10 RISKS
  const getTopRisks = () => {
    return risks
      .map(risk => ({
        ...risk,
        riskScore: risk.inherentScore || 1,
        riskLevel: risk.riskLevel || calculateRiskLevel(risk.inherentScore || 1)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  };

  // ✅ GENERATE RISK MATRIX
  const getRiskMatrix = () => {
    const matrix = {
      extreme: [],
      high: [],
      medium: [],
      low: []
    };

    risks.forEach(risk => {
      const level = risk.riskLevel?.level;
      const score = risk.inherentScore || 1;
      
      if (level === 'Extreme' || level === 'Ekstrim' || score >= 20) {
        matrix.extreme.push(risk);
      } else if (level === 'High' || level === 'Tinggi' || score >= 16) {
        matrix.high.push(risk);
      } else if (level === 'Medium' || level === 'Sedang' || score >= 10) {
        matrix.medium.push(risk);
      } else {
        matrix.low.push(risk);
      }
    });

    return matrix;
  };

  // Get treatment status distribution
  const getTreatmentStatus = () => {
    const status = {
      completed: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('completed') || 
        p.status === 'completed' ||
        p.status === 'Done'
      ).length,
      in_progress: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('progress') || 
        p.status === 'in_progress' ||
        p.status === 'In Progress'
      ).length,
      planned: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('planned') || 
        p.status === 'planned'
      ).length,
      delayed: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('delayed') || 
        p.status === 'delayed'
      ).length,
      cancelled: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('cancelled') || 
        p.status === 'cancelled'
      ).length
    };
    return status;
  };

  // Statistik akan otomatis konsisten dengan RiskRegister
  const stats = calculateStats();
  const topRisks = getTopRisks();
  const riskMatrix = getRiskMatrix();
  const treatmentStatus = getTreatmentStatus();

  // ✅ RELOAD DATA FUNCTION
  const handleReloadData = () => {
    loadRealData();
  };

  // ✅ CREATE SAMPLE DATA MANUALLY
  const handleCreateSampleData = async () => {
    const created = await createSampleData();
    if (created) {
      await loadRealData();
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Executive Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header dengan reload button */}
      <Card sx={{ mb: 3, boxShadow: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Executive Dashboard
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Real-time Enterprise Risk Management Overview
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Data terkini dari Risk Register, Treatment Plans, dan Incident Reports
                <br />
                <strong>Total Risks: {stats.totalRisks} | Treatments: {stats.totalTreatments} | Incidents: {stats.totalIncidents}</strong>
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleCreateSampleData}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Create Sample Data
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReloadData}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Reload Data
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Data Status Alert */}
      {stats.totalRisks === 0 && stats.totalTreatments === 0 && stats.totalIncidents === 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleCreateSampleData}>
              Create Sample Data
            </Button>
          }
        >
          <strong>No data found!</strong> Click "Create Sample Data" to populate the dashboard with sample data for testing.
        </Alert>
      )}

      {/* Sisanya sama dengan kode sebelumnya... */}
      {/* Composite Score Section */}
      {compositeScore && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ boxShadow: 3, background: 'linear-gradient(135deg, #0c1bf067 0%, #b2b2d3ff 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      🎯 Composite Risk Score
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Overall Risk Health Indicator
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={handleRefreshScore}
                    disabled={refreshing}
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    {refreshing ? 'Recalculating...' : 'Refresh Score'}
                  </Button>
                </Box>
                
                <Box display="flex" alignItems="center" gap={4} sx={{ mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h1" fontWeight="bold">
                      {compositeScore.score}
                    </Typography>
                    <Typography variant="h6">/ 100</Typography>
                  </Box>

                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip 
                        label={compositeScore.risk_level} 
                        color={getCompositeScoreChipColor(compositeScore.score)}
                        sx={{ color: 'white', fontWeight: 'bold' }}
                      />
                      {getTrendIcon(compositeScore.trend)}
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Trend: {compositeScore.trend}
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      {compositeScore.components && Object.entries(compositeScore.components).map(([component, score]) => (
                        <Grid item xs={6} key={component}>
                          <Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {component.replace('_', ' ').toUpperCase()}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={score}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getCompositeScoreColor(score)
                                }
                              }}
                            />
                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                              {score}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Score History
                </Typography>
                {scoreHistory.length === 0 ? (
                  <Alert severity="info">
                    No historical data available yet.
                  </Alert>
                ) : (
                  <Box>
                    {scoreHistory.slice(0, 4).map((score, index) => (
                      <Box key={score.id} sx={{ mb: 2, p: 1, borderLeft: `4px solid` }} style={{ 
                        borderLeftColor: getCompositeScoreColor(score.score)
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight="bold">
                            {score.score}
                          </Typography>
                          <Chip 
                            label={score.risk_level} 
                            size="small"
                            color={getCompositeScoreChipColor(score.score)}
                          />
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {score.calculated_at?.toDate?.().toLocaleDateString('id-ID') || 'Unknown date'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: '#7b1fa2', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" style={{ color: '#7b1fa2' }}>
                {stats.extremeRisks}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Extreme Risks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {stats.totalTreatments}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Treatment Plans
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.completedTreatments} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="info.main">
                {stats.avgProgress}%
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Avg Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="warning.main">
                {stats.criticalIncidents}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Critical Incidents
              </Typography>
              <Typography variant="body2" color="textSecondary">
                dari {stats.totalIncidents} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Heatmap & Top Risks */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Risk Heatmap
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 2 }}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#7b1fa2', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.extreme.length}</Typography>
                  <Typography variant="body2">Extreme</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#d32f2f', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.high.length}</Typography>
                  <Typography variant="body2">High</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.medium.length}</Typography>
                  <Typography variant="body2">Medium</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.low.length}</Typography>
                  <Typography variant="body2">Low</Typography>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Top 10 Risks
              </Typography>
              {topRisks.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No risks found. Add risks to the Risk Register.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell><strong>Risk Description</strong></TableCell>
                        <TableCell align="center"><strong>Score</strong></TableCell>
                        <TableCell align="center"><strong>Level</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topRisks.map((risk) => (
                        <TableRow key={risk.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {risk.title || risk.riskDescription || risk.description || 'No description'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {risk.riskScore}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={risk.riskLevel?.level || 'Unknown'} 
                              color={risk.riskLevel?.color || 'default'} 
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Treatment Progress Summary & Incident Summary */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Treatment Progress Summary
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Status Distribution</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light', color: 'white' }}>
                      <CheckCircle sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.completed}</Typography>
                      <Typography variant="body2">Completed</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'primary.light', color: 'white' }}>
                      <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.in_progress}</Typography>
                      <Typography variant="body2">In Progress</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'warning.light', color: 'white' }}>
                      <Schedule sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.planned}</Typography>
                      <Typography variant="body2">Planned</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.light', color: 'white' }}>
                      <Warning sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.delayed}</Typography>
                      <Typography variant="body2">Delayed</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.500', color: 'white' }}>
                      <Assignment sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{stats.totalTreatments}</Typography>
                      <Typography variant="body2">Total</Typography>
                    </Paper>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Overall Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={stats.avgProgress} 
                    size={120}
                    thickness={4}
                    color={stats.avgProgress >= 80 ? "success" : stats.avgProgress >= 50 ? "primary" : "warning"}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {stats.avgProgress}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
                Average completion rate across all treatment plans
              </Typography>
              
              {/* Incident Summary */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Incident Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Total Incidents:</Typography>
                  <Typography variant="body2" fontWeight="bold">{stats.totalIncidents}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Critical:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">{stats.criticalIncidents}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Resolved:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">{stats.resolvedIncidents}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;