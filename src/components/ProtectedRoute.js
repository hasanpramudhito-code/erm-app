import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  CircularProgress, 
  Box, 
  Typography,
  Paper 
} from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userData, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Checking Authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if specific roles are required
  if (allowedRoles.length > 0) {
    const userRole = userData?.role;
    
    if (!userRole) {
      console.warn('User role not found, redirecting to unauthorized');
      return <Navigate to="/unauthorized" replace />;
    }

    if (!allowedRoles.includes(userRole)) {
      console.warn(`Access denied. User role: ${userRole}, Required roles: ${allowedRoles.join(', ')}`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and has required role (if any)
  return children;
};

export default ProtectedRoute;