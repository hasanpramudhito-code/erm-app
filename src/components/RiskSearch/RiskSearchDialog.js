// File: src/components/RiskSearch/RiskSearchDialog.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Box,
  Typography,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Search,
  Warning,
  TrendingUp,
  Assessment
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const RiskSearchDialog = ({ open, onClose, onRiskSelect }) => {
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load risks
  const loadRisks = async () => {
    try {
      setLoading(true);
      const risksQuery = query(collection(db, 'risks'), orderBy('title'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        risksList.push({ id: doc.id, ...doc.data() });
      });
      setRisks(risksList);
      setFilteredRisks(risksList);
    } catch (error) {
      console.error('Error loading risks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRisks();
    }
  }, [open]);

  // Filter risks based on search term and category
  useEffect(() => {
    let filtered = risks;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(risk => 
        (risk.title && risk.title.toLowerCase().includes(term)) ||
        (risk.riskDescription && risk.riskDescription.toLowerCase().includes(term)) ||
        (risk.riskCode && risk.riskCode.toLowerCase().includes(term)) ||
        (risk.category && risk.category.toLowerCase().includes(term))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(risk => risk.category === selectedCategory);
    }

    setFilteredRisks(filtered);
  }, [searchTerm, selectedCategory, risks]);

  // Get unique categories
  const categories = ['all', ...new Set(risks.map(risk => risk.category).filter(Boolean))];

  // Calculate risk level
  const calculateRiskLevel = (risk) => {
    const score = (risk.likelihood || 1) * (risk.impact || 1);
    if (score >= 20) return { level: 'Extreme', color: 'error' };
    if (score >= 16) return { level: 'High', color: 'warning' };
    if (score >= 10) return { level: 'Medium', color: 'info' };
    if (score >= 5) return { level: 'Low', color: 'success' };
    return { level: 'Very Low', color: 'success' };
  };

  const handleRiskSelect = (risk) => {
    onRiskSelect(risk);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Search />
          <Typography variant="h6">Cari Risiko</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary">
          Temukan risiko dengan pencarian real-time ({risks.length} risiko tersedia)
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {/* Search Box */}
        <TextField
          fullWidth
          placeholder="Cari berdasarkan kode, judul, deskripsi, atau kategori risiko..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Category Filter */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.slice(0, 8).map(category => (
            <Chip
              key={category}
              label={category === 'all' ? 'Semua Kategori' : category}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              color={selectedCategory === category ? 'primary' : 'default'}
              onClick={() => setSelectedCategory(category)}
              size="small"
            />
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Results */}
        {loading ? (
          <Box textAlign="center" py={3}>
            <CircularProgress />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Memuat data risiko...
            </Typography>
          </Box>
        ) : filteredRisks.length === 0 ? (
          <Alert severity="info">
            {searchTerm ? 'Tidak ada risiko yang sesuai dengan pencarian.' : 'Tidak ada risiko yang tersedia.'}
          </Alert>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredRisks.slice(0, 50).map((risk) => {
              const riskLevel = calculateRiskLevel(risk);
              
              return (
                <ListItem key={risk.id} disablePadding>
                  <ListItemButton 
                    onClick={() => handleRiskSelect(risk)}
                    sx={{ 
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {risk.title || risk.riskDescription}
                          </Typography>
                          <Chip 
                            label={riskLevel.level}
                            color={riskLevel.color}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            {risk.riskCode && `Kode: ${risk.riskCode} • `}
                            Kategori: {risk.category || 'Tidak ada'}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {risk.riskDescription || 'Tidak ada deskripsi'}
                          </Typography>
                          <Box display="flex" gap={2} mt={1}>
                            <Typography variant="caption">
                              Likelihood: {risk.likelihood || 1}
                            </Typography>
                            <Typography variant="caption">
                              Impact: {risk.impact || 1}
                            </Typography>
                            <Typography variant="caption" fontWeight="bold">
                              Score: {(risk.likelihood || 1) * (risk.impact || 1)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
            
            {filteredRisks.length > 50 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Menampilkan 50 dari {filteredRisks.length} risiko. Gunakan pencarian untuk menyempitkan hasil.
              </Alert>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RiskSearchDialog;