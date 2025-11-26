import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Pagination,
  CircularProgress
} from '@mui/material';
import {
  People,
  Assignment,
  Edit,
  Save,
  Cancel,
  Add,
  Delete,
  MedicalServices,
  Search,
  FilterList,
  Clear
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const RACIChart = () => {
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [filteredTreatments, setFilteredTreatments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTreatment, setSelectedTreatment] = useState('');
  const [raciData, setRaciData] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State untuk search functionality
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    riskLevel: 'all',
    treatmentType: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load treatment plans and users
  useEffect(() => {
    loadData();
  }, []);

  // Filter treatment plans berdasarkan search term dan filters
  useEffect(() => {
    let results = treatmentPlans;
    
    // Filter berdasarkan search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(treatment => 
        treatment.treatmentCode?.toLowerCase().includes(term) ||
        treatment.description?.toLowerCase().includes(term) ||
        treatment.riskCode?.toLowerCase().includes(term) ||
        treatment.riskTitle?.toLowerCase().includes(term)
      );
    }
    
    // Filter berdasarkan status
    if (filters.status !== 'all') {
      results = results.filter(treatment => treatment.status === filters.status);
    }
    
    // Filter berdasarkan risk level
    if (filters.riskLevel !== 'all') {
      results = results.filter(treatment => treatment.riskLevel === filters.riskLevel);
    }
    
    // Filter berdasarkan treatment type
    if (filters.treatmentType !== 'all') {
      results = results.filter(treatment => treatment.treatmentType === filters.treatmentType);
    }
    
    setSearchResults(results);
    setFilteredTreatments(results);
  }, [searchTerm, filters, treatmentPlans]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load treatment plans (RTP - Risk Treatment Plan)
      const treatmentsSnapshot = await getDocs(collection(db, 'risk_treatment_plans'));
      const treatmentsList = treatmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTreatmentPlans(treatmentsList);
      setFilteredTreatments(treatmentsList);

      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // RACI FUNCTIONS
  // ===============================

  const initializeRACIData = () => {
    const treatment = treatmentPlans.find(t => t.id === selectedTreatment);
    if (!treatment) return;

    // Activities untuk treatment plan execution
    const treatmentActivities = [
      'Treatment Planning',
      'Resource Allocation',
      'Implementation',
      'Monitoring & Evaluation',
      'Progress Reporting',
      'Effectiveness Review',
      'Closure & Documentation'
    ];

    const newRaciData = treatmentActivities.map(activity => {
      const row = { activity };
      users.forEach(user => {
        row[user.id] = treatment.raci?.[activity]?.[user.id] || '';
      });
      return row;
    });

    setRaciData(newRaciData);
  };

  const handleRACIChange = (activity, userId, value) => {
    if (!editMode) return;

    const updatedData = raciData.map(row => {
      if (row.activity === activity) {
        return { ...row, [userId]: value };
      }
      return row;
    });
    setRaciData(updatedData);
  };

  const saveRACI = async () => {
    if (!selectedTreatment) return;

    try {
      setLoading(true);
      const treatmentRef = doc(db, 'risk_treatment_plans', selectedTreatment);
      
      const raciMatrix = {};
      raciData.forEach(row => {
        raciMatrix[row.activity] = {};
        users.forEach(user => {
          raciMatrix[row.activity][user.id] = row[user.id] || '';
        });
      });

      await updateDoc(treatmentRef, {
        raci: raciMatrix,
        raciUpdated: new Date()
      });

      setEditMode(false);
      // Show success message
    } catch (error) {
      console.error('Error saving RACI:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRACIColor = (value) => {
    switch (value) {
      case 'R': return '#ffeb3b'; // Yellow
      case 'A': return '#4caf50'; // Green
      case 'C': return '#2196f3'; // Blue
      case 'I': return '#9e9e9e'; // Gray
      default: return '#ffffff'; // White
    }
  };

  const getRACITooltip = (value) => {
    switch (value) {
      case 'R': return 'Responsible - Melakukan pekerjaan';
      case 'A': return 'Accountable - Bertanggung jawab dan approve';
      case 'C': return 'Consulted - Memberikan konsultasi';
      case 'I': return 'Informed - Diberi informasi';
      default: return 'Tidak ditugaskan';
    }
  };

  const addNewActivity = () => {
    setRaciData([...raciData, { 
      activity: 'Aktivitas Baru', 
      ...Object.fromEntries(users.map(u => [u.id, ''])) 
    }]);
  };

  const removeActivity = (activity) => {
    setRaciData(raciData.filter(row => row.activity !== activity));
  };

  // ===============================
  // SEARCH FUNCTIONS
  // ===============================

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      riskLevel: 'all',
      treatmentType: 'all'
    });
    setCurrentPage(1);
  };

  // Pagination
  const getPaginatedResults = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return searchResults.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(searchResults.length / itemsPerPage);

  // Initialize RACI data when treatment plan is selected
  useEffect(() => {
    if (selectedTreatment) {
      initializeRACIData();
      setSearchOpen(false); // Tutup search dialog setelah select
    }
  }, [selectedTreatment]);

  const getSelectedTreatmentInfo = () => {
    return treatmentPlans.find(t => t.id === selectedTreatment);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <MedicalServices sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                RACI Chart - Treatment Plan
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Responsibility Assignment Matrix untuk Risk Treatment Plan
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2} alignItems="center">
            {/* Search Button & Selected Treatment Info */}
            <Grid item xs={12} md={6}>
              <Box>
                {selectedTreatment ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Treatment Plan Terpilih:
                    </Typography>
                    <Card variant="outlined" sx={{ p: 2, backgroundColor: 'success.50' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {getSelectedTreatmentInfo()?.treatmentCode} - {getSelectedTreatmentInfo()?.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Status: {getSelectedTreatmentInfo()?.status} | 
                            Risk: {getSelectedTreatmentInfo()?.riskCode}
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedTreatment('')}
                          color="error"
                        >
                          <Clear />
                        </IconButton>
                      </Box>
                    </Card>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Search />}
                    onClick={() => setSearchOpen(true)}
                    sx={{ justifyContent: 'flex-start', height: 56 }}
                  >
                    Cari Treatment Plan...
                  </Button>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(!editMode)}
                  disabled={!selectedTreatment}
                >
                  {editMode ? 'Cancel Edit' : 'Edit RACI'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={saveRACI}
                  disabled={!editMode || loading}
                >
                  Simpan RACI
                </Button>
                {editMode && (
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addNewActivity}
                  >
                    Tambah Aktivitas
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Treatment Plan Statistics */}
          {!selectedTreatment && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Total Treatment Plans: {treatmentPlans.length} | 
                Hasil Pencarian: {searchResults.length}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Search Dialog */}
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Cari Treatment Plan
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Cari berdasarkan kode, deskripsi, atau risiko..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton onClick={clearSearch} size="small">
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mt: 2 }}
          />
        </DialogTitle>
        
        <DialogContent dividers>
          {/* Filters */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filters:
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <MenuItem value="all">Semua Status</MenuItem>
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    value={filters.riskLevel}
                    label="Risk Level"
                    onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
                  >
                    <MenuItem value="all">Semua Level</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="extreme">Extreme</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Treatment Type</InputLabel>
                  <Select
                    value={filters.treatmentType}
                    label="Treatment Type"
                    onChange={(e) => setFilters({...filters, treatmentType: e.target.value})}
                  >
                    <MenuItem value="all">Semua Tipe</MenuItem>
                    <MenuItem value="mitigation">Mitigation</MenuItem>
                    <MenuItem value="avoidance">Avoidance</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                    <MenuItem value="acceptance">Acceptance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Search Results */}
          <Typography variant="subtitle2" gutterBottom>
            Hasil Pencarian: {searchResults.length} treatment plans ditemukan
          </Typography>

          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : searchResults.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                {searchTerm || Object.values(filters).some(f => f !== 'all') 
                  ? 'Tidak ada treatment plan yang sesuai dengan kriteria pencarian.' 
                  : 'Belum ada treatment plan tersedia.'}
              </Typography>
            </Box>
          ) : (
            <>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {getPaginatedResults().map((treatment) => (
                  <ListItem key={treatment.id} disablePadding>
                    <ListItemButton 
                      onClick={() => setSelectedTreatment(treatment.id)}
                      selected={selectedTreatment === treatment.id}
                    >
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {treatment.treatmentCode} - {treatment.description}
                            </Typography>
                            <Box display="flex" gap={2} mt={0.5}>
                              <Chip 
                                label={treatment.status} 
                                size="small"
                                color={
                                  treatment.status === 'completed' ? 'success' :
                                  treatment.status === 'in_progress' ? 'primary' : 'default'
                                }
                              />
                              <Chip 
                                label={treatment.treatmentType} 
                                size="small" 
                                variant="outlined"
                              />
                              <Typography variant="caption" color="textSecondary">
                                Risk: {treatment.riskCode}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination 
                    count={totalPages} 
                    page={currentPage}
                    onChange={(e, page) => setCurrentPage(page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setSearchOpen(false)}>
            Tutup
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setSearchOpen(false)}
            disabled={!selectedTreatment}
          >
            Pilih Treatment Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* RACI Table */}
      {selectedTreatment && (
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.main' }}>
                      <TableCell 
                        sx={{ 
                          color: 'white', 
                          fontWeight: 'bold',
                          minWidth: 200,
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'primary.main',
                          zIndex: 10
                        }}
                      >
                        Aktivitas Treatment / Role
                      </TableCell>
                      {users.map(user => (
                        <TableCell 
                          key={user.id}
                          align="center"
                          sx={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            minWidth: 120
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2">
                              {user.name}
                            </Typography>
                            <Typography variant="caption">
                              {user.role}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                      {editMode && (
                        <TableCell 
                          align="center"
                          sx={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            minWidth: 80
                          }}
                        >
                          Aksi
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {raciData.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'white',
                            zIndex: 5
                          }}
                        >
                          {editMode ? (
                            <TextField
                              value={row.activity}
                              onChange={(e) => {
                                const newData = [...raciData];
                                newData[index].activity = e.target.value;
                                setRaciData(newData);
                              }}
                              size="small"
                              fullWidth
                            />
                          ) : (
                            row.activity
                          )}
                        </TableCell>
                        {users.map(user => (
                          <TableCell 
                            key={user.id} 
                            align="center"
                            sx={{ 
                              backgroundColor: getRACIColor(row[user.id]),
                              cursor: editMode ? 'pointer' : 'default',
                              minWidth: 120,
                              '&:hover': editMode ? { opacity: 0.8 } : {}
                            }}
                            onClick={() => editMode && setEditingCell({ activity: row.activity, userId: user.id })}
                          >
                            <Tooltip title={getRACITooltip(row[user.id])} arrow>
                              <Typography 
                                variant="h6" 
                                fontWeight="bold"
                                sx={{ 
                                  color: row[user.id] ? 'black' : 'text.secondary'
                                }}
                              >
                                {row[user.id] || '-'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        ))}
                        {editMode && (
                          <TableCell align="center">
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => removeActivity(row.activity)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* RACI Legend */}
            <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Legenda RACI untuk Treatment Plan:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 20, height: 20, backgroundColor: '#ffeb3b', border: '1px solid #ccc' }} />
                    <Typography variant="body2">
                      <strong>R</strong> - Melaksanakan aktivitas treatment
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 20, height: 20, backgroundColor: '#4caf50', border: '1px solid #ccc' }} />
                    <Typography variant="body2">
                      <strong>A</strong> - Bertanggung jawab atas keberhasilan
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 20, height: 20, backgroundColor: '#2196f3', border: '1px solid #ccc' }} />
                    <Typography variant="body2">
                      <strong>C</strong> - Dikonsultasikan selama implementasi
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 20, height: 20, backgroundColor: '#9e9e9e', border: '1px solid #ccc' }} />
                    <Typography variant="body2">
                      <strong>I</strong> - Diberi update progress
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* RACI Edit Dialog */}
      <Dialog
        open={!!editingCell}
        onClose={() => setEditingCell(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Edit RACI Assignment untuk Treatment Plan
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>RACI Role</InputLabel>
            <Select
              value={editingCell ? raciData.find(r => r.activity === editingCell.activity)?.[editingCell.userId] || '' : ''}
              label="RACI Role"
              onChange={(e) => {
                if (editingCell) {
                  handleRACIChange(editingCell.activity, editingCell.userId, e.target.value);
                }
              }}
            >
              <MenuItem value="">- Tidak ditugaskan -</MenuItem>
              <MenuItem value="R">R - Responsible (Melaksanakan)</MenuItem>
              <MenuItem value="A">A - Accountable (Bertanggung jawab)</MenuItem>
              <MenuItem value="C">C - Consulted (Dikonsultasikan)</MenuItem>
              <MenuItem value="I">I - Informed (Diinformasikan)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCell(null)}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      {!selectedTreatment && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Silakan pilih treatment plan terlebih dahulu untuk menampilkan RACI Chart.
        </Alert>
      )}
    </Box>
  );
};

export default RACIChart;