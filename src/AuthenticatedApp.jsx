import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import AppLayout from './components/AppLayout';
import { ADMIN_PAGE_ROLES, EXECUTIVE_PAGE_ROLES } from './config/securityConfig';


import { AssessmentConfigProvider } from './contexts/AssessmentConfigContext';

/* PAGES - LAZY LOADED */
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const KRIMonitoring = lazy(() => import('./pages/KRIMonitoring'));
const Organization = lazy(() => import('./pages/Organization'));
const RisikoUtama = lazy(() => import('./pages/RisikoUtama'));
const PemantauanBulanan = lazy(() => import('./pages/PemantauanBulanan'));
const OrganizationStructure = lazy(() => import('./components/OrganizationStructure'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RiskRegister = lazy(() => import('./pages/RiskRegister'));
const RiskAssessment = lazy(() => import('./pages/RiskAssessment'));
const RiskTreatmentPlans = lazy(() => import('./pages/RiskTreatmentPlans'));
const RiskCulture = lazy(() => import('./pages/RiskCulture'));
const IncidentReporting = lazy(() => import('./pages/IncidentReporting'));
const Reporting = lazy(() => import('./pages/Reporting'));
const DatabaseManagement = lazy(() => import('./pages/DatabaseManagement'));
const APIIntegration = lazy(() => import('./pages/APIIntegration'));

const RiskParameterSettings = lazy(() => import('./pages/RiskParameterSettings'));
const RiskAppetiteDashboard = lazy(() => import('./pages/RiskAppetite/RiskAppetiteDashboard'));
const KRISettings = lazy(() => import('./pages/KRIMonitoring/KRISettings'));
const RiskToleranceSettings = lazy(() => import('./pages/RiskAppetite/RiskToleranceSettings'));
const ControlRegister = lazy(() => import('./pages/ControlTesting/ControlRegister'));
const TestingSchedule = lazy(() => import('./pages/ControlTesting/TestingSchedule'));
const TestResults = lazy(() => import('./pages/ControlTesting/TestResults'));
const DeficiencyTracking = lazy(() => import('./pages/ControlTesting/DeficiencyTracking'));
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
                <Route path="/kri-monitoring" element={<KRIMonitoring />} />

                <Route path="/organization" element={<Organization />} />
                <Route path="/organization-structure" element={<OrganizationStructure />} />

                <Route path="/user-management" element={
                  <RoleProtectedRoute allowedRoles={ADMIN_PAGE_ROLES}>
                    <UserManagement />
                  </RoleProtectedRoute>
                } />

                <Route path="/risk-register" element={<RiskRegister />} />
                <Route path="/risiko-utama" element={<RisikoUtama />} />
                <Route path="/risk-assessment" element={<RiskAssessment />} />
                <Route path="/pemantauan-bulanan" element={<PemantauanBulanan />} />
                <Route path="/treatment-plans" element={<RiskTreatmentPlans />} />

                <Route path="/risk-culture" element={<RiskCulture />} />
                <Route path="/incident-reporting" element={<IncidentReporting />} />
                <Route path="/reporting" element={<Reporting />} />

                <Route path="/database-management" element={
                  <RoleProtectedRoute allowedRoles={ADMIN_PAGE_ROLES}>
                    <DatabaseManagement />
                  </RoleProtectedRoute>
                } />
                <Route path="/api-integration" element={
                  <RoleProtectedRoute allowedRoles={ADMIN_PAGE_ROLES}>
                    <APIIntegration />
                  </RoleProtectedRoute>
                } />


                <Route path="/risk-parameters" element={<RiskParameterSettings />} />

                <Route path="/risk-appetite" element={<RiskAppetiteDashboard />} />
                <Route path="/kri-settings" element={<KRISettings />} />
                <Route path="/risk-tolerance" element={<RiskToleranceSettings />} />

                <Route path="/control-register" element={<ControlRegister />} />
                <Route path="/testing-schedule" element={<TestingSchedule />} />
                <Route path="/test-results" element={<TestResults />} />
                <Route path="/deficiency-tracking" element={<DeficiencyTracking />} />

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
