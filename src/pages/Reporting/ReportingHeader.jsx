import { Typography, Box } from '@mui/material';

const ReportingHeader = () => (
  <Box mb={2}>
    <Typography variant="h4" fontWeight="bold">
      Reporting
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Generate laporan risiko berdasarkan konfigurasi aktif
    </Typography>
  </Box>
);

export default ReportingHeader;
