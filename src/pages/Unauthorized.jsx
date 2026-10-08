import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container
} from '@mui/material';
import { AlertTriangle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            maxWidth: 500,
            width: '100%'
          }}
        >
          <AlertTriangle size={80} color="#ed6c02" style={{ marginBottom: '16px' }} />

          <Typography variant="h4" gutterBottom color="error">
            Access Denied
          </Typography>

          <Typography variant="body1" color="textSecondary" paragraph>
            You don't have permission to access this page.
            Please contact your administrator if you believe this is an error.
          </Typography>

          <Box mt={4} display="flex" gap={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              startIcon={<Home size={18} />}
              onClick={() => navigate('/')}
            >
              Go to Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;