import React, { useState } from 'react';
import { Button, Box, Alert, CircularProgress } from '@mui/material';

import { fetchTreatmentPlans } from '../../services/treatmentService';

const ReportingActions = ({ config, payload }) => {
  const [generating, setGenerating] = useState(false);
  const filteredRisks = payload?.risks || [];

  const handleGenerate = async () => {
    try {
      setGenerating(true);

      const treatmentPlans = await fetchTreatmentPlans();

      const exportPayload = {
        risks: filteredRisks,
        incidents: payload?.incidents || [],
        userData: payload?.userData || { name: 'Unknown User' },
        reportConfig: payload?.reportConfig || {},
        treatmentPlans,
        assessment: payload?.assessment,
        assessmentConfig: payload?.assessmentConfig
      };

      if (config?.reportType === 'risk_register') {
        if (config?.format === 'pdf') {
          const mod = await import('../../services/reporting/exportRiskRegister');
          await mod.exportRiskRegisterPDF(exportPayload);
        } else {
          const mod = await import('../../services/reporting/exportRiskRegister');
          await mod.exportRiskRegisterExcel({
            risks: filteredRisks,
            userData: exportPayload.userData,
            assessmentConfig: exportPayload.assessmentConfig
          });
        }
      } else if (config?.reportType === 'executive_summary') {
        const mod = await import('../../services/reporting/exportExecutiveSummary');
        await mod.exportExecutiveSummaryPDF(exportPayload);
      } else if (config?.reportType === 'treatment_progress') {
        const mod = await import('../../services/reporting/exportTreatmentProgress');
        await mod.exportTreatmentProgressPDF(exportPayload);
      } else if (config?.reportType === 'incident_report') {
        const mod = await import('../../services/reporting/exportIncidentReport');
        await mod.exportIncidentReportPDF(exportPayload);
      } else if (config?.reportType === 'comprehensive') {
        const mod = await import('../../services/reporting/exportComprehensive');
        await mod.exportComprehensivePDF(exportPayload);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      {!payload?.assessmentConfig && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Using coordinate matrix method for risk calculation.
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleGenerate}
        fullWidth
        size="large"
        disabled={generating}
        startIcon={generating ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {generating ? 'Generating...' : 'Generate Report'}
      </Button>
    </Box>
  );
};

export default ReportingActions;
