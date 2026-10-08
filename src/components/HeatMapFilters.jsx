import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Typography,
  Grid,
  Autocomplete
} from '@mui/material';
import {
  Filter,
  Eraser as ClearAll,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Grid as GridIcon,
  Building
} from 'lucide-react';

const HeatMapFilters = ({
  filters,
  onFilterChange,
  organizationUnits = [],
  categories = [],
  levels = [],
  onExport,
  exportLoading = false
}) => {
  const [localFilters, setLocalFilters] = useState({
    department: 'all',
    category: 'all',
    timeRange: 'all',
    riskLevel: 'all',
    search: '',
    ...filters
  });

  // Risk categories
  const riskCategories = categories;

  // Time ranges
  const timeRanges = [
    { value: 'all', label: 'Semua Waktu' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'week', label: '7 Hari Terakhir' },
    { value: 'month', label: '30 Hari Terakhir' },
    { value: 'quarter', label: '3 Bulan Terakhir' },
    { value: 'year', label: '1 Tahun Terakhir' }
  ];

  // Risk levels
  const riskLevels = [
    { value: 'all', label: 'Semua Level' },
    ...levels.map((l) => ({ value: l.label, label: l.label, color: l.color }))
  ];

  // Handle filter change
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Reset all filters
  const handleReset = () => {
    const resetFilters = {
      department: 'all',
      category: 'all',
      timeRange: 'all',
      riskLevel: 'all',
      search: ''
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  // Active filter count
  const activeFilterCount = Object.entries(localFilters).filter(
    ([key, value]) => key !== 'search' && value !== 'all' && value !== ''
  ).length;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Filter size={20} color="#1976d2" />
          <Typography variant="h6" fontWeight="bold">
            Filter Heat Map
          </Typography>
          {activeFilterCount > 0 && (
            <Chip
              label={`${activeFilterCount} aktif`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Tooltip title="Reset semua filter">
            <IconButton
              size="small"
              onClick={handleReset}
              disabled={activeFilterCount === 0}
            >
              <ClearAll size={18} />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={onExport}
            disabled={exportLoading}
            size="small"
          >
            Export
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Filter Grid */}
      <Grid container spacing={2}>
        {/* Department Filter */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Building size={16} />
                <span>Departemen</span>
              </Box>
            </InputLabel>
            <Select
              value={localFilters.department}
              label="Departemen"
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <MenuItem value="all">
                <em>Semua Departemen</em>
              </MenuItem>
              {organizationUnits.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Category Filter */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>
              <Box display="flex" alignItems="center" gap={0.5}>
                <GridIcon size={16} />
                <span>Kategori</span>
              </Box>
            </InputLabel>
            <Select
              value={localFilters.category}
              label="Kategori"
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <MenuItem value="all">
                <em>Semua Kategori</em>
              </MenuItem>
              {riskCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Time Range Filter */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Calendar size={16} />
                <span>Periode Waktu</span>
              </Box>
            </InputLabel>
            <Select
              value={localFilters.timeRange}
              label="Periode Waktu"
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              {timeRanges.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Risk Level Filter */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>
              <Box display="flex" alignItems="center" gap={0.5}>
                {localFilters.riskLevel === 'high' || localFilters.riskLevel === 'extreme' ? (
                  <TrendingUp size={16} color="#d32f2f" />
                ) : (
                  <TrendingDown size={16} color="#2e7d32" />
                )}
                <span>Tingkat Risiko</span>
              </Box>
            </InputLabel>
            <Select
              value={localFilters.riskLevel}
              label="Tingkat Risiko"
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
            >
              {riskLevels.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {level.color && (
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: level.color,
                          borderRadius: '50%'
                        }}
                      />
                    )}
                    {level.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Search Box */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            placeholder="Cari risiko berdasarkan kode, deskripsi, atau owner..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, color: 'text.secondary' }}>
                  🔍
                </Box>
              )
            }}
          />
        </Grid>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="caption" color="textSecondary">
                Filter aktif:
              </Typography>
              {localFilters.department !== 'all' && (
                <Chip
                  label={`Dept: ${organizationUnits.find(u => u.id === localFilters.department)?.name || localFilters.department}`}
                  size="small"
                  onDelete={() => handleFilterChange('department', 'all')}
                />
              )}
              {localFilters.category !== 'all' && (
                <Chip
                  label={`Kategori: ${riskCategories.find((c) => c.id === localFilters.category)?.name || localFilters.category}`}
                  size="small"
                  onDelete={() => handleFilterChange('category', 'all')}
                />
              )}
              {localFilters.timeRange !== 'all' && (
                <Chip
                  label={`Waktu: ${timeRanges.find(t => t.value === localFilters.timeRange)?.label}`}
                  size="small"
                  onDelete={() => handleFilterChange('timeRange', 'all')}
                />
              )}
              {localFilters.riskLevel !== 'all' && (
                <Chip
                  label={`Level: ${riskLevels.find(l => l.value === localFilters.riskLevel)?.label}`}
                  size="small"
                  onDelete={() => handleFilterChange('riskLevel', 'all')}
                />
              )}
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default HeatMapFilters;