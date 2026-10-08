import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  AlertTriangle,
  Activity,
  FileText,
  Users,
  GitMerge as AccountTree,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  Brain,
  Database,
  Webhook,
  UserCheck,
  Shield,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { fetchRisks } from '../services/riskService';

// Hapus fetchRisks top-level
// const risks = await fetchRisks();

const Dashboard = () => {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalRisks: 0,
    activeRTP: 0,
    highRisks: 0,
    riskOwners: 0,
    riskDistribution: {
      extreme: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    recentActivities: [],
    systemStatus: 'normal'
  });

  // Di React component, coba akses collection 'test'
  useEffect(() => {

    const testFirestoreAccess = async () => {
      if (!currentUser) {
        return;
      }


      try {
        // Coba baca collection 'users' (atau collection lain yang ada)
        const snapshot = await getDocs(collection(db, "users"));


        // Tampilkan data dokumen (jika ada)
        if (snapshot.docs.length > 0) {
        }

      } catch (error) {

        // Analisis error
        if (error.code === 'permission-denied') {
        }
      }
    };

    testFirestoreAccess();

  }, [currentUser]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 1. Total Risks Count (Tetap sama dengan error handling)
        let totalRisks = 0;
        try {
          const risksQuery = query(collection(db, 'risks'));
          const risksSnapshot = await getDocs(risksQuery);
          totalRisks = risksSnapshot.size;
        } catch (err) {
          console.warn("Failed to fetch total risks count:", err);
        }

        // 2. Active RTP Count - DIPERBAIKI: ganti nama koleksi sesuai dengan halaman RTP
        let activeRTP = 0;
        try {
          // Mencoba berbagai nama koleksi yang mungkin
          const possibleCollections = [
            'treatment_plans',  // ← INI YANG DIPAKAI DI HALAMAN RTP
            'risk_treatment_plans',
            'rtp',
            'risk_treatments'
          ];

          for (const collectionName of possibleCollections) {
            try {
              // Debug: Cek koleksi
              const testCollection = collection(db, collectionName);
              const testSnapshot = await getDocs(testCollection);


              if (testSnapshot.size > 0) {
                // Coba query dengan berbagai status
                const statusOptions = ['in_progress', 'In Progress', 'active', 'Active', 'ACTIVE', 'aktif'];

                for (const statusOption of statusOptions) {
                  try {
                    const rtpQuery = query(
                      collection(db, collectionName),
                      where('status', '==', statusOption)
                    );
                    const rtpSnapshot = await getDocs(rtpQuery);
                    const count = rtpSnapshot.size;

                    if (count > 0) {
                      activeRTP += count;
                    }
                  } catch (queryError) {
                    // Skip query error
                  }
                }

                // Jika masih 0, hitung manual
                if (activeRTP === 0) {
                  const allRtpData = testSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));

                  // Cari yang statusnya aktif/progress (case insensitive)
                  const activeCount = allRtpData.filter(rtp => {
                    const status = rtp.status?.toString().toLowerCase() || '';
                    return status.includes('progress') ||
                      status.includes('active') ||
                      status.includes('in progress') ||
                      status === 'in_progress';
                  }).length;

                  activeRTP += activeCount;
                }
              }
            } catch (collectionError) {
              // Collection tidak ada, lanjut ke yang berikutnya
              continue;
            }
          }


        } catch (rtpError) {
          activeRTP = 0;
        }
        // 3. High & Extreme Risks (MODIFIKASI: Ambil dari residualRiskLevel.level dengan error handling)
        let highRisks = 0;
        try {
          const highRisksQuery = query(
            collection(db, 'risks'),
            where('residualRiskLevel.level', 'in', ['Tinggi', 'Ekstrim', 'High', 'Extreme'])
          );
          const highRisksSnapshot = await getDocs(highRisksQuery);
          highRisks = highRisksSnapshot.size;
        } catch (err) {
          console.warn("Failed to fetch high risks count:", err);
        }

        // 4. Risk Owners (Tetap sama, tapi pastikan role di user benar dengan error handling)
        let riskOwners = 0;
        try {
          const ownersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'risk_owner')
          );
          const ownersSnapshot = await getDocs(ownersQuery);
          riskOwners = ownersSnapshot.size;
        } catch (err) {
          console.warn("Failed to fetch risk owners count:", err);
        }

        // 5. Risk Distribution (MODIFIKASI: Ambil dari residualRiskLevel.level dengan error handling)
        let riskDistribution = {
          extreme: 0,
          high: 0,
          medium: 0,
          low: 0
        };
        try {
          const extremeQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Ekstrim', 'Extreme']));
          const highQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Tinggi', 'High']));
          const mediumQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Sedang', 'Medium']));
          const lowQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Rendah', 'Sangat Rendah', 'Low', 'Very Low']));

          const [extremeSnap, highSnap, mediumSnap, lowSnap] = await Promise.all([
            getDocs(extremeQuery),
            getDocs(highQuery),
            getDocs(mediumQuery),
            getDocs(lowQuery)
          ]);

          riskDistribution = {
            extreme: extremeSnap.size,
            high: highSnap.size,
            medium: mediumSnap.size,
            low: lowSnap.size
          };
        } catch (err) {
          console.warn("Failed to fetch risk distribution:", err);
        }

        // 6. Recent Activities (from audit_logs or activities collection)
        const activitiesQuery = query(
          collection(db, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const recentActivities = activitiesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            time: formatTimestamp(data.timestamp), // Keep original time formatting
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : new Date()) // Add safe timestamp
          };
        });

        // Fallback activities if no activities found
        const fallbackActivities = [
          {
            action: 'Sistem ERM diinisialisasi',
            time: 'Baru saja',
            status: 'completed',
            id: '1'
          },
          {
            action: `User ${userData?.name || 'admin'} berhasil login`,
            time: '2 menit lalu',
            status: 'completed',
            id: '2'
          },
          {
            action: totalRisks > 0 ? `${totalRisks} risiko teridentifikasi` : 'Belum ada risiko teridentifikasi',
            time: 'Sistem',
            status: totalRisks > 0 ? 'completed' : 'pending',
            id: '3'
          },
        ];

        setDashboardData({
          totalRisks,
          activeRTP,
          highRisks,
          riskOwners,
          riskDistribution,
          recentActivities: recentActivities.length > 0 ? recentActivities : fallbackActivities,
          systemStatus: 'normal'
        });

      } catch (error) {
        // Set fallback data on error
        setDashboardData(prev => ({
          ...prev,
          recentActivities: [
            { action: 'Error loading data', time: 'Just now', status: 'error', id: 'error' },
            { action: 'Sistem tetap berjalan', time: 'Sistem', status: 'completed', id: 'system' }
          ],
          systemStatus: 'warning'
        }));
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, userData]);

  // Format timestamp to relative time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const time = timestamp?.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp?.seconds ? timestamp.seconds * 1000 : timestamp) || new Date());
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam lalu`;
    return `${Math.floor(diffInMinutes / 1440)} hari lalu`;
  };

  // Statistics data - NOW USING REAL DATA
  const stats = [
    {
      title: 'Total Risks',
      value: dashboardData.totalRisks.toString(),
      icon: <AlertTriangle size={24} />,
      color: 'error.main',
      description: 'Risiko teridentifikasi'
    },
    {
      title: 'Active RTP',
      value: dashboardData.activeRTP.toString(),
      icon: <Activity size={24} />,
      color: 'primary.main',
      description: 'Risk Treatment Plan aktif'
    },
    {
      title: 'High Risks',
      value: dashboardData.highRisks.toString(),
      icon: <FileText size={24} />,
      color: 'warning.main',
      description: 'Risiko tingkat tinggi/extreme'
    },
    {
      title: 'Risk Owners',
      value: dashboardData.riskOwners.toString(),
      icon: <Users size={24} />,
      color: 'success.main',
      description: 'Pemilik risiko aktif'
    },
  ];

  // Risk status summary - USING REAL DISTRIBUTION
  const riskStatus = [
    { status: 'Extreme', count: dashboardData.riskDistribution.extreme, color: '#d32f2f' },
    { status: 'High', count: dashboardData.riskDistribution.high, color: '#f57c00' },
    { status: 'Medium', count: dashboardData.riskDistribution.medium, color: '#fbc02d' },
    { status: 'Low', count: dashboardData.riskDistribution.low, color: '#388e3c' },
  ];

  // Quick actions
  const canManageUsers = userData?.role === 'ADMIN';

  const quickActions = [
    {
      title: 'Kelola Struktur Organisasi',
      description: 'Buat unit, sub-unit, dan proses bisnis',
      icon: <AccountTree size={24} />,
      path: '/organization',
      color: 'primary.main'
    },
    {
      title: 'Monitoring KRI',
      description: 'Key Risk Indicators',
      icon: <TrendingUp size={24} />,
      path: '/kri-monitoring',
      color: 'success.main'
    },
    ...(canManageUsers ? [{
      title: 'Kelola Users',
      description: 'Management user dan hak akses',
      icon: <Users size={24} />,
      path: '/user-management',
      color: 'secondary.main'
    }] : []),
    {
      title: 'Lihat Risk Register',
      description: 'Daftar semua risiko',
      icon: <FileText size={24} />,
      path: '/risk-register',
      color: 'warning.main'
    },
    {
      title: 'Risk Assessment',
      description: 'Analisis dan heatmap risiko',
      icon: <BarChart3 size={24} />,
      path: '/risk-assessment',
      color: 'info.main'
    },
    {
      title: 'Risk Culture Assessment',
      description: 'Measure organizational risk culture maturity',
      icon: <Brain size={24} />,
      path: '/risk-culture',
      color: 'secondary.main'
    },
    {
      title: 'Database Management',
      description: 'Backup, restore, and migrate database',
      icon: <Database size={24} />,
      path: '/database-management',
      color: 'text.secondary'
    },
    {
      title: 'API Integration',
      description: 'Connect with external systems',
      icon: <Webhook size={24} />,
      path: '/api-integration',
      color: 'secondary.light'
    },
    {
      title: 'RACI Chart',
      description: 'Responsibility Assignment Matrix',
      icon: <UserCheck size={24} />,
      path: '/raci-chart',
      color: 'primary.dark'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={18} color="#2e7d32" />;
      case 'pending': return <Clock size={18} color="#ed6c02" />;
      case 'error': return <AlertCircle size={18} color="#d32f2f" />;
      default: return <CheckCircle2 size={18} color="#2e7d32" />;
    }
  };

  const getSystemStatusColor = () => {
    switch (dashboardData.systemStatus) {
      case 'normal': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'success';
    }
  };

  const getSystemStatusMessage = () => {
    switch (dashboardData.systemStatus) {
      case 'normal': return 'Sistem ERM Berjalan Normal';
      case 'warning': return 'Sistem ERM Dalam Pengawasan';
      case 'error': return 'Sistem ERM Mengalami Gangguan';
      default: return 'Sistem ERM Berjalan Normal';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Memuat data dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          PT Solusi Kelola Risiko
        </Typography>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Selamat datang kembali, <strong>{userData?.name || 'User'}!</strong>
        </Typography>
        <Chip
          label={userData?.role || 'User'}
          color="primary"
          variant="outlined"
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2" fontWeight="medium">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold" color={stat.color}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stat.description}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      color: stat.color,
                      fontSize: 48,
                      opacity: 0.8
                    }}
                  >
                    {stat.icon}
                  </Box>

                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <Zap size={22} color="#1565c0" />
              <Typography variant="h6" fontWeight="bold">
                Quick Actions
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Akses cepat ke modul utama sistem
            </Typography>

            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} key={index}>
                  <Card
                    elevation={0}
                    sx={{
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        borderColor: action.color,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box sx={{ color: action.color, display: 'flex' }}>
                          {action.icon}
                        </Box>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="600" size="small">
                            {action.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {action.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Activities & Status */}
        <Grid item xs={12} md={6}>
          {/* Recent Activities */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <Activity size={22} color="#1565c0" />
              <Typography variant="h6" fontWeight="bold">
                Aktivitas Terbaru
              </Typography>
            </Box>
            <List dense>
              {dashboardData.recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id || index}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getStatusIcon(activity.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight="500">{activity.action}</Typography>}
                      secondary={activity.time}
                    />
                  </ListItem>
                  {index < dashboardData.recentActivities.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>

          {/* Risk Status Summary */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <TrendingUp size={22} color="#1565c0" />
              <Typography variant="h6" fontWeight="bold">
                Status Risiko
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Distribusi tingkat risiko
            </Typography>

            <Grid container spacing={2}>
              {riskStatus.map((risk, index) => (
                <Grid item xs={6} key={index}>
                  <Box
                    sx={{
                      p: 2.5,
                      backgroundColor: risk.color,
                      borderRadius: 2,
                      color: 'white',
                      textAlign: 'center',
                      opacity: risk.count > 0 ? 1 : 0.6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {risk.count}
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {risk.status}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* System Status Footer */}
      <Paper
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: dashboardData.systemStatus === 'normal' ? '#e8f5e8' :
            dashboardData.systemStatus === 'warning' ? '#fff3e0' : '#ffebee',
          border: dashboardData.systemStatus === 'normal' ? '1px solid #4caf50' :
            dashboardData.systemStatus === 'warning' ? '1px solid #ff9800' : '1px solid #f44336'
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {dashboardData.systemStatus === 'normal' ? '✅' :
                dashboardData.systemStatus === 'warning' ? '⚠️' : '❌'}
              {getSystemStatusMessage()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {dashboardData.totalRisks > 0 ?
                `${dashboardData.totalRisks} risiko terkelola dengan ${dashboardData.activeRTP} treatment plan aktif` :
                'Belum ada risiko teridentifikasi'}
            </Typography>
          </Box>
          <Chip
            label={dashboardData.systemStatus === 'normal' ? 'Online' :
              dashboardData.systemStatus === 'warning' ? 'Warning' : 'Error'}
            color={getSystemStatusColor()}
            variant="filled"
            size="small"
          />
        </Box>
      </Paper>

      {/* Getting Started Guide - Only show if no risks */}
      {dashboardData.totalRisks === 0 && (
        <Paper sx={{ mt: 3, p: 3, backgroundColor: '#fff3e0' }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🏁 Memulai ERM System
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                1. <strong>Setup Struktur Organisasi</strong> - Definisikan unit dan sub-unit
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                2. <strong>Kelola User</strong> - Tambah user dan assign role
              </Typography>
              <Typography variant="body2">
                3. <strong>Identifikasi Risiko</strong> - Mulai input risiko per unit
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                4. <strong>Assessment</strong> - Nilai likelihood dan impact
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                5. <strong>Treatment Plan</strong> - Buat rencana mitigasi
              </Typography>
              <Typography variant="body2">
                6. <strong>Monitoring</strong> - Pantau progress dan KRI
              </Typography>
            </Grid>
          </Grid>
          <Button
            variant="contained"
            startIcon={<AccountTree size={18} />}
            onClick={() => navigate('/organization')}
            sx={{ mt: 2 }}
          >
            Mulai dengan Struktur Organisasi
          </Button>
        </Paper>
      )}

    </Box>
  );
};

export default Dashboard;