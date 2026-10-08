import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config/firebase';

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
    // Listen to global settings for theme changes
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.ui && data.ui.themeMode) {
          setThemeMode(data.ui.themeMode === 'system' ? 'light' : data.ui.themeMode);
        }
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
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
