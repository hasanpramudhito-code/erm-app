import React from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { Building2, Network, Settings, Settings2, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OrganizationStructure from '../components/OrganizationStructure';
import UserManagement from './UserManagement';
import RiskParameterSettings from './RiskParameterSettings';
import SystemSettings from '../components/SystemSettings';

// Satu tempat untuk struktur organisasi, pengguna & peran, parameter risiko, dan pengaturan sistem.
const TAB = [
  { id: 'structure', label: 'Struktur Organisasi', icon: <Network size={18} />, peran: ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO'], isi: () => <OrganizationStructure /> },
  { id: 'users', label: 'Pengguna & Peran', icon: <Users size={18} />, peran: ['ADMIN', 'DIREKSI'], isi: () => <UserManagement tersemat /> },
  { id: 'risk-params', label: 'Parameter Risiko', icon: <Settings2 size={18} />, peran: ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO'], isi: () => <RiskParameterSettings /> },
  { id: 'system-settings', label: 'Pengaturan Sistem', icon: <Settings size={18} />, peran: ['ADMIN'], isi: () => <SystemSettings /> },
];

const Organization = () => {
  const { userData } = useAuth();
  const [params, setParams] = useSearchParams();
  const tersedia = TAB.filter((t) => t.peran.some((p) => userData?.peran?.includes(p)));
  const aktif = tersedia.find((t) => t.id === params.get('tab')) || tersedia[0];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Building2 size={36} color="#1976d2" />
        <Box>
          <Typography variant="h4">Organisasi</Typography>
          <Typography variant="body2" color="text.secondary">Unit kerja, pengguna & peran, parameter risiko, dan pengaturan sistem.</Typography>
        </Box>
      </Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={aktif?.id || false} onChange={(e, v) => setParams({ tab: v })} variant="scrollable" scrollButtons="auto">
          {tersedia.map((t) => <Tab key={t.id} value={t.id} icon={t.icon} iconPosition="start" label={t.label} />)}
        </Tabs>
      </Paper>
      {aktif ? aktif.isi() : <Typography color="text.secondary">Anda tidak memiliki akses ke halaman ini.</Typography>}
    </Box>
  );
};

export default Organization;
