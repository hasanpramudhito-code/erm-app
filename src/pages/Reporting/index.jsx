import React, { useEffect, useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAuth } from '../../contexts/AuthContext';
import { useAssessmentConfig } from '../../contexts/AssessmentConfigContext';
import { db } from '../../config/firebase';

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import ReportingHeader from './ReportingHeader';
import ReportingFilters from './ReportingFilters';
import ReportingActions from './ReportingActions';

import { DEFAULT_REPORT_CONFIG } from '../../constants/reporting';
import { fetchRisks } from '../../services/riskService';

const risks = await fetchRisks();

const Reporting = () => {
  const { userData } = useAuth();
  const { 
    assessmentConfig: contextConfig, 
    loading: configLoading, 
    refreshConfig,
    calculateScore,
    calculateRiskLevel // ← AMBIL FUNGSI calculateScore DARI CONTEXT
  } = useAssessmentConfig();

  console.log('🔍 Assessment Config Context:', {
    config: contextConfig,
    loading: configLoading,
    assessmentMethod: contextConfig?.assessmentMethod,
    riskLevels: contextConfig?.riskLevels,
    hasRiskLevels: contextConfig?.riskLevels?.length > 0,
    calculateScoreExists: !!calculateScore
  });

  // State untuk config langsung dari Firestore (verifikasi)
  const [directConfig, setDirectConfig] = useState(null);
  const [loadingDirectConfig, setLoadingDirectConfig] = useState(false);

  // Load config langsung dari Firestore untuk verifikasi
  const loadDirectConfig = useCallback(async () => {
    try {
      setLoadingDirectConfig(true);
      console.log('🔍 Verifying config in Firestore...');
      
      const configDoc = await getDoc(doc(db, 'risk_assessment_config', 'default'));
      
      if (configDoc.exists()) {
        const data = configDoc.data();
        console.log('✅ Direct Firestore config (risk_assessment_config):', {
          assessmentMethod: data.assessmentMethod,
          riskLevels: data.riskLevels,
          likelihoodOptions: data.likelihoodOptions?.length,
          impactOptions: data.impactOptions?.length,
          fullData: data // ← TAMPILKAN SEMUA DATA
        });
        setDirectConfig(data);
      } else {
        console.warn('⚠️ No config found in risk_assessment_config collection');
        setDirectConfig(null);
      }
    } catch (error) {
      console.error('❌ Error loading direct Firestore config:', error);
      setDirectConfig(null);
    } finally {
      setLoadingDirectConfig(false);
    }
  }, []);

  // Load saat component mount untuk verifikasi
  useEffect(() => {
    loadDirectConfig();
  }, [loadDirectConfig]);

  // Tentukan config yang efektif
  const effectiveConfig = React.useMemo(() => {
    // 1. Coba dari context (utama)
    if (contextConfig) {
      console.log('🎯 Using config from context (risk_assessment_config)');
      return contextConfig;
    }
    
    // 2. Fallback
    console.log('🎯 Using fallback config');
    return {
      assessmentMethod: 'coordinate', // ← Default ke coordinate
      matrixSize: 5,
      riskLevels: [
        { min: 1, max: 4, label: 'Sangat Rendah', color: '#4caf50' },
        { min: 5, max: 9, label: 'Rendah', color: '#81c784' },
        { min: 10, max: 14, label: 'Sedang', color: '#ffeb3b' },
        { min: 15, max: 19, label: 'Tinggi', color: '#f57c00' },
        { min: 20, max: 25, label: 'Sangat Tinggi', color: '#d32f2f' }
      ],
      ratingOptions: {
        likelihood: [
          { value: 1, label: '1 - Sangat Rendah' },
          { value: 2, label: '2 - Rendah' },
          { value: 3, label: '3 - Sedang' },
          { value: 4, label: '4 - Tinggi' },
          { value: 5, label: '5 - Sangat Tinggi' }
        ],
        impact: [
          { value: 1, label: '1 - Tidak Signifikan' },
          { value: 2, label: '2 - Minor' },
          { value: 3, label: '3 - Moderat' },
          { value: 4, label: '4 - Signifikan' },
          { value: 5, label: '5 - Kritis' }
        ]
      }
    };
  }, [contextConfig]);

  console.log('🎯 Final Effective Config:', {
    assessmentMethod: effectiveConfig.assessmentMethod,
    source: contextConfig ? 'context' : 'fallback',
    isCoordinate: effectiveConfig.assessmentMethod === 'coordinate',
    isMultiplication: effectiveConfig.assessmentMethod === 'multiplication',
    riskLevels: effectiveConfig.riskLevels
  });

  // DEBUG: Hitung contoh skor untuk verifikasi
  useEffect(() => {
    if (calculateScore && effectiveConfig) {
      console.log('🧪 Testing calculateScore function:');
      
      // Test coordinate method
      const testCoordinate = calculateScore(4, 4); // L4×I4
      console.log('  Coordinate test (L4×I4):', testCoordinate);
      
      // Test multiplication method (jika context config ada)
      if (contextConfig && contextConfig.assessmentMethod === 'multiplication') {
        const testMultiplication = 4 * 4; // Manual calculation
        console.log('  Multiplication test (4×4):', testMultiplication);
      }
    }
  }, [calculateScore, effectiveConfig, contextConfig]);

  const [risks, setRisks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [config, setConfig] = useState(DEFAULT_REPORT_CONFIG);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('📥 Loading risks and incidents...');
        setLoadingData(true);
        
        const riskSnap = await getDocs(collection(db, 'risks'));
        const riskData = riskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('📥 Risks loaded:', riskData.length);
        
        // DEBUG: Lihat beberapa data risiko
        if (riskData.length > 0) {
          const sampleRisk = riskData[0];
          console.log('📊 Sample risk data:', {
            riskCode: sampleRisk.riskCode,
            initialImpact: sampleRisk.initialImpact,
            initialProbability: sampleRisk.initialProbability,
            residualImpact: sampleRisk.residualImpact,
            residualProbability: sampleRisk.residualProbability
          });
        }
        
        const incidentSnap = await getDocs(collection(db, 'incidents'));
        const incidentData = incidentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('📥 Incidents loaded:', incidentData.length);
        
        setRisks(riskData);
        setIncidents(incidentData);
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Fungsi refresh semua config
  const handleRefreshAll = async () => {
    console.log('🔄 Refreshing all configurations...');
    await refreshConfig();
    await loadDirectConfig();
  };

  // Loading state
  if (configLoading || loadingData) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          {configLoading ? 'Loading configuration...' : 'Loading data...'}
        </Typography>
      </Box>
    );
  }

