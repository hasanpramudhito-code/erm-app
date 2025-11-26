// File: src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  CssBaseline, 
  Box, 
  Typography, 
  Button 
} from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import OrganizationStructure from './pages/OrganizationStructure';
import UserManagement from './pages/UserManagement';
import RiskRegister from './pages/RiskRegister';
import RiskAssessment from './pages/RiskAssessment';
import RiskTreatmentPlans from './pages/RiskTreatmentPlans';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import KRIMonitoring from './pages/KRIMonitoring';
import IncidentReporting from './pages/IncidentReporting';
import Reporting from './pages/Reporting';
import KRIMonitoringService from './services/kriMonitoringService';
import RiskCulture from './pages/RiskCulture';
import DatabaseManagement from './pages/DatabaseManagement';
import APIIntegration from './pages/APIIntegration';
import SettingsPanel from './pages/SettingsPanel';
import RiskParameterSettings from './pages/RiskParameterSettings';
import RACIChart from './components/RACIChart';

const theme = createTheme({
  palette: {
    primary: { 
    main: '#2e7d32',    // ✅ HIJAU
    light: '#4caf50', 
    dark: '#1b5e20'
  },
    secondary: { 
    main: '#ff6f00',    // ✅ ORANGE
    light: '#ff9800',
    dark: '#e65100'
  },
    background: { 
      default: '#f5f5f5',
      paper: '#ffffff'
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  useEffect(() => {
    console.log('Starting KRI Monitoring Service...');
    KRIMonitoringService.startMonitoring();
    
    return () => {
      console.log('Stopping KRI Monitoring Service...');
      KRIMonitoringService.stopMonitoring();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <SettingsProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Routes with Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* EXECUTIVE DASHBOARD - Accessible by all roles */}
              <Route
                path="/executive-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Owner', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <ExecutiveDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* KRI MONITORING - Accessible by all roles */}
              <Route
                path="/kri-monitoring"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Owner', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <KRIMonitoring />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/organization"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer']}>
                    <Layout>
                      <OrganizationStructure />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* USER MANAGEMENT - Admin only */}
              <Route
                path="/user-management"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Layout>
                      <UserManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/risk-register"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Owner', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <RiskRegister />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/risk-assessment"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Owner', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <RiskAssessment />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route 
                path="/treatment-plans" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Owner', 'Risk Officer', 'Direksi']}>
                    <Layout>
                      <RiskTreatmentPlans />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* ✅ RISK PARAMETERS SETTINGS - Sesuaikan dengan role yang ada */}
              <Route
                path="/risk-parameters"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer', 'Direksi']}>
                    <Layout>
                      <RiskParameterSettings />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* SETTINGS - Admin & Risk Officer */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer']}>
                    <Layout>
                      <SettingsPanel />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/incident-reporting"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Owner', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <IncidentReporting />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reporting"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <Reporting />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/risk-culture"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer', 'Direksi', 'DK/Dewas']}>
                    <Layout>
                      <RiskCulture />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/database-management"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Layout>
                      <DatabaseManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/api-integration"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer']}>
                    <Layout>
                      <APIIntegration />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk-parameters"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Risk Officer', 'Direksi', 'Risk Owner']}> {/* ✅ TAMBAH Risk Owner */}
                    <Layout>
                      <RiskParameterSettings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/raci-chart" element={<RACIChart />} />

              {/* Catch all route - 404 */}
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Box 
                        display="flex" 
                        justifyContent="center" 
                        alignItems="center" 
                        height="80vh"
                        flexDirection="column"
                      >
                        <Typography variant="h4" color="textSecondary" gutterBottom>
                          404 - Page Not Found
                        </Typography>
                        <Button 
                          variant="contained" 
                          onClick={() => window.location.href = '/'}
                        >
                          Back to Dashboard
                        </Button>
                      </Box>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </SettingsProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;