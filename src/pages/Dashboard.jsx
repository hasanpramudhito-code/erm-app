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
  UserCheck,
  Shield,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePeriode } from '../services/risiko';
import { useIdentitas } from '../services/identitas';


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

  const { periodeId } = usePeriode();
  const identitas = useIdentitas();

  useEffect(() => {
    if (!currentUser || !periodeId) return;
    setLoading(true);
    api.get(`/ringkasan/dashboard?periode_id=${periodeId}`)
      .then((d) => {
        const jumlah = (nama) => d.sebaran.find((x) => x.level === nama)?.jumlah || 0;
        setDashboardData({
          totalRisks: d.total_risiko,
          activeRTP: d.mitigasi_aktif,
          highRisks: d.risiko_tinggi,
          riskOwners: d.pemilik_risiko,
          // Kartu lama 4 kelompok: Ekstrim | Tinggi+Sangat Tinggi | Sedang | Rendah+Sangat Rendah.
          riskDistribution: {
            extreme: jumlah('Ekstrim'),
            high: jumlah('Tinggi') + jumlah('Sangat Tinggi'),
            medium: jumlah('Sedang'),
            low: jumlah('Rendah') + jumlah('Sangat Rendah'),
          },
          recentActivities: d.aktivitas.length ? d.aktivitas.map((a) => ({
            id: a.id,
            action: `${a.pengguna?.nama || 'Sistem'}: ${a.aksi.toLowerCase().replace(/_/g, ' ')} ${a.nama_tabel.replace(/_/g, ' ')}`,
            time: formatTimestamp(a.dibuat_pada),
            timestamp: new Date(a.dibuat_pada),
            status: 'completed',
          })) : [{ id: 'kosong', action: 'Belum ada aktivitas', time: '-', status: 'pending' }],
          systemStatus: 'normal',
        });
      })
      .catch(() => setDashboardData((prev) => ({
        ...prev,
        recentActivities: [{ action: 'Gagal memuat data', time: 'Baru saja', status: 'error', id: 'error' }],
        systemStatus: 'warning',
      })))
      .finally(() => setLoading(false));
  }, [currentUser?.id, periodeId]);

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
      title: 'Total Risiko',
      value: dashboardData.totalRisks.toString(),
      icon: <AlertTriangle size={24} />,
      color: 'error.main',
      description: 'Risiko pada periode berjalan'
    },
    {
      title: 'Mitigasi Aktif',
      value: dashboardData.activeRTP.toString(),
      icon: <Activity size={24} />,
      color: 'primary.main',
      description: 'Direncanakan, berjalan, atau terlambat'
    },
    {
      title: 'Risiko Tinggi',
      value: dashboardData.highRisks.toString(),
      icon: <FileText size={24} />,
      color: 'warning.main',
      description: 'Residual pada dua level teratas'
    },
    {
      title: 'Pimpinan Unit Kerja',
      value: dashboardData.riskOwners.toString(),
      icon: <Users size={24} />,
      color: 'success.main',
      description: 'Pemilik risiko di tingkat unit'
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
      description: 'Bagian, sub-bagian, Cabang, dan Unit',
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
      title: 'Kelola Pengguna',
      description: 'Tambah pengguna dan atur peran',
      icon: <Users size={24} />,
      path: '/organization?tab=users',
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
          {identitas.judul}
        </Typography>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Selamat datang kembali, <strong>{userData?.name || 'User'}!</strong>
        </Typography>
        <Chip
          label={(userData?.peran || []).join(' · ').replace(/_/g, ' ') || 'Pengguna'}
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