const payload = {
  risks,
  incidents,
  userData,
  reportConfig: config,

  // ⬇️ INI YANG DIPAKAI EXPORT
  assessment: {
    calculateScore,
    calculateRiskLevel
  },

  // ⬇️ INI BOLEH TETAP ADA (UNTUK FILE LAIN)
  assessmentConfig: effectiveConfig
};

  console.log('📦 Final Payload for export:', {
    assessmentMethod: payload.assessmentConfig?.assessmentMethod,
    source: contextConfig ? 'risk_assessment_config' : 'fallback',
    isCoordinate: payload.assessmentConfig?.assessmentMethod === 'coordinate',
    isMultiplication: payload.assessmentConfig?.assessmentMethod === 'multiplication',
    risksCount: payload.risks.length
  });

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <ReportingHeader />
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshAll}
                title="Refresh configuration"
              >
                Refresh Config
              </Button>
              
              {/* Debug button */}
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={loadDirectConfig}
                title="Check Firestore data"
              >
                Check Firestore
              </Button>
            </Box>
          </Box>
          
          {/* INFO BOX dengan warna berbeda berdasarkan method */}
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: effectiveConfig.assessmentMethod === 'coordinate' ? 'primary.light' : 'warning.light', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: effectiveConfig.assessmentMethod === 'coordinate' ? 'primary.main' : 'warning.main'
          }}>
            <Typography variant="subtitle2" fontWeight="bold">
              ⚙️ Current Assessment Configuration
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Box>
                <Typography variant="body2">
                  <strong>Method:</strong>{' '}
                  <Box component="span" sx={{ 
                    color: effectiveConfig.assessmentMethod === 'coordinate' ? 'primary.main' : 'warning.main',
                    fontWeight: 'bold'
                  }}>
                    {effectiveConfig.assessmentMethod === 'coordinate' ? 'Coordinate Matrix' : 'Multiplication'}
                  </Box>
                </Typography>
                <Typography variant="caption" display="block">
                  Source: {contextConfig ? 'risk_assessment_config' : 'fallback'} • 
                  Risk Levels: {effectiveConfig.riskLevels?.length || 0}
                </Typography>
              </Box>
              
              {/* Tampilkan perbedaan antara context dan direct */}
              {directConfig && directConfig.assessmentMethod !== effectiveConfig.assessmentMethod && (
                <Box sx={{ 
                  p: 1, 
                  bgcolor: 'error.light', 
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}>
                  ⚠️ Mismatch: Firestore has "{directConfig.assessmentMethod}"
                </Box>
              )}
            </Box>
          </Box>

          <ReportingFilters
            config={config}
            onChange={setConfig}
          />

          <ReportingActions
            config={config}
            payload={payload}
            key={`${effectiveConfig.assessmentMethod}-${Date.now()}`} // Force re-render
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reporting;