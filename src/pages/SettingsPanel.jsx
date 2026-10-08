import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  LayoutDashboard,
  Grid3X3,
  Briefcase,
  Palette,
  Users,
  Shield,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const SettingsPanel = () => {
  const { settings: contextSettings, saveSettings, loading } = useSettings();
  const [activeTab, setActiveTab] = useState('matrix');
  const [localSettings, setLocalSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Initialize local state from context when loaded
  useEffect(() => {
    if (contextSettings && !loading) {
      setLocalSettings(contextSettings);
    }
  }, [contextSettings, loading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await saveSettings(localSettings);
      if (success) {
        setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to save settings.', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving settings: ' + error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSettings(contextSettings); // Revert to context data
    setSnackbar({ open: true, message: 'Changes discarded', severity: 'info' });
  };

  if (loading || !localSettings) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading settings...</Typography>
      </Box>
    );
  }

  const tabs = [
    { id: 'matrix', label: 'Risk Matrix', icon: <LayoutDashboard size={20} /> },
    { id: 'categories', label: 'Risk Categories', icon: <Grid3X3 size={20} /> },
    { id: 'ui', label: 'UI/UX', icon: <Palette /> },
    // Placeholder tabs for future expansion
    { id: 'organization', label: 'Organization', icon: <Briefcase size={20} /> },
    { id: 'users', label: 'User Management', icon: <Users size={20} /> },
    { id: 'system', label: 'System', icon: <Shield size={20} /> }
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            ⚙️ System Settings
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Kelola konfigurasi sistem dan preferensi pengguna
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Sidebar Navigation */}
        <Grid item xs={12} md={3}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <List>
                {tabs.map((tab) => (
                  <ListItem
                    key={tab.id}
                    button
                    selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: activeTab === tab.id ? 'primary.light' : 'transparent',
                      color: activeTab === tab.id ? 'white' : 'inherit',
                      '&:hover': {
                        backgroundColor: activeTab === tab.id ? 'primary.main' : 'grey.100'
                      }
                    }}
                  >
                    <Box sx={{ mr: 2, color: 'inherit' }}>
                      {tab.icon}
                    </Box>
                    <ListItemText primary={tab.label} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Content */}
        <Grid item xs={12} md={9}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              {/* Risk Matrix Configuration */}
              {activeTab === 'matrix' && localSettings.matrix && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    🎯 Risk Matrix Configuration
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Konfigurasi ukuran matrix dan label likelihood & impact
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Matrix Size</InputLabel>
                        <Select
                          value={localSettings.matrix.size}
                          label="Matrix Size"
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            matrix: { ...localSettings.matrix, size: e.target.value }
                          })}
                        >
                          <MenuItem value={3}>3x3 Matrix</MenuItem>
                          <MenuItem value={4}>4x4 Matrix</MenuItem>
                          <MenuItem value={5}>5x5 Matrix</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  {/* Likelihood Labels Editor */}
                  <Typography variant="h6" gutterBottom>
                    Likelihood Labels
                  </Typography>
                  <Grid container spacing={2}>
                    {localSettings.matrix.likelihoodLabels.map((label, index) => (
                      <Grid item xs={12} key={label.level}>
                        <Card variant="outlined">
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={1}>
                                <Chip label={`L${label.level}`} color="primary" />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  label="Label"
                                  value={label.label}
                                  onChange={(e) => {
                                    const newLabels = [...localSettings.matrix.likelihoodLabels];
                                    newLabels[index] = { ...newLabels[index], label: e.target.value };
                                    setLocalSettings({
                                      ...localSettings,
                                      matrix: { ...localSettings.matrix, likelihoodLabels: newLabels }
                                    });
                                  }}
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  label="Description"
                                  value={label.description}
                                  onChange={(e) => {
                                    const newLabels = [...localSettings.matrix.likelihoodLabels];
                                    newLabels[index] = { ...newLabels[index], description: e.target.value };
                                    setLocalSettings({
                                      ...localSettings,
                                      matrix: { ...localSettings.matrix, likelihoodLabels: newLabels }
                                    });
                                  }}
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Risk Categories Management */}
              {activeTab === 'categories' && localSettings.categories && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    📊 Risk Categories Management
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Add New Category (Press Enter)"
                      variant="outlined"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          setLocalSettings({
                            ...localSettings,
                            categories: [...localSettings.categories, e.target.value]
                          });
                          e.target.value = '';
                        }
                      }}
                    />
                  </Box>

                  <Grid container spacing={1}>
                    {localSettings.categories.map((category, index) => (
                      <Grid item key={index}>
                        <Chip
                          label={category}
                          onDelete={() => {
                            const newCategories = localSettings.categories.filter((_, i) => i !== index);
                            setLocalSettings({ ...localSettings, categories: newCategories });
                          }}
                          color="primary"
                          variant="outlined"
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* UI/UX Settings */}
              {activeTab === 'ui' && localSettings.ui && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    🎨 UI/UX Preferences
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Theme</InputLabel>
                        <Select
                          value={localSettings.ui.theme}
                          label="Theme"
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            ui: { ...localSettings.ui, theme: e.target.value }
                          })}
                        >
                          <MenuItem value="light">Light Mode</MenuItem>
                          <MenuItem value="dark">Dark Mode</MenuItem>
                          <MenuItem value="auto">Auto (System)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select
                          value={localSettings.ui.language}
                          label="Language"
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            ui: { ...localSettings.ui, language: e.target.value }
                          })}
                        >
                          <MenuItem value="id">Bahasa Indonesia</MenuItem>
                          <MenuItem value="en">English</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Other Tabs Placeholder */}
              {['organization', 'users', 'system'].includes(activeTab) && (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography variant="h6" color="textSecondary">
                    Module '{tabs.find(t => t.id === activeTab)?.label}' is under development.
                  </Typography>
                </Box>
              )}

              {/* Save/Cancel Buttons */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<X size={20} />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <Save size={20} />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPanel;