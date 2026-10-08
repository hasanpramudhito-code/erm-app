import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Divider,
  InputAdornment,
  IconButton,
  Alert,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  EmailOutlined,
  LockOutlined,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      setError('Failed to log in: ' + error.message);
    }
    setLoading(false);
  };



  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
        // bgcolor: '#5ea3e7ff', 
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(/assets/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        p: 2
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 1000,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          minHeight: 600
        }}
      >
        <Grid container>
          {/* LEFT SIDE - Decorative Layer */}
          {!isMobile && (
            <Grid item xs={12} md={6} sx={{ position: 'relative' }}>
              <Box
                sx={{
                  height: '100%',
                  width: '100%',
                  // Background Image dengan Overlay Gradient
                  backgroundImage: `linear-gradient(135deg, rgba(99, 102, 241, 0.55) 0%, rgba(139, 92, 246, 0.75) 100%), url(/assets/sidebar-bg.jpg)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                  color: 'white',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Background Circles for Depth */}
                <Box sx={{
                  position: 'absolute',
                  top: -50,
                  left: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)'
                }} />
                <Box sx={{
                  position: 'absolute',
                  bottom: -100,
                  right: -50,
                  width: 300,
                  height: 300,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)'
                }} />

                <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)', mt: 4 }}>
                  Selamat Datang
                </Typography>

                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 6, maxWidth: 350 }}>
                  PT Solusi Kelola Risiko
                </Typography>              </Box>
            </Grid>
          )}

          {/* RIGHT SIDE - Login Form */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                p: { xs: 4, md: 6 },
                bgcolor: 'white'
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                Masuk
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={4}>
                Masukkan kredensial Anda untuk melanjutkan
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>

                <Typography variant="caption" fontWeight="bold" color="text.primary" sx={{ mb: 1, display: 'block' }}>
                  Email
                </Typography>
                <TextField
                  fullWidth
                  placeholder="nama@email.com"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <EmailOutlined color="action" />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      '& fieldset': { borderColor: '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#94a3b8' },
                    }
                  }}
                  sx={{ mb: 3 }}
                />

                <Typography variant="caption" fontWeight="bold" color="text.primary" sx={{ mb: 1, display: 'block' }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      '& fieldset': { borderColor: '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#94a3b8' },
                    }
                  }}
                />

                <Box display="flex" alignItems="center" justifyContent="space-between" mt={2} mb={3}>
                  <FormControlLabel
                    control={<Checkbox color="primary" sx={{ borderRadius: 1 }} />}
                    label={<Typography variant="body2" color="text.secondary">Ingat saya</Typography>}
                  />
                  <Link href="#" variant="body2" fontWeight="bold" underline="hover" color="text.primary">
                    Lupa password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
                      boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                    }
                  }}
                >
                  {loading ? 'Sedang Masuk...' : 'Masuk'}
                </Button>



              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Login;