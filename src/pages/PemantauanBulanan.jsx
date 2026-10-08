import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Grid, IconButton, MenuItem, Paper, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { CalendarCheck, Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../services/api';
import { usePeriode, LABEL_PERSETUJUAN, LABEL_STATUS_MITIGASI, LABEL_STATUS_KRI, LABEL_FREKUENSI } from '../services/risiko';

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WARNA_KRI = { HIJAU: 'success', KUNING: 'warning', MERAH: 'error', NONAKTIF: 'default' };
const BISA_DIUBAH = ['DRAF', 'DIKEMBALIKAN'];
const PERISTIWA_BARU = { tanggal_kejadian: '', deskripsi: '', dampak: '', kerugian: '', tindakan_segera: '' };

// Bulan yang bisa dilaporkan: dalam periode dan tidak di masa depan.
function daftarBulan(periode) {
  if (!periode) return [];
  const hasil = [];
  const akhir = new Date(Math.min(new Date(periode.tanggal_selesai), new Date()));
  for (let d = new Date(periode.tanggal_mulai); d <= akhir; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
    hasil.push({ tahun: d.getFullYear(), bulan: d.getMonth() + 1 });
  return hasil.reverse();
}

// Default bulan laporan = bulan lalu (laporan diisi setelah bulan berakhir).
function bulanDefault(opsi) {
  const lalu = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  return opsi.find((o) => o.tahun === lalu.getFullYear() && o.bulan === lalu.getMonth() + 1) || opsi[0];
}

const FormLaporan = ({ risikoId, tahun, bulan, onTutup, onTersimpan }) => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    api.get(`/pemantauan/risiko/${risikoId}/${tahun}/${bulan}`).then((d) => {
      setData(d);
      const lap = d.laporan, seb = d.sebelumnya;
      const realisasi = (id, sumber) => sumber?.realisasi_mitigasi?.find((r) => r.mitigasi_id === id);
      const ukur = (id) => lap?.pengukuran_kri?.find((p) => p.kri_id === id);
      setForm({
        catatan: lap?.catatan || '',
        peristiwa_terjadi: lap?.peristiwa_terjadi || false,
        // Laporan baru: mulai dari capaian bulan sebelumnya.
        mitigasi: d.risiko.mitigasi.map((m) => {
          const r = realisasi(m.id, lap) || realisasi(m.id, seb);
          return { mitigasi_id: m.id, status: r?.status || 'BERJALAN', progres: r?.progres ?? 0, keterangan: lap ? r?.keterangan || '' : '' };
        }),
        kri: d.risiko.kri.map((k) => ({ kri_id: k.id, nilai: ukur(k.id)?.nilai ?? '', catatan: ukur(k.id)?.catatan || '' })),
        peristiwa: (lap?.insiden || []).map((i) => ({
          tanggal_kejadian: i.tanggal_kejadian.slice(0, 10), deskripsi: i.deskripsi, dampak: i.dampak || '', kerugian: i.kerugian ?? '', tindakan_segera: i.tindakan_segera || ''
        })),
      });
    }).catch((e) => setError(e.message));
  }, [risikoId, tahun, bulan]);

  const terkunci = data?.laporan && !BISA_DIUBAH.includes(data.laporan.status_persetujuan);
  const ubahBaris = (kunci, i, field, v) => setForm((f) => ({ ...f, [kunci]: f[kunci].map((x, j) => (j === i ? { ...x, [field]: v } : x)) }));
  const sebelumnyaKri = (id) => data?.sebelumnya?.pengukuran_kri?.find((p) => p.kri_id === id);

  const simpan = async () => {
    setMenyimpan(true);
    setError('');
    try {
      await api.put(`/pemantauan/risiko/${risikoId}/${tahun}/${bulan}`, {
        ...form,
        mitigasi: form.mitigasi.map((m) => ({ ...m, progres: Number(m.progres) })),
        peristiwa: form.peristiwa_terjadi ? form.peristiwa : [],
      });
      onTersimpan();
    } catch (e) {
      setError(e.message);
    } finally {
      setMenyimpan(false);
    }
  };

  const bulanMin = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const bulanMaks = new Date(tahun, bulan, 0).toISOString().slice(0, 10);

  return (
    <Dialog open onClose={onTutup} maxWidth="md" fullWidth>
      <DialogTitle>
        Laporan {NAMA_BULAN[bulan - 1]} {tahun}
        {data && <Typography variant="body2" color="text.secondary">{data.risiko.kode} · {data.risiko.deskripsi || data.risiko.nama}</Typography>}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!form ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <fieldset disabled={terkunci} style={{ border: 0, padding: 0, margin: 0 }}>
            {terkunci && <Alert severity="info" sx={{ mb: 2 }}>Laporan sudah {LABEL_PERSETUJUAN[data.laporan.status_persetujuan]} dan terkunci.</Alert>}

            <Typography variant="h6" gutterBottom>1. Progres Mitigasi</Typography>
            {form.mitigasi.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>Risiko ini belum punya rencana mitigasi. Tambahkan di Risk Register.</Alert>}
            {form.mitigasi.map((m, i) => {
              const def = data.risiko.mitigasi[i];
              return (
                <Paper key={m.mitigasi_id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                  <Typography variant="subtitle2">{def.uraian}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    PIC: {def.penanggung_jawab?.nama || '-'} · Target: {def.target_waktu ? new Date(def.target_waktu).toLocaleDateString('id-ID') : '-'}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={6} sm={3}>
                      <TextField select fullWidth size="small" label="Status" value={m.status} onChange={(e) => ubahBaris('mitigasi', i, 'status', e.target.value)}>
                        {Object.entries(LABEL_STATUS_MITIGASI).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField fullWidth size="small" type="number" label="Progres %" inputProps={{ min: 0, max: 100 }}
                        value={m.progres} onChange={(e) => ubahBaris('mitigasi', i, 'progres', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={7}>
                      <TextField fullWidth size="small" label="Keterangan realisasi" value={m.keterangan} onChange={(e) => ubahBaris('mitigasi', i, 'keterangan', e.target.value)} />
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>2. Nilai KRI</Typography>
            {form.kri.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>Risiko ini belum punya KRI. Tambahkan di Risk Register.</Alert>}
            {form.kri.map((k, i) => {
              const def = data.risiko.kri[i];
              const seb = sebelumnyaKri(def.id);
              return (
                <Paper key={k.kri_id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                  <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Typography variant="subtitle2">{def.nama} {def.satuan && `(${def.satuan})`}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {LABEL_FREKUENSI[def.frekuensi]} · Hijau {Number(def.ambang_hijau)} · Kuning {Number(def.ambang_kuning)} · Merah {Number(def.ambang_merah)}
                      {seb && ` · Bulan lalu: ${Number(seb.nilai)}`}
                    </Typography>
                  </Box>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth size="small" type="number" label="Nilai"
                        helperText={def.frekuensi !== 'BULANAN' ? 'Boleh kosong' : ''}
                        value={k.nilai} onChange={(e) => ubahBaris('kri', i, 'nilai', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={9}>
                      <TextField fullWidth size="small" label="Catatan" value={k.catatan} onChange={(e) => ubahBaris('kri', i, 'catatan', e.target.value)} />
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>3. Peristiwa Risiko</Typography>
            <FormControlLabel
              control={<Checkbox checked={form.peristiwa_terjadi} onChange={(e) => setForm((f) => ({
                ...f, peristiwa_terjadi: e.target.checked, peristiwa: e.target.checked && !f.peristiwa.length ? [{ ...PERISTIWA_BARU }] : f.peristiwa
              }))} />}
              label="Peristiwa risiko terjadi pada bulan ini"
            />
            {form.peristiwa_terjadi && form.peristiwa.map((p, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">Kejadian #{i + 1}</Typography>
                  {form.peristiwa.length > 1 && (
                    <IconButton size="small" color="error" aria-label={`Hapus kejadian ${i + 1}`}
                      onClick={() => setForm((f) => ({ ...f, peristiwa: f.peristiwa.filter((_, j) => j !== i) }))}>
                      <Trash2 size={18} />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" required type="date" label="Tanggal kejadian" InputLabelProps={{ shrink: true }}
                      inputProps={{ min: bulanMin, max: bulanMaks }}
                      value={p.tanggal_kejadian} onChange={(e) => ubahBaris('peristiwa', i, 'tanggal_kejadian', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField fullWidth size="small" type="number" label="Kerugian (Rp)" inputProps={{ min: 0 }}
                      value={p.kerugian} onChange={(e) => ubahBaris('peristiwa', i, 'kerugian', e.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" required multiline label="Uraian kejadian"
                      value={p.deskripsi} onChange={(e) => ubahBaris('peristiwa', i, 'deskripsi', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" multiline label="Dampak"
                      value={p.dampak} onChange={(e) => ubahBaris('peristiwa', i, 'dampak', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" multiline label="Tindakan yang diambil"
                      value={p.tindakan_segera} onChange={(e) => ubahBaris('peristiwa', i, 'tindakan_segera', e.target.value)} />
                  </Grid>
                </Grid>
              </Paper>
            ))}
            {form.peristiwa_terjadi && (
              <Button size="small" startIcon={<Plus size={18} />} onClick={() => setForm((f) => ({ ...f, peristiwa: [...f.peristiwa, { ...PERISTIWA_BARU }] }))}>
                Tambah kejadian
              </Button>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>4. Catatan Perkembangan</Typography>
            <TextField fullWidth multiline minRows={3} value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} />
          </fieldset>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onTutup}>Tutup</Button>
        {!terkunci && <Button variant="contained" onClick={simpan} disabled={!form || menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</Button>}
      </DialogActions>
    </Dialog>
  );
};

const PemantauanBulanan = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId, periode } = usePeriode();
  const opsiBulan = useMemo(() => daftarBulan(periode), [periode]);
  const [pilih, setPilih] = useState(null);
  const [ringkasan, setRingkasan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buka, setBuka] = useState(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => { setPilih(bulanDefault(opsiBulan) || null); }, [opsiBulan]);

  const muat = () => {
    if (!periodeId || !pilih) return;
    setLoading(true);
    api.get(`/pemantauan/ringkasan?periode_id=${periodeId}&tahun=${pilih.tahun}&bulan=${pilih.bulan}`)
      .then(setRingkasan).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(muat, [periodeId, pilih?.tahun, pilih?.bulan]);

  const daftar = ringkasan?.risiko || [];
  const sudah = daftar.filter((r) => r.laporan).length;

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <CalendarCheck size={40} color="#1976d2" />
              <Box>
                <Typography variant="h4">Pemantauan Bulanan</Typography>
                <Typography variant="body2" color="text.secondary">
                  Progres mitigasi, nilai KRI, peristiwa risiko, dan catatan perkembangan per risiko
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={2}>
              <TextField select size="small" label="Periode" sx={{ minWidth: 120 }} value={periodeId || ''} onChange={(e) => setPeriodeId(e.target.value)}>
                {daftarPeriode.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Bulan laporan" sx={{ minWidth: 170 }}
                value={pilih ? `${pilih.tahun}-${pilih.bulan}` : ''}
                onChange={(e) => { const [t, b] = e.target.value.split('-').map(Number); setPilih({ tahun: t, bulan: b }); }}>
                {opsiBulan.map((o) => <MenuItem key={`${o.tahun}-${o.bulan}`} value={`${o.tahun}-${o.bulan}`}>{NAMA_BULAN[o.bulan - 1]} {o.tahun}</MenuItem>)}
              </TextField>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {ringkasan && (
        <Alert severity={new Date() > new Date(ringkasan.tenggat) && sudah < daftar.length ? 'warning' : 'info'} sx={{ mb: 2 }}>
          Tenggat laporan {pilih && NAMA_BULAN[pilih.bulan - 1]}: {new Date(ringkasan.tenggat).toLocaleDateString('id-ID')} ·
          Sudah diisi {sudah} dari {daftar.length} risiko
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kode</TableCell>
                <TableCell>Risiko</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="center">Mitigasi</TableCell>
                <TableCell align="center">KRI</TableCell>
                <TableCell>Status Laporan</TableCell>
                <TableCell>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              ) : daftar.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">Belum ada risiko pada periode ini.</TableCell></TableRow>
              ) : daftar.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell><strong>{r.kode}</strong></TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>{r.deskripsi || r.nama}</TableCell>
                  <TableCell>{r.unit?.nama}</TableCell>
                  <TableCell align="center">{r._count.mitigasi}</TableCell>
                  <TableCell align="center">{r._count.kri}</TableCell>
                  <TableCell>
                    {r.laporan
                      ? <Chip size="small" color={r.laporan.status_persetujuan === 'FINAL' ? 'success' : 'default'} label={LABEL_PERSETUJUAN[r.laporan.status_persetujuan]} />
                      : <Chip size="small" variant="outlined" label="Belum diisi" />}
                    {r.terlambat && <Chip size="small" color="error" label="Terlambat" sx={{ ml: 0.5 }} />}
                    {r.laporan?.peristiwa_terjadi && <Chip size="small" color="warning" label="Peristiwa terjadi" sx={{ ml: 0.5 }} />}
                  </TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Edit2 size={16} />} onClick={() => setBuka(r.id)}>
                      {r.laporan ? 'Buka' : 'Isi laporan'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {buka && pilih && (
        <FormLaporan
          risikoId={buka}
          tahun={pilih.tahun}
          bulan={pilih.bulan}
          onTutup={() => setBuka(null)}
          onTersimpan={() => { setBuka(null); setPesan('Laporan tersimpan'); muat(); }}
        />
      )}
      <Snackbar open={!!pesan} autoHideDuration={4000} onClose={() => setPesan('')} message={pesan} />
    </Box>
  );
};

export default PemantauanBulanan;
