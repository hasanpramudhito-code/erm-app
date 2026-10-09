import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography
} from '@mui/material';
import { ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePeriode, LABEL_JENIS_MITIGASI, LABEL_STATUS_MITIGASI, LABEL_PRIORITAS_SINGKAT, LABEL_PERSETUJUAN } from '../services/risiko';
import { KepalaPantauan, PilihPeriode, PilihDari, BarisKpi, Penanda, NAMA_BULAN, rupiah, rupiahRingkas, tanggal } from '../components/pantauan/Kerangka';

const WARNA_STATUS = { DIRENCANAKAN: 'default', BERJALAN: 'info', SELESAI: 'success', TERLAMBAT: 'error', DIBATALKAN: 'default' };

// Pantauan rencana mitigasi lintas risiko (baca saja). Input lewat Risk Register & Pemantauan Bulanan.
const RiskTreatmentPlans = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [tab, setTab] = useState('SEMUA');
  const [filter, setFilter] = useState({ jenis: '', prioritas: '', unit: '' });
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!periodeId) return;
    setMemuat(true);
    api.get(`/pantauan/mitigasi?periode_id=${periodeId}`).then(setData).catch((e) => setError(e.message)).finally(() => setMemuat(false));
  }, [periodeId]);

  const unitOpsi = useMemo(() => [...new Map(data.map((m) => [m.risiko.unit_kerja.id, m.risiko.unit_kerja.nama])).entries()], [data]);
  const tersaring = data.filter((m) =>
    (tab === 'SEMUA' || (tab === 'LEWAT' ? m.lewat_target : m.status === tab)) &&
    (!filter.jenis || m.jenis === filter.jenis) &&
    (!filter.prioritas || m.prioritas === filter.prioritas) &&
    (!filter.unit || m.risiko.unit_kerja.id === Number(filter.unit)));

  const rata = data.length ? Math.round(data.reduce((t, m) => t + m.progres, 0) / data.length) : 0;
  const kpi = [
    { label: 'Total mitigasi', nilai: data.length },
    { label: 'Selesai', nilai: data.filter((m) => m.status === 'SELESAI').length },
    { label: 'Berjalan', nilai: data.filter((m) => m.status === 'BERJALAN').length },
    { label: 'Lewat target', nilai: data.filter((m) => m.lewat_target).length, ket: 'Tenggat lewat, belum selesai' },
    { label: 'Rata-rata progres', nilai: `${rata}%` },
    { label: 'Total anggaran', nilai: rupiahRingkas(data.reduce((t, m) => t + Number(m.anggaran || 0), 0)) },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<ClipboardCheck size={36} color="#1976d2" />} judul="Pantauan Mitigasi"
        keterangan="Seluruh rencana mitigasi lintas risiko. Ubah rencana di Risk Register; laporkan progres di Pemantauan Bulanan.">
        <PilihPeriode daftar={daftarPeriode} value={periodeId} onChange={setPeriodeId} />
        <PilihDari label="Jenis" value={filter.jenis} onChange={(v) => setFilter({ ...filter, jenis: v })} opsi={Object.entries(LABEL_JENIS_MITIGASI)} />
        <PilihDari label="Prioritas" value={filter.prioritas} onChange={(v) => setFilter({ ...filter, prioritas: v })} opsi={Object.entries(LABEL_PRIORITAS_SINGKAT)} />
        <PilihDari label="Unit Kerja" value={filter.unit} onChange={(v) => setFilter({ ...filter, unit: v })} opsi={unitOpsi} minWidth={180} />
      </KepalaPantauan>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <BarisKpi data={kpi} />

      <Paper sx={{ opacity: memuat ? 0.6 : 1, transition: 'opacity .2s' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
          <Tab value="SEMUA" label={`Semua (${data.length})`} />
          {['BERJALAN', 'DIRENCANAKAN', 'SELESAI'].map((s) => <Tab key={s} value={s} label={`${LABEL_STATUS_MITIGASI[s]} (${data.filter((m) => m.status === s).length})`} />)}
          <Tab value="LEWAT" label={`Lewat target (${data.filter((m) => m.lewat_target).length})`} />
        </Tabs>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Risiko</TableCell>
                <TableCell>Rencana mitigasi</TableCell>
                <TableCell>Jenis</TableCell>
                <TableCell>Prioritas</TableCell>
                <TableCell>PIC</TableCell>
                <TableCell>Target</TableCell>
                <TableCell align="right">Anggaran</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Progres</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tersaring.length === 0 && <TableRow><TableCell colSpan={9} align="center">Tidak ada mitigasi.</TableCell></TableRow>}
              {tersaring.map((m) => (
                <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(m)}>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <strong>{m.risiko.kode}</strong>
                    <Typography variant="caption" display="block" color="text.secondary">{m.risiko.unit_kerja.nama}</Typography>
                    {m.risiko.penilaian[0] && <Penanda warna={m.risiko.penilaian[0].level.warna} teks={m.risiko.penilaian[0].level.nama} />}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>{m.uraian}</TableCell>
                  <TableCell>{LABEL_JENIS_MITIGASI[m.jenis]}</TableCell>
                  <TableCell>{LABEL_PRIORITAS_SINGKAT[m.prioritas]}</TableCell>
                  <TableCell>{m.penanggung_jawab?.nama || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {tanggal(m.target_waktu)}
                    {m.lewat_target && <Chip size="small" color="error" variant="outlined" label="Lewat" sx={{ ml: 0.5 }} />}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{m.anggaran ? rupiah(m.anggaran) : '-'}</TableCell>
                  <TableCell><Chip size="small" color={WARNA_STATUS[m.status]} label={LABEL_STATUS_MITIGASI[m.status]} /></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{m.progres}%</Typography>
                    <LinearProgress variant="determinate" value={m.progres} sx={{ height: 6, borderRadius: 3 }} aria-label={`Progres ${m.progres}%`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detail?.uraian}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <>
              <Typography variant="body2" gutterBottom>
                {detail.risiko.kode} · {detail.risiko.deskripsi || detail.risiko.nama} · {detail.risiko.unit_kerja.nama}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>Riwayat realisasi bulanan</Typography>
              {detail.riwayat.length === 0 ? <Typography variant="body2" color="text.secondary">Belum ada laporan.</Typography> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Bulan</TableCell><TableCell>Status</TableCell><TableCell align="right">Progres</TableCell><TableCell>Keterangan</TableCell></TableRow></TableHead>
                  <TableBody>
                    {detail.riwayat.map((r) => (
                      <TableRow key={`${r.tahun}-${r.bulan}`}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{NAMA_BULAN[r.bulan - 1]} {r.tahun}<Typography variant="caption" display="block" color="text.secondary">{LABEL_PERSETUJUAN[r.status_laporan]}</Typography></TableCell>
                        <TableCell>{LABEL_STATUS_MITIGASI[r.status]}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.progres}%</TableCell>
                        <TableCell>{r.keterangan || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/risk-register')}>Buka Risk Register</Button>
          <Button onClick={() => setDetail(null)}>Tutup</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RiskTreatmentPlans;
