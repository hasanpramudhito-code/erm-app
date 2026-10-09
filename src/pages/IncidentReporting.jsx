import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import { AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePeriode, LABEL_PERSETUJUAN } from '../services/risiko';
import { KepalaPantauan, PilihPeriode, PilihDari, BarisKpi, NAMA_BULAN, rupiah, rupiahRingkas, tanggal } from '../components/pantauan/Kerangka';

// Register peristiwa risiko (baca saja). Peristiwa dicatat lewat laporan Pemantauan.
const IncidentReporting = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ unit: '', bulan: '' });
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!periodeId) return;
    api.get(`/pantauan/insiden?periode_id=${periodeId}`).then(setData).catch((e) => setError(e.message));
  }, [periodeId]);

  const unitOpsi = useMemo(() => [...new Map(data.map((i) => [i.risiko.unit_kerja.id, i.risiko.unit_kerja.nama])).entries()], [data]);
  const bulanOpsi = useMemo(() => [...new Set(data.map((i) => i.tanggal_kejadian.slice(0, 7)))].sort().reverse()
    .map((b) => [b, `${NAMA_BULAN[Number(b.slice(5)) - 1]} ${b.slice(0, 4)}`]), [data]);
  const tersaring = data.filter((i) => (!filter.unit || i.risiko.unit_kerja.id === Number(filter.unit)) && (!filter.bulan || i.tanggal_kejadian.startsWith(filter.bulan)));
  const total = tersaring.reduce((t, i) => t + Number(i.kerugian || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<AlertOctagon size={36} color="#1976d2" />} judul="Register Peristiwa Risiko"
        keterangan="Peristiwa risiko yang dilaporkan unit melalui Pemantauan.">
        <PilihPeriode daftar={daftarPeriode} value={periodeId} onChange={setPeriodeId} />
        <PilihDari label="Bulan" value={filter.bulan} onChange={(v) => setFilter({ ...filter, bulan: v })} opsi={bulanOpsi} />
        <PilihDari label="Unit Kerja" value={filter.unit} onChange={(v) => setFilter({ ...filter, unit: v })} opsi={unitOpsi} minWidth={180} />
      </KepalaPantauan>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <BarisKpi data={[
        { label: 'Jumlah peristiwa', nilai: tersaring.length },
        { label: 'Total kerugian', nilai: rupiahRingkas(total), ket: rupiah(total) },
        { label: 'Risiko terdampak', nilai: new Set(tersaring.map((i) => i.risiko.id)).size },
        { label: 'Dari laporan final', nilai: tersaring.filter((i) => i.pemantauan_bulanan?.status_persetujuan === 'FINAL').length, ket: 'Sisanya masih dalam persetujuan' },
      ]} />

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tanggal</TableCell>
                <TableCell>Risiko</TableCell>
                <TableCell>Uraian kejadian</TableCell>
                <TableCell align="right">Kerugian</TableCell>
                <TableCell>Laporan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tersaring.length === 0 && <TableRow><TableCell colSpan={5} align="center">Tidak ada peristiwa risiko.</TableCell></TableRow>}
              {tersaring.map((i) => (
                <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(i)}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{tanggal(i.tanggal_kejadian)}</TableCell>
                  <TableCell><strong>{i.risiko.kode}</strong><Typography variant="caption" display="block" color="text.secondary">{i.risiko.unit_kerja.nama}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>{i.deskripsi}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{i.kerugian ? rupiah(i.kerugian) : '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {i.pemantauan_bulanan ? `${NAMA_BULAN[i.pemantauan_bulanan.bulan - 1]} ${i.pemantauan_bulanan.tahun}` : '-'}
                    <Typography variant="caption" display="block" color="text.secondary">{LABEL_PERSETUJUAN[i.pemantauan_bulanan?.status_persetujuan] || ''}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Peristiwa {tanggal(detail?.tanggal_kejadian)}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Grid container spacing={2}>
              <Grid item xs={12}><Typography variant="subtitle2">Risiko</Typography><Typography variant="body2">{detail.risiko.kode} · {detail.risiko.deskripsi || detail.risiko.nama} · {detail.risiko.unit_kerja.nama}</Typography></Grid>
              <Grid item xs={12}><Typography variant="subtitle2">Uraian</Typography><Typography variant="body2">{detail.deskripsi}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2">Dampak</Typography><Typography variant="body2">{detail.dampak || '-'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="subtitle2">Kerugian</Typography><Typography variant="body2">{detail.kerugian ? rupiah(detail.kerugian) : '-'}</Typography></Grid>
              <Grid item xs={12}><Typography variant="subtitle2">Tindakan yang diambil</Typography><Typography variant="body2">{detail.tindakan_segera || '-'}</Typography></Grid>
              <Grid item xs={12}><Typography variant="caption" color="text.secondary">Dilaporkan oleh {detail.pelapor?.nama || '-'}</Typography></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/pemantauan')}>Buka Pemantauan</Button>
          <Button onClick={() => setDetail(null)}>Tutup</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentReporting;
