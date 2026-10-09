import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, List, ListItem, ListItemText, Paper, Tooltip, Typography
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

// Matriks 5x5: sel diwarnai level skornya, angka = jumlah risiko. Klik/Enter membuka daftar risiko sel itu.
export const Matriks = ({ judul, sel, level, calculateScore, onPilih }) => {
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
              const isi = sel[`${k}-${d}`] || [];
              const n = isi.length;
              const buka = () => n && onPilih({ judul: `${judul} · K${k} × D${d} · ${lv?.nama || '-'}`, risiko: isi });
              return (
                <Tooltip key={d} arrow title={`Kemungkinan ${k} · Dampak ${d} · skor ${skor} (${lv?.nama || '-'}): ${n} risiko`}>
                  <Box tabIndex={0} role="gridcell" onClick={buka} onKeyDown={(e) => e.key === 'Enter' && buka()} sx={{
                    cursor: n ? 'pointer' : 'default',
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
export const Distribusi = ({ judul, data, urutan, label }) => {
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

// Daftar peringkat: batang pudar = skor inheren, batang penuh = residual (selisihnya = penurunan oleh kontrol/mitigasi).
export const Peringkat = ({ judul, keterangan, baris, kosong, skorMaks }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6">{judul}</Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>{keterangan}</Typography>
    {baris.length === 0 && <Typography variant="body2" color="text.secondary">{kosong}</Typography>}
    {baris.map((b, i) => {
      const utama = b.residual || b.inheren;
      return (
        <Box key={b.id} display="flex" gap={1.5} py={1.25} sx={{ borderTop: i ? 1 : 0, borderColor: 'divider' }}>
          <Typography variant="h6" color="text.secondary" sx={{ width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</Typography>
          <Box flex={1} minWidth={0}>
            <Box display="flex" justifyContent="space-between" gap={1} alignItems="baseline">
              <Typography variant="body2" noWrap title={b.nama}><strong>{b.kode}</strong> {b.nama}</Typography>
              {utama ? <Penanda warna={utama.warna} teks={`${utama.level} · ${utama.skor}`} /> : <Typography variant="caption" color="text.secondary" noWrap>Belum ada data final</Typography>}
            </Box>
            <Box sx={{ position: 'relative', height: 8, bgcolor: 'grey.100', borderRadius: 4, my: 0.75 }}
              role="img" aria-label={`Inheren ${b.inheren?.skor ?? '-'}, residual ${b.residual?.skor ?? '-'} dari ${skorMaks}`}>
              {b.inheren && <Box sx={{ position: 'absolute', inset: 0, width: `${(b.inheren.skor / skorMaks) * 100}%`, bgcolor: b.inheren.warna, opacity: 0.3, borderRadius: 4 }} />}
              {b.residual && <Box sx={{ position: 'absolute', inset: 0, width: `${(b.residual.skor / skorMaks) * 100}%`, bgcolor: b.residual.warna, borderRadius: 4 }} />}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              {b.ket}{b.inheren && b.residual ? ` · inheren ${b.inheren.skor} → residual ${b.residual.skor}` : ''}
            </Typography>
          </Box>
        </Box>
      );
    })}
  </Paper>
);

// Daftar risiko pada sel matriks yang diklik.
export const DialogSel = ({ sel, onTutup }) => (
  <Dialog open={!!sel} onClose={onTutup} maxWidth="sm" fullWidth>
    <DialogTitle>{sel?.judul}</DialogTitle>
    <DialogContent dividers>
      <List dense disablePadding>
        {sel?.risiko.map((r) => (
          <ListItem key={r.id} divider><ListItemText primary={<><strong>{r.kode}</strong> {r.nama}</>} secondary={r.unit_kerja} /></ListItem>
        ))}
      </List>
    </DialogContent>
    <DialogActions><Button onClick={onTutup}>Tutup</Button></DialogActions>
  </Dialog>
);

const ExecutiveDashboard = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();
  const { calculateScore } = useAssessmentConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (!periodeId) return;
    api.get(`/ringkasan/eksekutif?periode_id=${periodeId}`).then(setData).catch((e) => setError(e.message));
  }, [periodeId]);

  const k = data?.kpi;
  const skorMaks = data ? Math.max(...data.level.map((l) => l.skor_maks)) : 25;
  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<BarChart3 size={36} color="#1976d2" />} judul="Dashboard Eksekutif"
        keterangan="Profil risiko, efektivitas mitigasi, dan indikator risiko pada periode terpilih. Klik sel matriks untuk melihat risikonya.">
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
            <Grid item xs={12} md={6}><Matriks judul="Matriks Risiko Inheren" sel={data.matriks.INHEREN} level={data.level} calculateScore={calculateScore} onPilih={setSel} /></Grid>
            <Grid item xs={12} md={6}><Matriks judul="Matriks Risiko Residual" sel={data.matriks.RESIDUAL} level={data.level} calculateScore={calculateScore} onPilih={setSel} /></Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <Peringkat judul="Peringkat Risiko Utama" keterangan="Nilai agregasi entri final seluruh unit kerja, dari level residual tertinggi"
                kosong="Belum ada risiko utama pada periode ini." skorMaks={skorMaks}
                baris={data.risiko_utama.map((ru) => ({
                  id: ru.id, kode: ru.kode, nama: ru.nama, inheren: ru.inheren, residual: ru.residual,
                  ket: `${ru.berlaku_untuk === 'CABANG' ? 'Cabang & Unit' : 'Pusat'} · ${ru.jumlah_final} dari ${ru.jumlah_unit} unit final${ru.residual?.penanda ? ` · ${ru.residual.penanda} unit di atas nilai utama` : ''}`,
                }))} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <Peringkat judul="10 Risiko Spesifik Teratas" keterangan="Risiko di luar risiko utama, dari skor residual tertinggi"
                kosong="Belum ada risiko spesifik yang dinilai." skorMaks={skorMaks}
                baris={data.teratas.map((t) => ({
                  id: t.id, kode: t.kode, nama: t.nama, ket: `${t.unit_kerja} · ${LABEL_PERSETUJUAN[t.status]}`,
                  inheren: t.inheren && { skor: t.inheren.skor, level: t.inheren.level.nama, warna: t.inheren.level.warna },
                  residual: t.residual && { skor: t.residual.skor, level: t.residual.level.nama, warna: t.residual.level.warna },
                }))} />
            </Grid>
          </Grid>

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

      <DialogSel sel={sel} onTutup={() => setSel(null)} />
    </Box>
  );
};

export default ExecutiveDashboard;
