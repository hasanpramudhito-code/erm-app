import { Box, MenuItem, TextField } from '@mui/material';
import { REPORT_TYPES, REPORT_FORMATS } from '../../constants/reporting';

const ReportingFilters = ({ config, onChange }) => (
  <Box display="flex" gap={2} mb={2}>
    <TextField
      select
      label="Jenis Laporan"
      value={config.reportType}
      onChange={(e) => onChange({ ...config, reportType: e.target.value })}
      fullWidth
    >
      {REPORT_TYPES.map(o => (
        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
      ))}
    </TextField>

    <TextField
      select
      label="Format"
      value={config.format}
      onChange={(e) => onChange({ ...config, format: e.target.value })}
      fullWidth
    >
      {REPORT_FORMATS.map(o => (
        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
      ))}
    </TextField>
  </Box>
);

export default ReportingFilters;
