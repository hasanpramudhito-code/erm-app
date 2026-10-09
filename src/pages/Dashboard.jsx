import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { usePeriode, namaMasa } from '../services/risiko';
import { useIdentitas } from '../services/identitas';
import { BarisKpi, PilihPeriode } from '../components/pantauan/Kerangka';

const PERAN_VERIFIKASI = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'PIMPINAN'];
const LIHAT_SEMUA = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'AUDITOR'];

// Beranda: angka untuk cakupan pengguna dan pekerjaan yang menunggunya.
const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const identitas = useIdentitas();
  const { daftar, periodeId, setPeriodeId } = usePeriode();
  const [data, setData] = useState(null);
  const [antrean, setAntrean] = useState(0);
  const [error, setError] = useState('');
  const peran = userData?.peran || [];
  const ada = (d) => d.some((p) => peran.includes(p));

  useEffect(() => {
    if (!periodeId) return;
    api.get(`/ringkasan/dashboard?periode_id=${periodeId}`).then(setData).catch((e) => setError(e.message));
  }, [periodeId]);
  useEffect(() => {
    if (ada(PERAN_VERIFIKASI)) api.get('/persetujuan/antrean').then((a) => setAntrean(a.risiko.length + a.pemantauan.length)).catch(() => {});
  }, [peran.join()]);

  const m = data?.masa_laporan;
  const tugas = data ? [
    data.perlu_dilengkapi > 0 && { teks: `${data.perlu_dilengkapi} risiko masih draf atau dikembalikan`, aksi: 'Buka Register Risiko', ke: '/risk-register' },
    data.laporan_belum_diajukan > 0 && { teks: `${data.laporan_belum_diajukan} laporan pemantauan ${namaMasa(m.tahun, m.bulan, m.frekuensi)} belum diajukan`, aksi: 'Buka Pemantauan', ke: '/pemantauan' },
    antrean > 0 && { teks: `${antrean} entri menunggu persetujuan Anda`, aksi: 'Buka Antrean Verifikasi', ke: '/approval' },
    data.belum_dinilai > 0 && { teks: `${data.belum_dinilai} risiko belum punya penilaian residual`, aksi: 'Buka Register Risiko', ke: '/risk-register' },
  ].filter(Boolean) : [];
  const totalLevel = data?.sebaran.reduce((t, s) => t + s.jumlah, 0) || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4">Selamat datang, {userData?.nama}</Typography>
          <Typography variant="body2" color="text.secondary">
            {identitas.namaUnit}{!ada(LIHAT_SEMUA) && ' · angka di bawah hanya untuk unit kerja Anda'}
          </Typography>
        </Box>
        <PilihPeriode daftar={daftar} value={periodeId} onChange={setPeriodeId} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {data && (
        <>
          <BarisKpi data={[
            { label: 'Risiko terdaftar', nilai: data.total_risiko, ket: `${data.risiko_final} sudah final` },
            { label: 'Risiko residual tinggi', nilai: data.risiko_tinggi, ket: 'Dua level teratas' },
            { label: 'Mitigasi berjalan', nilai: data.mitigasi_aktif },
            { label: 'Menunggu tindakan', nilai: tugas.length },
          ]} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Perlu dikerjakan</Typography>
                {tugas.length === 0 ? (
                  <Typography color="text.secondary">Tidak ada pekerjaan yang menunggu.</Typography>
                ) : (
                  <List dense disablePadding>
                    {tugas.map((t) => (
                      <ListItem key={t.teks} divider secondaryAction={<Button size="small" onClick={() => navigate(t.ke)}>{t.aksi}</Button>}>
                        <ListItemText primary={t.teks} sx={{ pr: 22 }} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Sebaran level residual</Typography>
                  {data.sebaran.slice().reverse().map((s) => (
                    <Box key={s.level} display="flex" alignItems="center" gap={1} mb={0.75}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: s.warna, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ width: 110 }}>{s.level}</Typography>
                      <Box sx={{ flex: 1, height: 8, bgcolor: 'grey.200', borderRadius: 1 }}>
                        <Box sx={{ width: `${totalLevel ? (s.jumlah / totalLevel) * 100 : 0}%`, height: '100%', bgcolor: s.warna, borderRadius: 1 }} />
                      </Box>
                      <Typography variant="body2" sx={{ width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.jumlah}</Typography>
                    </Box>
                  ))}
                  {data.belum_dinilai > 0 && <Typography variant="caption" color="text.secondary">{data.belum_dinilai} risiko belum dinilai</Typography>}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
