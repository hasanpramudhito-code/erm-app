import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Grid, List, ListItem, ListItemText, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePeriode, namaMasa, LABEL_PERSETUJUAN, LABEL_STATUS_MITIGASI, LABEL_STATUS_KRI, LABEL_JENIS_UK } from '../services/risiko';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';
import { KepalaPantauan, PilihPeriode, BarisKpi, Penanda, rupiahRingkas, tanggal } from '../components/pantauan/Kerangka';
import { Matriks, Distribusi, Peringkat, DialogSel } from './ExecutiveDashboard';

const LIHAT_SEMUA = ['ADMIN', 'DIREKSI', 'PENGELOLA_RISIKO', 'AUDITOR'];
const WARNA_KRI = { KUNING: 'warning', MERAH: 'error' };

// Dashboard satu unit kerja pemilik risiko (Bagian, Cabang, Unit). Pengguna unit melihat unitnya sendiri;
// Admin, Direksi, Pengelola Risiko, Auditor memilih unit kerja mana pun. Hak akses ditegakkan di server.
const DashboardUnit = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { calculateScore } = useAssessmentConfig();
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();
  const lihatSemua = LIHAT_SEMUA.some((p) => userData?.peran?.includes(p));
  const [daftarUnit, setDaftarUnit] = useState([]);
  const [unitId, setUnitId] = useState(lihatSemua ? '' : userData?.unit_kerja_id || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (!lihatSemua) return;
    api.get('/unit-kerja').then((d) => {
      const pemilik = d.filter((u) => u.pemilik_risiko && u.aktif).sort((a, b) => a.jenis.localeCompare(b.jenis) || a.nama.localeCompare(b.nama));
      setDaftarUnit(pemilik);
      setUnitId((u) => u || pemilik[0]?.id || '');
    }).catch((e) => setError(e.message));
  }, [lihatSemua]);
  useEffect(() => {
    if (!periodeId || !unitId) return;
    setData(null);
    api.get(`/ringkasan/eksekutif?periode_id=${periodeId}&unit_kerja_id=${unitId}`).then(setData).catch((e) => setError(e.message));
  }, [periodeId, unitId]);

  const k = data?.kpi;
  const p = data?.pemantauan;
  const skorMaks = data ? Math.max(...data.level.map((l) => l.skor_maks)) : 25;
  const namaUnit = lihatSemua ? daftarUnit.find((u) => u.id === unitId)?.nama : userData?.unit_kerja?.nama;

  if (!lihatSemua && !userData?.unit_kerja_id) {
    return <Box sx={{ p: 3 }}><Alert severity="info">Akun Anda belum terdaftar di unit kerja pemilik risiko. Hubungi admin.</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<Gauge size={36} color="#1976d2" />} judul={`Dashboard Unit Kerja${namaUnit ? ` · ${namaUnit}` : ''}`}
        keterangan="Profil risiko, mitigasi, KRI, dan pemantauan satu unit kerja. Klik sel matriks untuk melihat risikonya.">
        <PilihPeriode daftar={daftarPeriode} value={periodeId} onChange={setPeriodeId} />
        {lihatSemua && (
          <TextField select size="small" label="Unit kerja" sx={{ minWidth: 240 }} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            {daftarUnit.map((u) => <MenuItem key={u.id} value={u.id}>{u.nama} ({LABEL_JENIS_UK[u.jenis]})</MenuItem>)}
          </TextField>
        )}
      </KepalaPantauan>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {data && (
        <>
          <BarisKpi data={[
            { label: 'Total risiko', nilai: k.total_risiko, ket: `${k.final} final` },
            { label: 'Penurunan risiko', nilai: `${k.penurunan_risiko}%`, ket: 'Skor inheren ke residual' },
            { label: 'Rata-rata progres mitigasi', nilai: `${k.rata_progres_mitigasi}%` },
            { label: 'Mitigasi lewat target', nilai: data.mitigasi_terlambat.length },
            { label: 'KRI merah / kuning', nilai: `${data.kri?.MERAH || 0} / ${data.kri?.KUNING || 0}` },
            { label: 'Peristiwa risiko', nilai: k.peristiwa, ket: k.kerugian ? `Kerugian ${rupiahRingkas(k.kerugian)}` : undefined },
          ]} />

          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="h6">Pemantauan {namaMasa(p.tahun, p.bulan, p.frekuensi)}</Typography>
              <Button size="small" onClick={() => navigate('/pemantauan')}>Buka Pemantauan</Button>
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
              <Chip label={`${p.final} final`} color="success" variant="outlined" />
              <Chip label={`${p.menunggu} menunggu persetujuan`} color="info" variant="outlined" />
              <Chip label={`${p.draf} draf / dikembalikan`} variant="outlined" />
              <Chip label={`${p.belum_diisi} belum diisi`} color={p.belum_diisi ? 'warning' : 'default'} variant="outlined" />
              <Typography variant="body2" color="text.secondary" alignSelf="center">dari {p.total} risiko</Typography>
            </Box>
          </Paper>

          <Box display="flex" gap={2} mb={1} flexWrap="wrap" aria-label="Legenda level risiko">
            {data.level.map((l) => <Penanda key={l.nama} warna={l.warna} teks={l.nama} />)}
          </Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={5}>
              <Matriks judul="Matriks Risiko Residual" sel={data.matriks.RESIDUAL} level={data.level} calculateScore={calculateScore} onPilih={setSel} />
            </Grid>
            <Grid item xs={12} lg={7}>
              <Peringkat judul="10 Risiko Teratas" keterangan="Seluruh risiko unit kerja ini, dari skor residual tertinggi"
                kosong="Belum ada risiko yang dinilai." skorMaks={skorMaks}
                baris={data.teratas.map((t) => ({
                  id: t.id, kode: t.kode, nama: t.nama, ket: LABEL_PERSETUJUAN[t.status],
                  inheren: t.inheren && { skor: t.inheren.skor, level: t.inheren.level.nama, warna: t.inheren.level.warna },
                  residual: t.residual && { skor: t.residual.skor, level: t.residual.level.nama, warna: t.residual.level.warna },
                }))} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>KRI perlu perhatian</Typography>
                {data.kri_perhatian.length === 0 ? <Typography variant="body2" color="text.secondary">Semua KRI hijau atau belum ada nilai.</Typography> : (
                  <List dense disablePadding>
                    {data.kri_perhatian.map((x) => (
                      <ListItem key={x.id} divider secondaryAction={<Chip size="small" color={WARNA_KRI[x.status]} label={LABEL_STATUS_KRI[x.status]} />}>
                        <ListItemText primary={x.nama} secondary={`${x.risiko.kode} · nilai ${x.nilai_sekarang ?? '-'} ${x.satuan || ''}`} sx={{ pr: 10 }} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Mitigasi lewat target</Typography>
                {data.mitigasi_terlambat.length === 0 ? <Typography variant="body2" color="text.secondary">Tidak ada mitigasi yang lewat target.</Typography> : (
                  <List dense disablePadding>
                    {data.mitigasi_terlambat.map((m) => (
                      <ListItem key={m.id} divider>
                        <ListItemText primary={m.uraian}
                          secondary={`${m.risiko.kode} · target ${tanggal(m.target_waktu)} · progres ${m.progres}%${m.penanggung_jawab ? ` · ${m.penanggung_jawab.nama}` : ''}`} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
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

export default DashboardUnit;
