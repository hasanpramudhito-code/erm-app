import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save,
  RotateCcw as Restore,
  Settings as SettingsIcon,
  Bell as Notifications,
  Palette,
  Shield as Security
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SystemSettings = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Default Settings
  const defaultSettings = {
    general: {
      autoSave: true,
      autoSaveInterval: 5, // minutes
      idleTimeout: 15, // minutes
    },
    ui: {
      themeMode: 'light',
      compactView: false,
      sidebarCollapsed: false
    },
    notifications: {
      emailAlerts: true,
      systemAnnouncements: true
    }
  };

  const [settings, setSettings] = useState(defaultSettings);

  // Load Settings
  useEffect(() => {
    api.get('/pengaturan')
      .then((p) => setSettings({
        general: { ...defaultSettings.general, ...p.umum },
        ui: { ...defaultSettings.ui, ...p.ui },
        notifications: { ...defaultSettings.notifications, ...p.notifikasi }
      }))
      .catch((error) => showSnackbar('Error Loading Settings: ' + error.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Simpan tiap bagian ke kunci pengaturan masing-masing di server.
  const simpan = (data) => Promise.all([
    api.put('/pengaturan/umum', { nilai: data.general }),
    api.put('/pengaturan/ui', { nilai: data.ui }),
    api.put('/pengaturan/notifikasi', { nilai: data.notifications })
  ]);

  const handleChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await simpan(settings);
      showSnackbar('Settings saved successfully!', 'success');
    } catch (error) {
      showSnackbar('Failed to save settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm('Are you sure you want to restore all settings to default values?')) {
      try {
        setSaving(true);
        await simpan(defaultSettings);
        setSettings(defaultSettings);
        showSnackbar('Settings restored to defaults.', 'info');
      } catch (error) {
        showSnackbar('Error restoring defaults: ' + error.message, 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          System Settings
        </Typography>
        <Alert severity="info" sx={{ py: 0, px: 2 }}>
          Changes applied immediately or after save.
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* GENERAL SETTINGS */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SettingsIcon size={24} color="#1976d2" />
              <Typography variant="h6">General & Security</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" flexDirection="column" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.autoSave}
                    onChange={(e) => handleChange('general', 'autoSave', e.target.checked)}
                  />
                }
                label="Enable Auto-Save"
              />

              <FormControl fullWidth size="small">
                <InputLabel>Auto-Save Interval (Minutes)</InputLabel>
                <Select
                  value={settings.general.autoSaveInterval}
                  label="Auto-Save Interval (Minutes)"
                  onChange={(e) => handleChange('general', 'autoSaveInterval', e.target.value)}
                  disabled={!settings.general.autoSave}
                >
                  <MenuItem value={1}>1 Minute</MenuItem>
                  <MenuItem value={5}>5 Minutes</MenuItem>
                  <MenuItem value={10}>10 Minutes</MenuItem>
                  <MenuItem value={30}>30 Minutes</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Idle Timeout (Lock Session)</InputLabel>
                <Select
                  value={settings.general.idleTimeout}
                  label="Idle Timeout (Lock Session)"
                  onChange={(e) => handleChange('general', 'idleTimeout', e.target.value)}
                >
                  <MenuItem value={5}>5 Minutes</MenuItem>
                  <MenuItem value={15}>15 Minutes</MenuItem>
                  <MenuItem value={30}>30 Minutes</MenuItem>
                  <MenuItem value={60}>1 Hour</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Grid>

        {/* UI/UX SETTINGS */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Palette size={24} color="#9c27b0" />
              <Typography variant="h6">Appearance</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Theme Mode</InputLabel>
                <Select
                  value={settings.ui.themeMode}
                  label="Theme Mode"
                  onChange={(e) => handleChange('ui', 'themeMode', e.target.value)}
                >
                  <MenuItem value="light">Light Mode</MenuItem>
                  <MenuItem value="dark">Dark Mode</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.ui.compactView}
                    onChange={(e) => handleChange('ui', 'compactView', e.target.checked)}
                  />
                }
                label="Compact View (Dense Tables)"
              />
            </Box>
          </Paper>
        </Grid>

        {/* NOTIFICATIONS */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Notifications size={24} color="#ed6c02" />
              <Typography variant="h6">Notifications</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.emailAlerts}
                  onChange={(e) => handleChange('notifications', 'emailAlerts', e.target.checked)}
                />
              }
              label="Email Alerts (Critical Risks)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.systemAnnouncements}
                  onChange={(e) => handleChange('notifications', 'systemAnnouncements', e.target.checked)}
                />
              }
              label="System Announcements"
            />
          </Paper>
        </Grid>

        {/* ACTIONS */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box display="flex" gap={2} flexDirection="column">
              <Button
                variant="contained"
                size="large"
                startIcon={<Save size={18} />}
                onClick={handleSave}
                disabled={saving}
                fullWidth
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<Restore size={18} />}
                onClick={handleRestoreDefaults}
                disabled={saving}
                fullWidth
              >
                Restore Defaults
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;