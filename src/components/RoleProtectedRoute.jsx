import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

/**
 * Proteksi route berdasarkan role pengguna dari sesi server.
 * Bekerja tanpa Cloud Functions — cukup untuk UI guard.
 */
const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = allowedRoles.length === 0 || allowedRoles.some((p) => userData?.peran?.includes(p));

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
