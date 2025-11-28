// src/pages/ControlTesting/TestingSchedule.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  TextField
} from '@mui/material';
import { CalendarMonth, PlayArrow, Schedule } from '@mui/icons-material';
import { controlTestingService } from '../../services/controlTestingService';

const TestingSchedule = () => {
  const [controls, setControls] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedControl, setSelectedControl] = useState('');
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    scheduledDate: '',
    assignedTo: '',
    testType: 'design',
    notes: ''
  });

  useEffect(() => {
    loadControls();
    loadAllSchedules();
  }, []);

  const loadControls = async () => {
    try {
      const controlsData = await controlTestingService.getControls('org-001');
      setControls(controlsData);
    } catch (error) {
      console.error('Error loading controls:', error);
    }
  };

  const loadAllSchedules = async () => {
    // This would aggregate all testing schedules across controls
    const allSchedules = [];
    for (const control of controls) {
      const controlSchedules = await controlTestingService.getTestingSchedules(control.id);
      allSchedules.push(...controlSchedules.map(schedule => ({
        ...schedule,
        controlName: control.name,
        controlId: control.id
      })));
    }
    setSchedules(allSchedules);
  };

  const handleCreateSchedule = async () => {
    if (!selectedControl) return;
    
    try {
      await controlTestingService.createTestingSchedule(selectedControl, {
        ...newSchedule,
        assignedTo: newSchedule.assignedTo,
        status: 'scheduled'
      });
      setNewSchedule({
        scheduledDate: '',
        assignedTo: '',
        testType: 'design',
        notes: ''
      });
      setOpenScheduleDialog(false);
      loadAllSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'primary',
      in_progress: 'warning',
      completed: 'success',
      overdue: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const getTestTypeColor = (testType) => {
    return testType === 'design' ? 'primary' : 'secondary';
  };

  const upcomingSchedules = schedules
    .filter(schedule => schedule.status === 'scheduled' || schedule.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Testing Schedule
        </Typography>
        <Button
          variant="contained"
          startIcon={<Schedule />}
          onClick={() => setOpenScheduleDialog(true)}
        >
          Schedule Test
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Upcoming Tests */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Tests
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Control</TableCell>
                      <TableCell>Test Type</TableCell>
                      <TableCell>Scheduled Date</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {schedule.controlName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={schedule.testType} 
                            color={getTestTypeColor(schedule.testType)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(schedule.scheduledDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{schedule.assignedTo}</TableCell>
                        <TableCell>
                          <Chip 
                            label={schedule.status.replace('_', ' ')} 
                            color={getStatusColor(schedule.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<PlayArrow />}
                            onClick={() => {/* Start test implementation */}}
                          >
                            Start Test
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Schedule Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Testing Overview
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Total Scheduled Tests
                </Typography>
                <Typography variant="h4">
                  {upcomingSchedules.length}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Overdue Tests
                </Typography>
                <Typography variant="h4" color="error">
                  {schedules.filter(s => s.status === 'overdue').length}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Completion Rate
                </Typography>
                <Typography variant="h4" color="success.main">
                  {Math.round((schedules.filter(s => s.status === 'completed').length / schedules.length) * 100)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Schedule Test Dialog */}
      <Dialog open={openScheduleDialog} onClose={() => setOpenScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Control Test</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Control</InputLabel>
            <Select
              value={selectedControl}
              onChange={(e) => setSelectedControl(e.target.value)}
            >
              {controls.filter(c => c.isActive).map(control => (
                <MenuItem key={control.id} value={control.id}>
                  {control.name} - {control.category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Scheduled Date"
            type="date"
            value={newSchedule.scheduledDate}
            onChange={(e) => setNewSchedule({...newSchedule, scheduledDate: e.target.value})}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Assigned To"
            value={newSchedule.assignedTo}
            onChange={(e) => setNewSchedule({...newSchedule, assignedTo: e.target.value})}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Test Type</InputLabel>
            <Select
              value={newSchedule.testType}
              onChange={(e) => setNewSchedule({...newSchedule, testType: e.target.value})}
            >
              <MenuItem value="design">Design Effectiveness</MenuItem>
              <MenuItem value="operating">Operating Effectiveness</MenuItem>
              <MenuItem value="both">Both Design & Operating</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Notes"
            value={newSchedule.notes}
            onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateSchedule} 
            variant="contained"
            disabled={!selectedControl}
          >
            Schedule Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestingSchedule;