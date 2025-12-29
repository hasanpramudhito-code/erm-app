import React from 'react';
import { Button, Box, Alert } from '@mui/material';
import {
  exportRiskRegisterPDF,
  exportRiskRegisterExcel,
} from '../../services/reporting/exportRiskRegister';

import { exportExecutiveSummaryPDF } from '../../services/reporting/exportExecutiveSummary';
import { exportTreatmentProgressPDF } from '../../services/reporting/exportTreatmentProgress';
import { exportIncidentReportPDF } from '../../services/reporting/exportIncidentReport';
import { exportComprehensivePDF } from '../../services/reporting/exportComprehensive';
import { fetchTreatmentPlans } from '../../services/treatmentService';

import { fetchRisks } from '../../services/riskService';

const risks = await fetchRisks();


const ReportingActions = ({ config, payload }) => {
  const filteredRisks = payload?.risks || [];

  // DEBUG: Cek apa yang diterima
  console.log('📥 [ReportingActions] Full payload:', payload);
  console.log('📥 [ReportingActions] Assessment Config:', payload?.assessmentConfig);
  console.log('📥 [ReportingActions] Config object:', config);
  console.log('📥 [ReportingActions] Report Type:', config?.reportType);
  console.log('📥 [ReportingActions] Format:', config?.format);

const handleGenerate = async () => {
  try {
    console.log('🚀 [ReportingActions] Starting report generation...');

    // ===============================
    // 🔥 FETCH TREATMENT PLANS
    // ===============================
    const treatmentPlans = await fetchTreatmentPlans();

    console.log(
      '🧩 [ReportingActions] Treatment plans fetched:',
      treatmentPlans.length
    );

    // ===============================
    // 🔥 BUILD FINAL PAYLOAD
    // ===============================
    const exportPayload = {
      risks: filteredRisks,
      incidents: payload?.incidents || [],
      userData: payload?.userData || { name: 'Unknown User' },
      reportConfig: payload?.reportConfig || {},
      treatmentPlans, // ✅ SEKARANG ADA ISINYA
      assessment: payload?.assessment,
      assessmentConfig: payload?.assessmentConfig
    };

    console.log('🎯 [ReportingActions] Final export payload:', exportPayload);

    // ===============================
    // 🔥 ROUTING EXPORT
    // ===============================
    if (config?.reportType === 'risk_register') {
      if (config?.format === 'pdf') {
        await exportRiskRegisterPDF(exportPayload);
      } else {
        await exportRiskRegisterExcel({
          risks: filteredRisks,
          userData: exportPayload.userData,
          assessmentConfig: exportPayload.assessmentConfig
        });
      }
    }

    if (config?.reportType === 'executive_summary') {
      await exportExecutiveSummaryPDF(exportPayload);
    }

    if (config?.reportType === 'treatment_progress') {
      await exportTreatmentProgressPDF(exportPayload);
    }

    if (config?.reportType === 'incident_report') {
      await exportIncidentReportPDF(exportPayload);
    }

    if (config?.reportType === 'comprehensive') {
      await exportComprehensivePDF(exportPayload);
    }

    console.log('✅ [ReportingActions] Report generation completed!');
  } catch (error) {
    console.error('❌ [ReportingActions] Report generation failed:', error);
    alert(`Export failed: ${error.message}`);
  }
};


  return (
    <Box sx={{ mt: 3 }}>
      {!payload?.assessmentConfig && (
        <Alert severity="info" sx={{ mb: 2 }}>
          ℹ️ Using coordinate matrix method for risk calculation.
        </Alert>
      )}
      
      <Button 
        variant="contained" 
        onClick={handleGenerate}
        fullWidth
        size="large"
        sx={{ 
          py: 1.5,
          fontWeight: 'bold',
          fontSize: '1rem'
        }}
      >
        Generate Report
      </Button>
    </Box>
  );
};

console.log('🚀 [ReportingActions] Starting report generation...');

// 🔥 FETCH TREATMENT PLANS
const treatmentPlans = await fetchTreatmentPlans();

console.log(
  '[ReportingActions] treatmentPlans:',
  treatmentPlans.length
);


export default ReportingActions;