export const REPORT_TYPES = [
  { value: 'risk_register', label: 'Risk Register' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'treatment_progress', label: 'Treatment Progress' },
  { value: 'incident_report', label: 'Incident Report' },
  { value: 'comprehensive', label: 'Comprehensive Report' },
];

export const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
];

export const DEFAULT_REPORT_CONFIG = {
  reportType: 'risk_register',
  format: 'pdf',
  dateRange: 'all',
};
