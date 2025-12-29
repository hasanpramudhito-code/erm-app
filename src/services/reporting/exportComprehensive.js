import { exportRiskRegisterPDF } from './exportRiskRegister';
import { exportExecutiveSummaryPDF } from './exportExecutiveSummary';
import { exportTreatmentProgressPDF } from './exportTreatmentProgress';


export const exportComprehensivePDF = async (payload) => {
  await exportExecutiveSummaryPDF(payload);
  await exportRiskRegisterPDF(payload);
  await exportTreatmentProgressPDF(payload);
};
