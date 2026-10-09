import React from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ControlRegister from './ControlRegister';
import TestingSchedule from './TestingSchedule';
import TestResults from './TestResults';
import DeficiencyTracking from './DeficiencyTracking';

// Pengujian kontrol dalam satu halaman: register -> jadwal -> hasil -> defisiensi.
export const TAB_KONTROL = [
  ['register', 'Register Kontrol', ControlRegister],
  ['jadwal', 'Jadwal Pengujian', TestingSchedule],
  ['hasil', 'Hasil Pengujian', TestResults],
  ['defisiensi', 'Defisiensi', DeficiencyTracking],
];

const ControlTesting = () => {
  const [params, setParams] = useSearchParams();
  const aktif = TAB_KONTROL.find(([id]) => id === params.get('tab')) || TAB_KONTROL[0];
  const Isi = aktif[2];
  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <ShieldCheck size={36} color="#1976d2" />
        <Box>
          <Typography variant="h4">Pengujian Kontrol</Typography>
          <Typography variant="body2" color="text.secondary">Daftarkan kontrol, jadwalkan pengujian, catat hasil, dan tindak lanjuti defisiensi.</Typography>
        </Box>
      </Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={aktif[0]} onChange={(e, v) => setParams({ tab: v })} variant="scrollable" scrollButtons="auto">
          {TAB_KONTROL.map(([id, label]) => <Tab key={id} value={id} label={label} />)}
        </Tabs>
      </Paper>
      <Isi />
    </Box>
  );
};

export default ControlTesting;
