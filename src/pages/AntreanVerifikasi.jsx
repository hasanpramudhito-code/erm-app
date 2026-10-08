import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Paper, Snackbar, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, Typography
} from '@mui/material';
import { CheckSquare } from 'lucide-react';
import { api } from '../services/api';
import { LABEL_PERSETUJUAN } from '../services/risiko';
import AksiPersetujuan from '../components/persetujuan/AksiPersetujuan';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Antrean data yang menunggu persetujuan pengguna ini: pimpinan (DIAJUKAN di unitnya), pengelola risiko (DISETUJUI_PIMPINAN).
const AntreanVerifikasi = () => {
  const [data, setData] = useState({ risiko: [], pemantauan: [] });
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pilih, setPilih] = useState([]);
  const [pesan, setPesan] = useState('');

  const muat = () => {
    setLoading(true);
    setPilih([]);
    api.get('/persetujuan/antrean').then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(muat, []);

  const entitas = tab === 0 ? 'risiko' : 'pemantauan';
  const daftar = data[entitas];
  // Aksi massal hanya untuk satu status sekaligus agar aksinya jelas.
  const statusPilihan = [...new Set(daftar.filter((d) => pilih.includes(d.id)).map((d) => d.status_persetujuan))];
  const aksiMassal = statusPilihan.length === 1 ? (statusPilihan[0] === 'DIAJUKAN' ? 'setujui' : 'finalkan') : null;

  const prosesMassal = async () => {
    try {
      const hasil = await api.post('/persetujuan/massal', { entitas, aksi: aksiMassal, ids: pilih });
      const gagal = hasil.filter((h) => !h.ok);
      setPesan(`${hasil.length - gagal.length} berhasil${gagal.length ? `, ${gagal.length} gagal: ${gagal[0].error}` : ''}`);
      muat();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = (id) => setPilih((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CheckSquare size={40} color="#1976d2" />
            <Box>
              <Typography variant="h4">Antrean Verifikasi</Typography>
              <Typography variant="body2" color="text.secondary">
                Risk register dan laporan pemantauan bulanan yang menunggu persetujuan Anda
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(e, v) => { setTab(v); setPilih([]); }} sx={{ mb: 2 }}>
        <Tab label={`Risk Register (${data.risiko.length})`} />
        <Tab label={`Laporan Bulanan (${data.pemantauan.length})`} />
      </Tabs>

      {pilih.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} action={aksiMassal && (
          <Button color="inherit" size="small" onClick={prosesMassal}>
            {aksiMassal === 'setujui' ? 'Setujui' : 'Verifikasi Final'} {pilih.length} terpilih
          </Button>
        )}>
          {pilih.length} dipilih{!aksiMassal && ' — pilih data dengan status yang sama untuk aksi massal'}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={daftar.length > 0 && pilih.length === daftar.length}
                    indeterminate={pilih.length > 0 && pilih.length < daftar.length}
                    onChange={(e) => setPilih(e.target.checked ? daftar.map((d) => d.id) : [])}
                    inputProps={{ 'aria-label': 'Pilih semua' }}
                  />
                </TableCell>
                {tab === 1 && <TableCell>Bulan</TableCell>}
                <TableCell>Kode</TableCell>
                <TableCell>Risiko</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              ) : daftar.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">Tidak ada yang menunggu persetujuan Anda.</TableCell></TableRow>
              ) : daftar.map((d) => {
                const r = tab === 0 ? d : d.risiko;
                return (
                  <TableRow key={d.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox checked={pilih.includes(d.id)} onChange={() => toggle(d.id)} inputProps={{ 'aria-label': `Pilih ${r.kode}` }} />
                    </TableCell>
                    {tab === 1 && <TableCell>{NAMA_BULAN[d.bulan - 1]} {d.tahun}</TableCell>}
                    <TableCell><strong>{r.kode}</strong></TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      {r.deskripsi || r.nama}
                      {tab === 1 && d.peristiwa_terjadi && <Chip size="small" color="warning" label="Peristiwa terjadi" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{r.unit?.nama}</TableCell>
                    <TableCell><Chip size="small" label={LABEL_PERSETUJUAN[d.status_persetujuan]} /></TableCell>
                    <TableCell>
                      <AksiPersetujuan entitas={entitas} id={d.id} status={d.status_persetujuan} unitId={r.unit_id} onSelesai={muat} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Snackbar open={!!pesan} autoHideDuration={5000} onClose={() => setPesan('')} message={pesan} />
    </Box>
  );
};

export default AntreanVerifikasi;
