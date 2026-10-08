import React, { useEffect, useState } from 'react';
import { Badge, Box, Button, IconButton, List, ListItemButton, ListItemText, Popover, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const INTERVAL_MS = 60 * 1000;

// Lonceng notifikasi persetujuan. ponytail: polling 1 menit; ganti SSE/WebSocket bila perlu real-time.
const LoncengNotifikasi = ({ sx }) => {
  const [daftar, setDaftar] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();

  const muat = () => api.get('/persetujuan/notifikasi').then(setDaftar).catch(() => {});
  useEffect(() => {
    muat();
    const t = setInterval(muat, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const belum = daftar.filter((n) => !n.dibaca);
  const tandaiBaca = (ids) => api.post('/persetujuan/notifikasi/baca', ids ? { ids } : {}).then(muat);

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={sx} aria-label={`Notifikasi, ${belum.length} belum dibaca`}>
        <Badge badgeContent={belum.length} color="error"><Bell size={20} /></Badge>
      </IconButton>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Box sx={{ width: 360, maxHeight: 420, overflow: 'auto' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1}>
            <Typography variant="subtitle1">Notifikasi</Typography>
            {belum.length > 0 && <Button size="small" onClick={() => tandaiBaca()}>Tandai semua dibaca</Button>}
          </Box>
          {daftar.length === 0 && <Typography variant="body2" color="text.secondary" px={2} pb={2}>Belum ada notifikasi.</Typography>}
          <List dense disablePadding>
            {daftar.map((n) => (
              <ListItemButton
                key={n.id}
                sx={{ bgcolor: n.dibaca ? 'transparent' : 'action.hover' }}
                onClick={() => { tandaiBaca([n.id]); setAnchor(null); if (n.tautan) navigate(n.tautan); }}
              >
                <ListItemText primary={n.pesan} secondary={new Date(n.dibuat_pada).toLocaleString('id-ID')} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
};

export default LoncengNotifikasi;
