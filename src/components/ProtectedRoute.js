// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userData, loading } = useAuth();

  console.log("🔐 PROTECTED ROUTE DEBUG:");
  console.log("Current User:", currentUser);
  console.log("User Data:", userData);
  console.log("Allowed Roles:", allowedRoles);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ================================================
  // 🔥 NOW: role already normalized by AuthContext
  // Example outputs:
  // "ADMIN", "DIRECTOR", "RISK_MANAGER", "RISK_OWNER", "STAFF"
  // ================================================

  const userRole = userData?.role ?? "STAFF";

  console.log("🎭 FINAL USER ROLE FROM CONTEXT:", userRole);

  const hasAccess =
    allowedRoles.length === 0 || allowedRoles.includes(userRole);

  console.log("🔎 ACCESS CHECK RESULT:", hasAccess);

  if (!hasAccess) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
        flexDirection="column"
      >
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>

        <Typography variant="body1">
          Your role ({userRole}) does not have permission to access this page.
        </Typography>

        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ mt: 1 }}
        >
          Required roles: {allowedRoles.join(", ")}
        </Typography>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
