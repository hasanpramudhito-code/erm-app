import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Grid, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography
} from '@mui/material';
import { BarChart3 } from 'lucide-react';
import { api } from '../services/api';
import { usePeriode, LABEL_STATUS_MITIGASI, LABEL_STATUS_KRI, LABEL_PERSETUJUAN } from '../services/risiko';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';
import { KepalaPantauan, PilihPeriode, BarisKpi, Penanda, rupiahRingkas } from '../components/pantauan/Kerangka';

const SKALA = [1, 2, 3, 4, 5];

// Teks di atas sel berwarna: putih atau tinta sesuai luminans warna sel agar kontras tetap terbaca.
const warnaTeks = (hex) => {
  const [r, g, b] = (hex || '#ffffff').replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.4 ? '#0b0b0b' : '#ffffff';
};

// Matriks 5x5: sel diwarnai level skornya, angka = jumlah risiko. Tooltip & fokus keyboard per sel.
const Matriks = ({ judul, sel, level, calculateScore }) => {
  const levelDari = (s) => level.find((l) => s >= l.skor_min && s <= l.skor_maks);
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>{judul}</Typography>
      <Box display="grid" gridTemplateColumns="28px repeat(5, 1fr)" gap="2px" role="grid" aria-label={judul}>
        {[...SKALA].reverse().map((k) => (
          <React.Fragment key={k}>
            <Typography variant="caption" color="text.secondary" alignSelf="center" textAlign="center">K{k}</Typography>
            {SKALA.map((d) => {
              const skor = calculateScore(k, d);
              const lv = levelDari(skor);
              const n = sel[`${k}-${d}`] || 0;
              return (
                <Tooltip key={d} arrow title={`Kemungkinan ${k} · Dampak ${d} · skor ${skor} (${lv?.nama || '-'}): ${n} risiko`}>
                  <Box tabIndex={0} role="gridcell" sx={{
                    aspectRatio: '1.4', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px',
                    bgcolor: lv?.warna || '#eee', opacity: n ? 1 : 0.35, color: warnaTeks(lv?.warna),
                    fontWeight: 600, fontSize: 18, '&:hover, &:focus-visible': { outline: '2px solid #0b0b0b', outlineOffset: -2 },
                  }}>
                    {n || ''}
                  </Box>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
        <span />
        {SKALA.map((d) => <Typography key={d} variant="caption" color="text.secondary" textAlign="center">D{d}</Typography>)}
      </Box>
    </Paper>
  );
};

// Distribusi status: baris label + nilai + bar tipis (bukan pie), urutan tetap.
const Distribusi = ({ judul, data, urutan, label }) => {
  const total = urutan.reduce((t, k) => t + (data[k] || 0), 0);
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>{judul}</Typography>
      {!total ? <Typography variant="body2" color="text.secondary">Belum ada data.</Typography> : urutan.map((k) => (
        <Box key={k} mb={1.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">{label[k]}</Typography>
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{data[k] || 0}</Typography>
          </Box>
          <LinearProgress variant="determinate" value={((data[k] || 0) / total) * 100} sx={{ height: 6, borderRadius: 3 }} aria-label={`${label[k]} ${data[k] || 0} dari ${total}`} />
        </Box>
      ))}
    </Paper>
  );
};

const ExecutiveDashboard = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();
  const { calculateScore } = useAssessmentConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!periodeId) return;
    api.get(`/ringkasan/eksekutif?periode_id=${periodeId}`).then(setData).catch((e) => setError(e.message));
  }, [periodeId]);

  const k = data?.kpi;
  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<BarChart3 size={36} color="#1976d2" />} judul="Executive Dashboard"
        keterangan="Profil risiko, efektivitas mitigasi, dan indikator risiko pada periode terpilih">
        <PilihPeriode daftar={daftarPeriode} value={periodeId} onChange={setPeriodeId} />
      </KepalaPantauan>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {k && k.dinilai < k.total_risiko && (
        <Alert severity="info" sx={{ mb: 2 }}>{k.total_risiko - k.dinilai} dari {k.total_risiko} risiko belum dinilai dan tidak tampil di matriks.</Alert>
      )}

      <BarisKpi data={[
        { label: 'Total risiko', nilai: k?.total_risiko ?? '-', ket: k && `${k.final} final` },
        { label: 'Sudah dinilai', nilai: k ? `${k.total_risiko ? Math.round((k.dinilai / k.total_risiko) * 100) : 0}%` : '-' },
        { label: 'Penurunan risiko', nilai: k ? `${k.penurunan_risiko}%` : '-', ket: 'Skor inheren ke residual' },
        { label: 'Rata-rata progres mitigasi', nilai: k ? `${k.rata_progres_mitigasi}%` : '-' },
        { label: 'Peristiwa risiko', nilai: k?.peristiwa ?? '-', ket: k?.kerugian ? `Kerugian ${rupiahRingkas(k.kerugian)}` : undefined },
        { label: 'KRI merah', nilai: data?.kri?.MERAH ?? 0 },
      ]} />

      {data && (
        <>
          <Box display="flex" gap={2} mb={1} flexWrap="wrap" aria-label="Legenda level risiko">
            {data.level.map((l) => <Penanda key={l.nama} warna={l.warna} teks={l.nama} />)}
          </Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}><Matriks judul="Matriks Risiko Inheren" sel={data.matriks.INHEREN} level={data.level} calculateScore={calculateScore} /></Grid>
            <Grid item xs={12} md={6}><Matriks judul="Matriks Risiko Residual" sel={data.matriks.RESIDUAL} level={data.level} calculateScore={calculateScore} /></Grid>
          </Grid>

          <Paper sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ p: 2, pb: 0 }}>10 Risiko Teratas (residual)</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kode</TableCell><TableCell>Risiko</TableCell><TableCell>Unit Kerja</TableCell>
                    <TableCell>Inheren</TableCell><TableCell>Residual</TableCell><TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.teratas.length === 0 && <TableRow><TableCell colSpan={6} align="center">Belum ada risiko yang dinilai.</TableCell></TableRow>}
                  {data.teratas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><strong>{r.kode}</strong></TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>{r.nama}</TableCell>
                      <TableCell>{r.unit_kerja}</TableCell>
                      <TableCell>{r.inheren ? <Penanda warna={r.inheren.level.warna} teks={`${r.inheren.level.nama} · ${r.inheren.skor}`} /> : '-'}</TableCell>
                      <TableCell>{r.residual ? <Penanda warna={r.residual.level.warna} teks={`${r.residual.level.nama} · ${r.residual.skor}`} /> : '-'}</TableCell>
                      <TableCell>{LABEL_PERSETUJUAN[r.status]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Distribusi judul="Status Mitigasi" data={data.mitigasi} label={LABEL_STATUS_MITIGASI}
                urutan={['DIRENCANAKAN', 'BERJALAN', 'TERLAMBAT', 'SELESAI', 'DIBATALKAN']} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Distribusi judul="Status KRI" data={data.kri} label={LABEL_STATUS_KRI} urutan={['HIJAU', 'KUNING', 'MERAH', 'NONAKTIF']} />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default ExecutiveDashboard;
