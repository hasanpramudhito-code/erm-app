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
  Button
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
  Refresh
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import CompositeScoreService from '../services/compositeScoreService'; // ✅ IMPORT COMPOSITE SCORE

// ✅ CUSTOM PROGRESS BAR UNTUK GANTI LINEARPROGRESS
const CustomProgressBar = ({ value = 0, color = '#1976d2', height = 8 }) => {
  return (
    <div style={{
      width: '100%',
      height: height,
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      overflow: 'hidden',
      margin: '4px 0'
    }}>
      <div style={{
        width: `${value}%`,
        height: '100%',
        backgroundColor: color,
        borderRadius: '4px',
        transition: 'width 0.3s ease'
      }} />
    </div>
  );
};

const ExecutiveDashboard = () => {
  const [risks, setRisks] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [compositeScore, setCompositeScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('overview');

  // ✅ LOAD ALL DATA INCLUDING COMPOSITE SCORE
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load risks dari Risk Register
      const risksQuery = query(collection(db, 'risks'), orderBy('createdAt', 'desc'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        risksList.push({ id: doc.id, ...doc.data() });
      });
      setRisks(risksList);

      // Load treatment plans
      const plansQuery = query(collection(db, 'treatment_plans'), orderBy('createdAt', 'desc'));
      const plansSnapshot = await getDocs(plansQuery);
      const plansList = [];
      plansSnapshot.forEach((doc) => {
        plansList.push({ id: doc.id, ...doc.data() });
      });
      setTreatmentPlans(plansList);

      // Load incidents
      const incidentsQuery = query(collection(db, 'incidents'), orderBy('incidentDate', 'desc'));
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidentsList = [];
      incidentsSnapshot.forEach((doc) => {
        incidentsList.push({ id: doc.id, ...doc.data() });
      });
      setIncidents(incidentsList);

      // ✅ LOAD COMPOSITE RISK SCORE
      try {
        const latestScore = await CompositeScoreService.manualCalculate();
        setCompositeScore(latestScore);
        
        const history = await CompositeScoreService.getScoreHistory();
        setScoreHistory(history);
      } catch (scoreError) {
        console.log('Composite score not available yet:', scoreError);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
    loadData();
  }, []);

  // Calculate REAL risk statistics
  const calculateStats = () => {
    const totalRisks = risks.length;
    
    // Hitung risks by level berdasarkan likelihood & impact
    const highRisks = risks.filter(risk => {
      const score = (risk.likelihood * risk.impact) || 1;
      return score >= 16; // High & Extreme
    }).length;

    const totalTreatments = treatmentPlans.length;
    const completedTreatments = treatmentPlans.filter(p => p.status === 'completed').length;
    const inProgressTreatments = treatmentPlans.filter(p => p.status === 'in_progress').length;
    const delayedTreatments = treatmentPlans.filter(p => p.status === 'delayed').length;

    const avgProgress = treatmentPlans.length > 0 
      ? treatmentPlans.reduce((sum, plan) => sum + (plan.progress || 0), 0) / treatmentPlans.length 
      : 0;

    // Incident statistics
    const totalIncidents = incidents.length;
    const criticalIncidents = incidents.filter(incident => incident.severity === 'critical').length;
    const resolvedIncidents = incidents.filter(incident => 
      incident.status === 'resolved' || incident.status === 'closed'
    ).length;

    return {
      totalRisks,
      highRisks,
      totalTreatments,
      completedTreatments,
      inProgressTreatments,
      delayedTreatments,
      avgProgress: Math.round(avgProgress),
      totalIncidents,
      criticalIncidents,
      resolvedIncidents
    };
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

  // Get top 10 risks by REAL score
  const getTopRisks = () => {
    return risks
      .map(risk => ({
        ...risk,
        riskScore: (risk.likelihood * risk.impact) || 1,
        riskLevel: getRiskLevel(risk.likelihood, risk.impact)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  };

  // Calculate risk level berdasarkan likelihood & impact
  const getRiskLevel = (likelihood, impact) => {
    const score = (likelihood * impact) || 1;
    if (score >= 20) return { level: 'Extreme', color: 'error' };
    if (score >= 16) return { level: 'High', color: 'warning' };
    if (score >= 10) return { level: 'Medium', color: 'info' };
    return { level: 'Low', color: 'success' };
  };

  // Generate REAL risk matrix data
  const getRiskMatrix = () => {
    const matrix = {
      extreme: [],
      high: [],
      medium: [],
      low: []
    };

    risks.forEach(risk => {
      const score = (risk.likelihood * risk.impact) || 1;
      if (score >= 20) matrix.extreme.push(risk);
      else if (score >= 16) matrix.high.push(risk);
      else if (score >= 10) matrix.medium.push(risk);
      else matrix.low.push(risk);
    });

    return matrix;
  };

  // Get REAL risk distribution by category
  const getRiskDistribution = () => {
    const distribution = {};
    risks.forEach(risk => {
      const category = risk.classification || 'Uncategorized';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  };

  // Get treatment status distribution
  const getTreatmentStatus = () => {
    const status = {
      completed: treatmentPlans.filter(p => p.status === 'completed').length,
      in_progress: treatmentPlans.filter(p => p.status === 'in_progress').length,
      planned: treatmentPlans.filter(p => p.status === 'planned').length,
      delayed: treatmentPlans.filter(p => p.status === 'delayed').length,
      cancelled: treatmentPlans.filter(p => p.status === 'cancelled').length
    };
    return status;
  };

  // ✅ FIX: Handle date formatting for score history
  const formatScoreDate = (calculatedAt) => {
    if (!calculatedAt) return 'Unknown date';
    
    try {
      // Jika Firestore Timestamp (memiliki method toDate)
      if (calculatedAt && typeof calculatedAt.toDate === 'function') {
        return calculatedAt.toDate().toLocaleDateString();
      }
      // Jika sudah berupa Date object
      if (calculatedAt instanceof Date) {
        return calculatedAt.toLocaleDateString();
      }
      // Jika string ISO format
      if (typeof calculatedAt === 'string') {
        return new Date(calculatedAt).toLocaleDateString();
      }
      // Jika object dengan seconds (Firestore format)
      if (calculatedAt.seconds) {
        return new Date(calculatedAt.seconds * 1000).toLocaleDateString();
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  const stats = calculateStats();
  const topRisks = getTopRisks();
  const riskMatrix = getRiskMatrix();
  const riskDistribution = getRiskDistribution();
  const treatmentStatus = getTreatmentStatus();

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
      {/* Header */}
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
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                '& .MuiToggleButton-root': {
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }
                }
              }}
            >
              <ToggleButton value="overview">
                <BarChart sx={{ mr: 1 }} />
                Overview
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>

      {/* ✅ COMPOSITE RISK SCORE SECTION */}
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
                      Overall Risk Health Indicator - SK-7 Compliance
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
                  {/* Main Score */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h1" fontWeight="bold">
                      {compositeScore.score}
                    </Typography>
                    <Typography variant="h6">/ 100</Typography>
                  </Box>

                  {/* Score Details */}
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

                    {/* Component Scores - MENGGUNAKAN CUSTOM PROGRESS BAR */}
                    <Grid container spacing={2}>
                      {compositeScore.components && Object.entries(compositeScore.components).map(([component, score]) => (
                        <Grid item xs={6} key={component}>
                          <Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {component.replace('_', ' ').toUpperCase()}
                            </Typography>
                            {/* ✅ MENGGUNAKAN CUSTOM PROGRESS BAR */}
                            <CustomProgressBar 
                              value={score}
                              color={getCompositeScoreColor(score)}
                              height={8}
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

          {/* Score History */}
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
                          {formatScoreDate(score.calculated_at)}
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

      {/* Key Metrics - REAL DATA */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="error.main">
                {stats.highRisks}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                High & Extreme Risks
              </Typography>
              <Typography variant="body2" color="textSecondary">
                dari {stats.totalRisks} total risks
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
              <Typography variant="body2" color="textSecondary">
                Treatment completion
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

      {/* Risk Heatmap & Top Risks - REAL DATA */}
      <Grid container spacing={3}>
        {/* Risk Heatmap */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Risk Heatmap - Real Data
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 2 }}>
                {/* Extreme Risks */}
                <Paper 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: 'error.main',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <Typography variant="h4">{riskMatrix.extreme.length}</Typography>
                  <Typography variant="body2">Extreme</Typography>
                </Paper>

                {/* High Risks */}
                <Paper 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: 'warning.main',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <Typography variant="h4">{riskMatrix.high.length}</Typography>
                  <Typography variant="body2">High</Typography>
                </Paper>

                {/* Medium Risks */}
                <Paper 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: 'info.main',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <Typography variant="h4">{riskMatrix.medium.length}</Typography>
                  <Typography variant="body2">Medium</Typography>
                </Paper>

                {/* Low Risks */}
                <Paper 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: 'success.main',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <Typography variant="h4">{riskMatrix.low.length}</Typography>
                  <Typography variant="body2">Low</Typography>
                </Paper>
              </Box>

              {/* Risk Distribution - MENGGUNAKAN CUSTOM PROGRESS BAR */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Distribution by Category
                </Typography>
                {Object.entries(riskDistribution).map(([category, count]) => (
                  <Box key={category} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{category}</Typography>
                      <Typography variant="body2" fontWeight="bold">{count}</Typography>
                    </Box>
                    {/* ✅ MENGGUNAKAN CUSTOM PROGRESS BAR */}
                    <CustomProgressBar 
                      value={(count / stats.totalRisks) * 100}
                      color="#1976d2"
                      height={8}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top 10 Risks - REAL DATA */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Top 10 Risks - Priority Watchlist
              </Typography>
              
              {topRisks.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No risks identified in Risk Register.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell>Risk Description</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell align="center">Level</TableCell>
                        <TableCell align="center">Owner</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topRisks.map((risk) => {
                        const riskLevel = getRiskLevel(risk.likelihood, risk.impact);
                        
                        return (
                          <TableRow key={risk.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {risk.title || risk.riskDescription}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight="bold">
                                {risk.riskScore}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={riskLevel.level} 
                                color={riskLevel.color} 
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="caption">
                                {risk.riskOwner || '-'}
                              </Typography>
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
        </Grid>
      </Grid>

      {/* Treatment Progress Summary - REAL DATA */}
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