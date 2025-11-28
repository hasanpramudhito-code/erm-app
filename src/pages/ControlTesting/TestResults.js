// src/pages/ControlTesting/TestResults.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating
} from '@mui/material';
import { Add, Description, TrendingUp } from '@mui/icons-material';
import { controlTestingService } from '../../services/controlTestingService';

const TestResults = () => {
  const [controls, setControls] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [selectedControl, setSelectedControl] = useState('');
  const [newResult, setNewResult] = useState({
    testDate: new Date().toISOString().split('T')[0],
    testedBy: '',
    testType: 'design',
    result: 'effective',
    effectivenessRating: 3,
    sampleSize: '',
    exceptionsFound: 0,
    notes: '',
    evidence: ''
  });

  useEffect(() => {
    loadControls();
    loadAllTestResults();
  }, []);

  const loadControls = async () => {
    try {
      const controlsData = await controlTestingService.getControls('org-001');
      setControls(controlsData);
    } catch (error) {
      console.error('Error loading controls:', error);
    }
  };

  const loadAllTestResults = async () => {
    const allResults = [];
    for (const control of controls) {
      const controlResults = await controlTestingService.getTestResults(control.id);
      allResults.push(...controlResults.map(result => ({
        ...result,
        controlName: control.name,
        controlId: control.id
      })));
    }
    setTestResults(allResults);
  };

  const handleAddTestResult = async () => {
    if (!selectedControl) return;

    try {
      await controlTestingService.addTestResult(selectedControl, newResult);
      
      // Update control effectiveness
      if (newResult.testType === 'design' || newResult.testType === 'both') {
        await controlTestingService.updateControl(selectedControl, {
          designEffectiveness: newResult.result
        });
      }
      if (newResult.testType === 'operating' || newResult.testType === 'both') {
        await controlTestingService.updateControl(selectedControl, {
          operatingEffectiveness: newResult.result
        });
      }

      setNewResult({
        testDate: new Date().toISOString().split('T')[0],
        testedBy: '',
        testType: 'design',
        result: 'effective',
        effectivenessRating: 3,
        sampleSize: '',
        exceptionsFound: 0,
        notes: '',
        evidence: ''
      });
      setOpenResultDialog(false);
      loadAllTestResults();
      loadControls();
    } catch (error) {
      console.error('Error adding test result:', error);
    }
  };

  const getResultColor = (result) => {
    const colors = {
      effective: 'success',
      partially_effective: 'warning',
      not_effective: 'error'
    };
    return colors[result] || 'default';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Test Results
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenResultDialog(true)}
        >
          Add Test Result
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Test Results Summary */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Summary
              </Typography>
              <Box textAlign="center">
                <Typography variant="h3" color="success.main">
                  {Math.round((testResults.filter(r => r.result === 'effective').length / testResults.length) * 100)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Effective Controls
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Tests
              </Typography>
              <Box textAlign="center">
                <Typography variant="h3">
                  {testResults.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Completed Tests
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Issues Found
              </Typography>
              <Box textAlign="center">
                <Typography variant="h3" color="warning.main">
                  {testResults.filter(r => r.result !== 'effective').length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Controls Needing Attention
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Avg. Rating
              </Typography>
              <Box textAlign="center">
                <Typography variant="h3">
                  {(testResults.reduce((acc, curr) => acc + (curr.effectivenessRating || 0), 0) / testResults.length).toFixed(1)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Average Effectiveness
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Test Results Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Test Results
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Control</TableCell>
                      <TableCell>Test Type</TableCell>
                      <TableCell>Test Date</TableCell>
                      <TableCell>Tested By</TableCell>
                      <TableCell>Result</TableCell>
                      <TableCell>Effectiveness</TableCell>
                      <TableCell>Exceptions</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testResults.slice(0, 10).map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {result.controlName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={result.testType} 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(result.testDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{result.testedBy}</TableCell>
                        <TableCell>
                          <Chip 
                            label={result.result.replace('_', ' ')} 
                            color={getResultColor(result.result)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Rating
                            value={result.effectivenessRating || 0}
                            readOnly
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {result.exceptionsFound > 0 ? (
                            <Chip 
                              label={result.exceptionsFound} 
                              color="error" 
                              size="small" 
                            />
                          ) : (
                            <Chip label="None" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="small" startIcon={<Description />}>
                            Details
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
      </Grid>

      {/* Add Test Result Dialog */}
      <Dialog open={openResultDialog} onClose={() => setOpenResultDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Test Result</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Control</InputLabel>
                <Select
                  value={selectedControl}
                  onChange={(e) => setSelectedControl(e.target.value)}
                >
                  {controls.map(control => (
                    <MenuItem key={control.id} value={control.id}>
                      {control.name} - {control.category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Test Date"
                type="date"
                value={newResult.testDate}
                onChange={(e) => setNewResult({...newResult, testDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Tested By"
                value={newResult.testedBy}
                onChange={(e) => setNewResult({...newResult, testedBy: e.target.value})}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Test Type</InputLabel>
                <Select
                  value={newResult.testType}
                  onChange={(e) => setNewResult({...newResult, testType: e.target.value})}
                >
                  <MenuItem value="design">Design Effectiveness</MenuItem>
                  <MenuItem value="operating">Operating Effectiveness</MenuItem>
                  <MenuItem value="both">Both</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Test Result</InputLabel>
                <Select
                  value={newResult.result}
                  onChange={(e) => setNewResult({...newResult, result: e.target.value})}
                >
                  <MenuItem value="effective">Effective</MenuItem>
                  <MenuItem value="partially_effective">Partially Effective</MenuItem>
                  <MenuItem value="not_effective">Not Effective</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography component="legend">Effectiveness Rating</Typography>
              <Rating
                value={newResult.effectivenessRating}
                onChange={(e, newValue) => setNewResult({...newResult, effectivenessRating: newValue})}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Sample Size"
                value={newResult.sampleSize}
                onChange={(e) => setNewResult({...newResult, sampleSize: e.target.value})}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Exceptions Found"
                type="number"
                value={newResult.exceptionsFound}
                onChange={(e) => setNewResult({...newResult, exceptionsFound: parseInt(e.target.value)})}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Test Notes"
                value={newResult.notes}
                onChange={(e) => setNewResult({...newResult, notes: e.target.value})}
                multiline
                rows={3}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Evidence/References"
                value={newResult.evidence}
                onChange={(e) => setNewResult({...newResult, evidence: e.target.value})}
                placeholder="Link to evidence, document references, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResultDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddTestResult} 
            variant="contained"
            disabled={!selectedControl}
          >
            Save Test Result
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestResults;