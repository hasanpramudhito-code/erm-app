import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { api } from './services/api';

import { AuthProvider } from './contexts/AuthContext';
import DocumentTitle from './components/DocumentTitle';

import getTheme from './styles/theme';

const Login = lazy(() => import('./pages/Login'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'));

// Import Fonts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

function App() {
  const [themeMode, setThemeMode] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tema dari pengaturan server; sebelum login (401) tetap tema terang.
    api.get('/pengaturan')
      .then((p) => {
        if (p.ui?.themeMode) setThemeMode(p.ui.themeMode === 'system' ? 'light' : p.ui.themeMode);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f8f9fa">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DocumentTitle />

        <AuthProvider>
          <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>}>
            <Routes>
              {/* PUBLIC */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* PROTECTED AREA */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Suspense>
        </AuthProvider>

      </Router>
    </ThemeProvider>
  );
}

export default App;
