// src/pages/ControlTesting/DeficiencyTracking.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Alert,
  LinearProgress
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Comment, 
  TrendingUp, 
  Warning,
  CheckCircle,
  Schedule,
  Assignment
} from '@mui/icons-material';
import { controlTestingService } from '../../services/controlTestingService';

const DeficiencyTracking = () => {
  const [deficiencies, setDeficiencies] = useState([]);
  const [filteredDeficiencies, setFilteredDeficiencies] = useState([]);
  const [stats, setStats] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    assignedTo: ''
  });
  const [newDeficiency, setNewDeficiency] = useState({
    title: '',
    description: '',
    controlId: '',
    testResultId: '',
    severity: 'medium',
    category: '',
    riskImpact: '',
    rootCause: '',
    recommendation: '',
    assignedTo: '',
    targetDate: '',
    identifiedDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadDeficiencies();
    loadStats();
  }, []);

  useEffect(() => {
    filterDeficiencies();
  }, [deficiencies, filters, selectedTab]);

  const loadDeficiencies = async () => {
    try {
      const deficienciesData = await controlTestingService.getDeficiencies('org-001', filters);
      setDeficiencies(deficienciesData);
    } catch (error) {
      console.error('Error loading deficiencies:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await controlTestingService.getDeficiencyStats('org-001');
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterDeficiencies = () => {
    let filtered = deficiencies;

    // Apply tab filter
    if (selectedTab !== 'all') {
      filtered = filtered.filter(def => def.status === selectedTab);
    }

    // Apply additional filters
    if (filters.severity) {
      filtered = filtered.filter(def => def.severity === filters.severity);
    }
    if (filters.assignedTo) {
      filtered = filtered.filter(def => def.assignedTo === filters.assignedTo);
    }

    setFilteredDeficiencies(filtered);
  };

  const handleCreateDeficiency = async () => {
    try {
      await controlTestingService.createDeficiency({
        ...newDeficiency,
        organizationId: 'org-001',
        status: 'open',
        daysOpen: 0
      });
      setNewDeficiency({
        title: '',
        description: '',
        controlId: '',
        testResultId: '',
        severity: 'medium',
        category: '',
        riskImpact: '',
        rootCause: '',
        recommendation: '',
        assignedTo: '',
        targetDate: '',
        identifiedDate: new Date().toISOString().split('T')[0]
      });
      setOpenDialog(false);
      loadDeficiencies();
      loadStats();
    } catch (error) {
      console.error('Error creating deficiency:', error);
    }
  };

  const handleUpdateDeficiency = async (deficiencyId, updates) => {
    try {
      await controlTestingService.updateDeficiency(deficiencyId, updates);
      loadDeficiencies();
      loadStats();
    } catch (error) {
      console.error('Error updating deficiency:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'error',
      in_progress: 'warning',
      resolved: 'info',
      closed: 'success'
    };
    return colors[status] || 'default';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'success'
    };
    return colors[severity] || 'default';
  };

  const calculateDaysOpen = (identifiedDate) => {
    const identified = new Date(identifiedDate);
    const today = new Date();
    const diffTime = Math.abs(today - identified);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'error' },
    { value: 'in_progress', label: 'In Progress', color: 'warning' },
    { value: 'resolved', label: 'Resolved', color: 'info' },
    { value: 'closed', label: 'Closed', color: 'success' }
  ];

  const severityOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const categoryOptions = [
    'Design Deficiency',
    'Operating Deficiency',
    'Documentation Issue',
    'Process Gap',
    'Control Failure',
    'Compliance Issue'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Deficiency Tracking
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Report Deficiency
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Deficiencies
              </Typography>
              <Typography variant="h4">
                {stats.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Open Issues
              </Typography>
              <Typography variant="h4" color="error">
                {stats.open || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical & High
              </Typography>
              <Typography variant="h4" color="warning.main">
                {(stats.critical || 0) + (stats.high || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg. Days Open
              </Typography>
              <Typography variant="h4">
                {stats.averageDaysOpen || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Tabs */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Tabs 
                value={selectedTab} 
                onChange={(e, newValue) => setSelectedTab(newValue)}
              >
                <Tab label="All" value="all" />
                <Tab label="Open" value="open" />
                <Tab label="In Progress" value="in_progress" />
                <Tab label="Resolved" value="resolved" />
                <Tab label="Closed" value="closed" />
              </Tabs>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={filters.severity}
                      onChange={(e) => setFilters({...filters, severity: e.target.value})}
                      label="Severity"
                    >
                      <MenuItem value="">All</MenuItem>
                      {severityOptions.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Assigned To</InputLabel>
                    <Select
                      value={filters.assignedTo}
                      onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
                      label="Assigned To"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="John Doe">John Doe</MenuItem>
                      <MenuItem value="Jane Smith">Jane Smith</MenuItem>
                      <MenuItem value="IT Team">IT Team</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={4}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setFilters({ status: '', severity: '', assignedTo: '' })}
                    fullWidth
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Deficiencies Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Deficiencies ({filteredDeficiencies.length})
          </Typography>

          {filteredDeficiencies.length === 0 ? (
            <Alert severity="info">
              No deficiencies found matching your criteria.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Days Open</TableCell>
                    <TableCell>Target Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDeficiencies.map((deficiency) => (
                    <TableRow key={deficiency.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {deficiency.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {deficiency.category}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={deficiency.severity} 
                          color={getSeverityColor(deficiency.severity)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={deficiency.status.replace('_', ' ')} 
                          color={getStatusColor(deficiency.status)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        {deficiency.assignedTo || 'Unassigned'}
                      </TableCell>
                      
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            {calculateDaysOpen(deficiency.identifiedDate)}
                          </Typography>
                          {calculateDaysOpen(deficiency.identifiedDate) > 30 && (
                            <Warning color="error" fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        {deficiency.targetDate ? (
                          new Date(deficiency.targetDate).toLocaleDateString()
                        ) : (
                          'Not set'
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleUpdateDeficiency(deficiency.id, { status: 'in_progress' })}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Add Comment">
                          <IconButton size="small">
                            <Comment />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Mark Resolved">
                          <IconButton 
                            size="small" 
                            onClick={() => handleUpdateDeficiency(deficiency.id, { status: 'resolved' })}
                            disabled={deficiency.status === 'closed'}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Report Deficiency Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report New Deficiency</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deficiency Title"
                value={newDeficiency.title}
                onChange={(e) => setNewDeficiency({...newDeficiency, title: e.target.value})}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newDeficiency.description}
                onChange={(e) => setNewDeficiency({...newDeficiency, description: e.target.value})}
                multiline
                rows={3}
                required
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newDeficiency.severity}
                  onChange={(e) => setNewDeficiency({...newDeficiency, severity: e.target.value})}
                  label="Severity"
                >
                  {severityOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newDeficiency.category}
                  onChange={(e) => setNewDeficiency({...newDeficiency, category: e.target.value})}
                  label="Category"
                >
                  {categoryOptions.map(opt => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Identified Date"
                type="date"
                value={newDeficiency.identifiedDate}
                onChange={(e) => setNewDeficiency({...newDeficiency, identifiedDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Target Resolution Date"
                type="date"
                value={newDeficiency.targetDate}
                onChange={(e) => setNewDeficiency({...newDeficiency, targetDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assigned To"
                value={newDeficiency.assignedTo}
                onChange={(e) => setNewDeficiency({...newDeficiency, assignedTo: e.target.value})}
                placeholder="Person responsible for resolution"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Root Cause"
                value={newDeficiency.rootCause}
                onChange={(e) => setNewDeficiency({...newDeficiency, rootCause: e.target.value})}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recommendation"
                value={newDeficiency.recommendation}
                onChange={(e) => setNewDeficiency({...newDeficiency, recommendation: e.target.value})}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateDeficiency} 
            variant="contained"
            disabled={!newDeficiency.title || !newDeficiency.description}
          >
            Report Deficiency
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeficiencyTracking;