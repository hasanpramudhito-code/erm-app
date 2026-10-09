import React, { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Grid, LinearProgress, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import { api } from '../../services/api';
import { usePeriode } from '../../services/risiko';
import { KepalaPantauan, PilihPeriode } from '../../components/pantauan/Kerangka';
import RiskToleranceSettings, { teksBatas } from './RiskToleranceSettings';

// Posisi skor residual terhadap batas: dalam selera (≤ maks rendah), mendekati (≤ maks sedang), melampaui.
const posisi = (skor, b) => (skor <= b.rendah.maks ? 'dalam' : skor <= b.sedang.maks ? 'mendekati' : 'melampaui');
const POSISI = [['dalam', 'Dalam selera', 'success'], ['mendekati', 'Mendekati batas', 'warning'], ['melampaui', 'Melampaui', 'error']];

// Selera risiko: tab Kepatuhan (posisi skor residual) dan tab Pengaturan (pernyataan & batas toleransi).
const RiskAppetiteDashboard = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'pengaturan' ? 'pengaturan' : 'kepatuhan';
  const { daftar, periodeId, setPeriodeId } = usePeriode();
  const [pernyataan, setPernyataan] = useState([]);
  const [risiko, setRisiko] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/pernyataan-selera-risiko').then((d) => setPernyataan(d.filter((p) => p.aktif))).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (periodeId) api.get(`/risiko?periode_id=${periodeId}`).then(setRisiko).catch((e) => setError(e.message));
  }, [periodeId]);

  // Pernyataan tanpa kategori berlaku untuk risiko yang kategorinya tidak punya pernyataan sendiri.
  const kategoriKhusus = new Set(pernyataan.map((p) => p.kategori_id).filter(Boolean));
  const kartu = pernyataan.map((p) => {
    const cocok = risiko.filter((r) => (p.kategori_id ? r.kategori_id === p.kategori_id : !kategoriKhusus.has(r.kategori_id)));
    const skor = cocok.map((r) => r.penilaian.find((x) => x.jenis === 'RESIDUAL')?.skor).filter((s) => s != null);
    const hitung = Object.fromEntries(POSISI.map(([k]) => [k, skor.filter((s) => posisi(s, p.batas_toleransi) === k).length]));
    return { p, hitung, total: skor.length, tanpaSkor: cocok.length - skor.length };
  });
  const total = kartu.reduce((t, k) => t + k.total, 0);
  const dalam = kartu.reduce((t, k) => t + k.hitung.dalam, 0);
  const persen = total ? Math.round((dalam / total) * 100) : 0;

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<Target size={36} color="#1976d2" />} judul="Selera Risiko"
        keterangan="Posisi skor residual risiko terhadap batas toleransi tiap kategori.">
        {tab === 'kepatuhan' && <PilihPeriode daftar={daftar} value={periodeId} onChange={setPeriodeId} />}
      </KepalaPantauan>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setParams({ tab: v })}>
          <Tab value="kepatuhan" label="Kepatuhan" />
          <Tab value="pengaturan" label="Pernyataan & Toleransi" />
        </Tabs>
      </Paper>
      {tab === 'pengaturan' ? <RiskToleranceSettings /> : (<>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {pernyataan.length === 0 && <Alert severity="info">Belum ada pernyataan selera risiko. Tambahkan di tab Pernyataan & Toleransi.</Alert>}

      {total > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Kepatuhan keseluruhan</Typography>
            <LinearProgress variant="determinate" value={persen} color="success" sx={{ height: 10, borderRadius: 5 }} aria-label="Persentase risiko dalam selera" />
            <Typography variant="body2" mt={1}>{persen}% risiko ({dalam} dari {total}) dalam selera risiko</Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {kartu.map(({ p, hitung, total: n, tanpaSkor }) => (
          <Grid item xs={12} md={6} key={p.id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{p.kategori?.nama || 'Kategori lainnya'}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>{p.pernyataan}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>Batas skor: {teksBatas(p.batas_toleransi)}</Typography>
                {POSISI.map(([k, label, warna]) => (
                  <Box key={k} display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="body2" sx={{ width: 130 }}>{label}</Typography>
                    <LinearProgress variant="determinate" color={warna} value={n ? (hitung[k] / n) * 100 : 0} sx={{ flex: 1, height: 8, borderRadius: 4 }} aria-label={label} />
                    <Typography variant="body2" sx={{ width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{hitung[k]}</Typography>
                  </Box>
                ))}
                {tanpaSkor > 0 && <Typography variant="caption" color="text.secondary">{tanpaSkor} risiko belum punya skor residual</Typography>}
                {p.proses_eskalasi && <Typography variant="body2" mt={1}><strong>Eskalasi:</strong> {p.proses_eskalasi}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      </>)}
    </Box>
  );
};

export default RiskAppetiteDashboard;
