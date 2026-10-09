import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormLabel, LinearProgress,
  MenuItem, Paper, Radio, RadioGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { Brain } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { bisaKelola } from '../components/TabelKelola';
import { KepalaPantauan, tanggal } from '../components/pantauan/Kerangka';

const SKALA = ['Sangat rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat tinggi'].map((label, i) => ({ nilai: i + 1, label }));
const PERTANYAAN_BAKU = [
  ['q1', 'Kepemimpinan & Tata Kelola', 'Sejauh mana manajemen puncak mendemonstrasikan komitmen terhadap manajemen risiko?'],
  ['q2', 'Kesadaran Risiko', 'Seberapa baik pegawai memahami risiko yang terkait dengan peran dan tanggung jawabnya?'],
  ['q3', 'Komunikasi', 'Seberapa efektif komunikasi mengenai risiko berjalan di organisasi?'],
  ['q4', 'Pengambilan Keputusan', 'Sejauh mana pertimbangan risiko diintegrasikan dalam pengambilan keputusan?'],
  ['q5', 'Pelatihan & Kompetensi', 'Seberapa memadai pelatihan dan pengembangan kompetensi manajemen risiko?'],
  ['q6', 'Akuntabilitas', 'Sejauh mana akuntabilitas manajemen risiko telah ditetapkan dengan jelas?'],
].map(([id, kategori, pertanyaan]) => ({ id, kategori, pertanyaan, opsi: SKALA }));

const STATUS = { DRAF: ['Draf', 'default'], TERBIT: ['Dibuka', 'success'], DITUTUP: ['Ditutup', 'default'] };
const kematangan = (s) => (s >= 80 ? 'Maju' : s >= 60 ? 'Proaktif' : s >= 40 ? 'Berkembang' : 'Awal');

const RiskCulture = () => {
  const { userData } = useAuth();
  const kelola = bisaKelola(userData);
  const lihatHasil = kelola || userData?.peran?.includes('DIREKSI');
  const [survei, setSurvei] = useState([]);
  const [error, setError] = useState('');
  const [baru, setBaru] = useState(null);
  const [isi, setIsi] = useState(null); // {survei, jawaban}
  const [hasil, setHasil] = useState(null);

  const muat = () => api.get('/survei-budaya').then(setSurvei).catch((e) => setError(e.message));
  useEffect(() => { muat(); }, []);
  const coba = (f) => f().catch((e) => setError(e.message));

  const buat = () => coba(async () => {
    await api.post('/survei-budaya', { judul: baru.judul, deskripsi: baru.deskripsi, pertanyaan: PERTANYAAN_BAKU });
    setBaru(null); muat();
  });
  const ubahStatus = (s, status) => coba(async () => { await api.patch(`/survei-budaya/${s.id}`, { status }); muat(); });
  const kirim = () => coba(async () => {
    await api.post(`/survei-budaya/${isi.survei.id}/respons`, { jawaban: isi.jawaban });
    setIsi(null); muat();
  });
  const bukaHasil = (s) => coba(async () => setHasil(await api.get(`/survei-budaya/${s.id}/hasil`)));
  const lengkap = isi && isi.survei.pertanyaan.every((q) => isi.jawaban[q.id]);

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<Brain size={36} color="#1976d2" />} judul="Budaya Risiko"
        keterangan="Survei tingkat kematangan budaya risiko. Skor 0-100 dari rata-rata jawaban skala 1-5.">
        {kelola && <Button variant="contained" onClick={() => setBaru({ judul: `Survei Budaya Risiko ${new Date().getFullYear()}`, deskripsi: '' })}>Buat survei</Button>}
      </KepalaPantauan>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Survei</TableCell>
                <TableCell>Dibuat</TableCell>
                <TableCell align="right">Respons</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {survei.length === 0 && <TableRow><TableCell colSpan={5} align="center">Belum ada survei.</TableCell></TableRow>}
              {survei.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell><strong>{s.judul}</strong><Typography variant="caption" display="block" color="text.secondary">{s.deskripsi}</Typography></TableCell>
                  <TableCell>{tanggal(s.dibuat_pada)}</TableCell>
                  <TableCell align="right">{s._count.respons}</TableCell>
                  <TableCell>
                    {kelola ? (
                      <TextField select size="small" value={s.status} onChange={(e) => ubahStatus(s, e.target.value)} inputProps={{ 'aria-label': 'Status survei' }}>
                        {Object.entries(STATUS).map(([k, [l]]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
                      </TextField>
                    ) : <Chip size="small" label={STATUS[s.status][0]} color={STATUS[s.status][1]} />}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {s.status === 'TERBIT' && <Button size="small" onClick={() => setIsi({ survei: s, jawaban: {} })}>Isi</Button>}
                    {lihatHasil && <Button size="small" onClick={() => bukaHasil(s)}>Hasil</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!baru} onClose={() => setBaru(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Buat survei</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="Judul" value={baru?.judul || ''} onChange={(e) => setBaru({ ...baru, judul: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth multiline minRows={2} label="Deskripsi" value={baru?.deskripsi || ''} onChange={(e) => setBaru({ ...baru, deskripsi: e.target.value })} />
          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Survei memakai {PERTANYAAN_BAKU.length} pertanyaan baku dan dibuat sebagai draf. Ubah status ke "Dibuka" agar pegawai bisa mengisi.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBaru(null)}>Batal</Button>
          <Button variant="contained" disabled={!baru?.judul?.trim()} onClick={buat}>Buat</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!isi} onClose={() => setIsi(null)} maxWidth="md" fullWidth>
        <DialogTitle>{isi?.survei.judul}</DialogTitle>
        <DialogContent dividers>
          {isi?.survei.pertanyaan.map((q, i) => (
            <Box key={q.id} mb={3}>
              <FormLabel id={`lbl-${q.id}`}>
                <Typography variant="caption" color="text.secondary" display="block">{q.kategori}</Typography>
                {i + 1}. {q.pertanyaan}
              </FormLabel>
              <RadioGroup row aria-labelledby={`lbl-${q.id}`} value={isi.jawaban[q.id] || ''}
                onChange={(e) => setIsi({ ...isi, jawaban: { ...isi.jawaban, [q.id]: Number(e.target.value) } })}>
                {q.opsi.map((o) => <FormControlLabel key={o.nilai} value={o.nilai} control={<Radio size="small" />} label={o.label} />)}
              </RadioGroup>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsi(null)}>Batal</Button>
          <Button variant="contained" disabled={!lengkap} onClick={kirim}>Kirim</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!hasil} onClose={() => setHasil(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Hasil: {hasil?.survei.judul}</DialogTitle>
        <DialogContent dividers>
          {hasil && (hasil.jumlah_respons === 0 ? <Typography>Belum ada respons.</Typography> : (
            <>
              <Typography variant="h3" fontWeight={600}>{hasil.skor_rata}</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Tingkat kematangan: <strong>{kematangan(hasil.skor_rata)}</strong> · {hasil.jumlah_respons} responden
              </Typography>
              {Object.entries(hasil.kategori).map(([k, v]) => (
                <Box key={k} mb={1.5}>
                  <Box display="flex" justifyContent="space-between"><Typography variant="body2">{k}</Typography><Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Typography></Box>
                  <LinearProgress variant="determinate" value={v} sx={{ height: 8, borderRadius: 4 }} aria-label={k} />
                </Box>
              ))}
            </>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setHasil(null)}>Tutup</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default RiskCulture;
