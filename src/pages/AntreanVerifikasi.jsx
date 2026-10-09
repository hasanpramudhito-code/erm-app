import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Paper, Snackbar, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, Typography
} from '@mui/material';
import { CheckSquare } from 'lucide-react';
import { api } from '../services/api';
import { LABEL_PERSETUJUAN, useFrekuensi } from '../services/risiko';
import AksiPersetujuan from '../components/persetujuan/AksiPersetujuan';
import { FormLaporan } from './Pemantauan';
import { Banding } from '../components/risk/PanelRevisi';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Antrean data yang menunggu persetujuan pengguna ini: pimpinan (DIAJUKAN di unitnya), pengelola risiko (DISETUJUI_PIMPINAN).
const AntreanVerifikasi = () => {
  const [data, setData] = useState({ risiko: [], pemantauan: [], revisi: [] });
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

  const entitas = ['risiko', 'pemantauan', 'revisi'][tab];
  const n = useFrekuensi();
  const [lihat, setLihat] = useState(null);
  const daftar = data[entitas] || [];
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
                Risk register, laporan pemantauan, dan revisi risiko yang menunggu persetujuan Anda
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(e, v) => { setTab(v); setPilih([]); }} sx={{ mb: 2 }}>
        <Tab label={`Risk Register (${data.risiko.length})`} />
        <Tab label={`Laporan Pemantauan (${data.pemantauan.length})`} />
        <Tab label={`Revisi Risiko (${(data.revisi || []).length})`} />
      </Tabs>

      {tab === 2 && (
        daftar.length === 0
          ? <Paper sx={{ p: 3, textAlign: 'center' }}>Tidak ada revisi yang menunggu persetujuan Anda.</Paper>
          : daftar.map((rv) => (
            <Paper key={rv.id} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={1}>
                <Box>
                  <Typography variant="subtitle1"><strong>{rv.risiko.kode}</strong> {rv.risiko.deskripsi || rv.risiko.nama}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revisi #{rv.nomor_revisi} · {rv.risiko.unit_kerja?.nama} · {rv.diajukan_oleh?.nama} · {LABEL_PERSETUJUAN[rv.status_persetujuan]}
                  </Typography>
                  <Typography variant="body2" mt={0.5}>Alasan: {rv.alasan_revisi}</Typography>
                </Box>
                <AksiPersetujuan entitas="revisi" id={rv.id} status={rv.status_persetujuan} unitId={rv.risiko.unit_kerja_id} alur={rv.risiko.unit_kerja?.alur_persetujuan} onSelesai={muat} />
              </Box>
              <Banding data={rv.salinan_data} />
            </Paper>
          ))
      )}

      {tab !== 2 && (<>
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
                <TableCell>Unit Kerja</TableCell>
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
                      {tab === 1 && d.jumlah_bukti > 0 && <Chip size="small" variant="outlined" label={`${d.jumlah_bukti} bukti`} sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{r.unit_kerja?.nama}</TableCell>
                    <TableCell><Chip size="small" label={LABEL_PERSETUJUAN[d.status_persetujuan]} /></TableCell>
                    <TableCell>
                      {tab === 1 && <Button size="small" onClick={() => setLihat(d)} sx={{ mb: 0.5 }}>Lihat laporan</Button>}
                      <AksiPersetujuan entitas={entitas} id={d.id} status={d.status_persetujuan} unitId={r.unit_kerja_id} alur={r.unit_kerja?.alur_persetujuan} onSelesai={muat} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      </>)}
      {lihat && n && (
        <FormLaporan risikoId={lihat.risiko.id} tahun={lihat.tahun} bulan={lihat.bulan} n={n}
          onTutup={() => setLihat(null)} onTersimpan={() => { setLihat(null); muat(); }} />
      )}
      <Snackbar open={!!pesan} autoHideDuration={5000} onClose={() => setPesan('')} message={pesan} />
    </Box>
  );
};

export default AntreanVerifikasi;
