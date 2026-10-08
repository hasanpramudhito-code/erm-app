import React from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            p: 3
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={3}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                borderTop: '6px solid #ef4444'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '50%',
                    backgroundColor: '#fef2f2',
                    color: '#ef4444'
                  }}
                >
                  <AlertTriangle size={48} />
                </Box>
              </Box>

              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="text.primary">
                Terjadi Kesalahan
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
                Maaf, aplikasi mengalami kendala teknis yang tidak terduga. 
                Tim teknis kami telah diberitahu tentang masalah ini.
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box 
                  sx={{ 
                    mt: 2, 
                    mb: 4, 
                    p: 2, 
                    bgcolor: '#f1f5f9', 
                    borderRadius: 1,
                    textAlign: 'left',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace'
                  }}
                >
                  <Typography color="error" fontWeight="bold">
                    {this.state.error.toString()}
                  </Typography>
                  <pre style={{ margin: 0 }}>
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </Box>
              )}

              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshCcw size={20} />}
                onClick={this.handleReload}
                sx={{
                  bgcolor: '#1d4ed8',
                  '&:hover': { bgcolor: '#1e40af' },
                  px: 4,
                  py: 1.5,
                  borderRadius: 2
                }}
              >
                Muat Ulang Halaman
              </Button>
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
