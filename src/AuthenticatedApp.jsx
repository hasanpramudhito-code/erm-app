import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import AppLayout from './components/AppLayout';
import { EXECUTIVE_PAGE_ROLES } from './config/securityConfig';


import { AssessmentConfigProvider } from './contexts/AssessmentConfigContext';

/* PAGES - LAZY LOADED */
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const KRIMonitoring = lazy(() => import('./pages/KRIMonitoring'));
const Organization = lazy(() => import('./pages/Organization'));
const DashboardKorporat = lazy(() => import('./pages/DashboardKorporat'));
const RisikoUtama = lazy(() => import('./pages/RisikoUtama'));
const Pemantauan = lazy(() => import('./pages/Pemantauan'));
const RiskRegister = lazy(() => import('./pages/RiskRegister'));
const RiskAssessment = lazy(() => import('./pages/RiskAssessment'));
const RiskTreatmentPlans = lazy(() => import('./pages/RiskTreatmentPlans'));
const RiskCulture = lazy(() => import('./pages/RiskCulture'));
const IncidentReporting = lazy(() => import('./pages/IncidentReporting'));
const Reporting = lazy(() => import('./pages/Reporting'));

const RiskAppetiteDashboard = lazy(() => import('./pages/RiskAppetite/RiskAppetiteDashboard'));
const ControlTesting = lazy(() => import('./pages/ControlTesting'));
const AntreanVerifikasi = lazy(() => import('./pages/AntreanVerifikasi'));
const RACIChart = lazy(() => import('./components/RACIChart'));

function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );
}

export default function AuthenticatedApp() {
  return (
    <ProtectedRoute>

      <AssessmentConfigProvider>
        <>

          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>

                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/executive-dashboard" element={
                  <RoleProtectedRoute allowedRoles={EXECUTIVE_PAGE_ROLES}>
                    <ExecutiveDashboard />
                  </RoleProtectedRoute>
                } />
                <Route path="/dashboard-korporat" element={
                  <RoleProtectedRoute allowedRoles={EXECUTIVE_PAGE_ROLES}>
                    <DashboardKorporat />
                  </RoleProtectedRoute>
                } />
                <Route path="/kri-monitoring" element={<KRIMonitoring />} />

                <Route path="/organization" element={<Organization />} />
                <Route path="/organization-structure" element={<Navigate to="/organization?tab=structure" replace />} />

                <Route path="/user-management" element={<Navigate to="/organization?tab=users" replace />} />

                <Route path="/risk-register" element={<RiskRegister />} />
                <Route path="/risiko-utama" element={<RisikoUtama />} />
                <Route path="/risk-assessment" element={<RiskAssessment />} />
                <Route path="/pemantauan" element={<Pemantauan />} />
                <Route path="/pemantauan-bulanan" element={<Navigate to="/pemantauan" replace />} />
                <Route path="/treatment-plans" element={<RiskTreatmentPlans />} />

                <Route path="/risk-culture" element={<RiskCulture />} />
                <Route path="/incident-reporting" element={<IncidentReporting />} />
                <Route path="/reporting" element={<Reporting />} />


                <Route path="/risk-parameters" element={<Navigate to="/organization?tab=risk-params" replace />} />

                <Route path="/risk-appetite" element={<RiskAppetiteDashboard />} />
                <Route path="/kri-settings" element={<Navigate to="/kri-monitoring" replace />} />
                <Route path="/risk-tolerance" element={<Navigate to="/risk-appetite?tab=pengaturan" replace />} />

                <Route path="/control-testing" element={<ControlTesting />} />
                {/* Alamat lama tetap berfungsi. */}
                <Route path="/control-register" element={<Navigate to="/control-testing?tab=register" replace />} />
                <Route path="/testing-schedule" element={<Navigate to="/control-testing?tab=jadwal" replace />} />
                <Route path="/test-results" element={<Navigate to="/control-testing?tab=hasil" replace />} />
                <Route path="/deficiency-tracking" element={<Navigate to="/control-testing?tab=defisiensi" replace />} />

                <Route path="/approval" element={<AntreanVerifikasi />} />
                <Route path="/raci-chart" element={<RACIChart />} />

              </Routes>
            </Suspense>
          </AppLayout>

        </>
      </AssessmentConfigProvider>

    </ProtectedRoute>
  );
}
