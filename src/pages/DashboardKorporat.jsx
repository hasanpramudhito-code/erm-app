import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Collapse, Grid, LinearProgress, MenuItem, Paper, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography
} from '@mui/material';
import { Building2 } from 'lucide-react';
import { api } from '../services/api';
import { usePeriode, useFrekuensi, daftarMasa, masaDefault, namaMasa, LABEL_STATUS_KRI, LABEL_PERSETUJUAN } from '../services/risiko';

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// Penanda level: kotak warna + teks label (identitas tidak hanya dari warna).
const Level = ({ nama, warna }) => (nama ? (
  <Box component="span" display="inline-flex" alignItems="center" gap={0.75}>
    <Box component="span" sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: warna, flexShrink: 0 }} />
    <Typography component="span" variant="body2" sx={{ whiteSpace: 'nowrap' }}>{nama}</Typography>
  </Box>
) : <Typography component="span" variant="body2" color="text.secondary">-</Typography>);

// Kartu angka: label, nilai, keterangan.
const Kpi = ({ label, nilai, keterangan }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={600} sx={{ my: 0.5 }}>{nilai}</Typography>
      {keterangan && <Typography variant="caption" color="text.secondary">{keterangan}</Typography>}
    </CardContent>
  </Card>
);

// Batang sebaran bertumpuk: segmen per level, celah 2px, tooltip per segmen (fokus keyboard juga).
const BatangSebaran = ({ sebaran }) => {
  const total = sebaran.reduce((t, s) => t + s.jumlah, 0);
  if (!total) return <Typography variant="body2" color="text.secondary">-</Typography>;
  return (
    <Box display="flex" gap="2px" sx={{ width: 140, height: 12 }} role="img"
      aria-label={sebaran.filter((s) => s.jumlah).map((s) => `${s.level} ${s.jumlah}`).join(', ')}>
      {sebaran.filter((s) => s.jumlah).map((s, i, arr) => (
        <Tooltip key={s.level} title={`${s.level}: ${s.jumlah} unit`} arrow>
          <Box tabIndex={0} sx={{
            flex: s.jumlah, bgcolor: s.warna, minWidth: 4,
            borderRadius: `${i === 0 ? 4 : 0}px ${i === arr.length - 1 ? 4 : 0}px ${i === arr.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px`,
            '&:hover, &:focus-visible': { opacity: 0.8, outline: 'none' },
          }} />
        </Tooltip>
      ))}
    </Box>
  );
};

const Kelengkapan = ({ final, seharusnya }) => {
  const pct = seharusnya ? Math.round((final / seharusnya) * 100) : 0;
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography variant="body2">{final} dari {seharusnya}</Typography>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} aria-label={`${pct}% final`} />
    </Box>
  );
};

const WARNA_KRI = { HIJAU: 'success', KUNING: 'warning', MERAH: 'error' };
const angka = (v) => (v == null ? '-' : Number(v).toLocaleString('id-ID'));

// Satu KRI baku: nilai gabungan (dari angka nyata semua unit yang final), sebaran warna, dan rincian per unit.
const KartuKriBaku = ({ k }) => {
  const [buka, setBuka] = useState(false);
  const g = k.gabungan;
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>{k.nama}</Typography>
          <Typography variant="caption" color="text.secondary">
            {k.risiko_utama.kode} · {k.risiko_utama.nama} · Hijau {k.ambang_hijau} · Kuning {k.ambang_kuning} · Merah {k.ambang_merah}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="h4" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {g.nilai == null ? '-' : `${angka(g.nilai)} ${k.satuan || ''}`}
          </Typography>
          {g.status && <Chip size="small" color={WARNA_KRI[g.status]} label={`Gabungan: ${LABEL_STATUS_KRI[g.status]}`} />}
        </Box>
      </Box>
      {k.rumus === 'RASIO' && g.penyebut > 0 && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          {k.label_pembilang} {angka(g.pembilang)} ÷ {k.label_penyebut} {angka(g.penyebut)}
        </Typography>
      )}
      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" mt={1.5}>
        {['HIJAU', 'KUNING', 'MERAH'].map((st) => <Chip key={st} size="small" variant="outlined" color={WARNA_KRI[st]} label={`${k.sebaran[st]} ${LABEL_STATUS_KRI[st].toLowerCase()}`} />)}
        <Typography variant="body2" color="text.secondary">dari {k.jumlah_final} unit dengan laporan final · {k.jumlah_unit - k.jumlah_final} belum final</Typography>
        <Button size="small" onClick={() => setBuka(!buka)} sx={{ ml: 'auto' }}>{buka ? 'Sembunyikan' : 'Rincian per unit'}</Button>
      </Box>
      <Collapse in={buka}>
        <TableContainer sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Unit kerja</TableCell>
                {k.rumus === 'RASIO' && <><TableCell align="right">{k.label_pembilang}</TableCell><TableCell align="right">{k.label_penyebut}</TableCell></>}
                <TableCell align="right">Nilai</TableCell><TableCell>Status</TableCell><TableCell>Laporan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {k.unit.map((u) => (
                <TableRow key={u.kode_risiko} sx={{ opacity: u.status_laporan === 'FINAL' ? 1 : 0.6 }}>
                  <TableCell>{u.unit_kerja}</TableCell>
                  {k.rumus === 'RASIO' && <><TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{angka(u.pembilang)}</TableCell><TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{angka(u.penyebut)}</TableCell></>}
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{angka(u.nilai)}</TableCell>
                  <TableCell>{u.status ? <Chip size="small" color={WARNA_KRI[u.status]} label={LABEL_STATUS_KRI[u.status]} /> : '-'}</TableCell>
                  <TableCell>{u.status_laporan ? LABEL_PERSETUJUAN[u.status_laporan] : 'Belum diisi'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">Hanya laporan berstatus Final yang dihitung dalam nilai gabungan.</Typography>
      </Collapse>
    </Paper>
  );
};

const DashboardKorporat = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId, periode } = usePeriode();
  const [jenis, setJenis] = useState('INHEREN');
  const [bulan, setBulan] = useState(null);
  const [agg, setAgg] = useState(null);
  const [bln, setBln] = useState(null);
  const [kriBaku, setKriBaku] = useState([]);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('CABANG');

  const n = useFrekuensi();
  const opsiBulan = useMemo(() => daftarMasa(periode, n), [periode, n]);
  useEffect(() => { setBulan(masaDefault(opsiBulan)); }, [opsiBulan]);

  useEffect(() => {
    if (!periodeId) return;
    setMemuat(true);
    api.get(`/agregasi?periode_id=${periodeId}&jenis=${jenis}`).then(setAgg).catch((e) => setError(e.message)).finally(() => setMemuat(false));
  }, [periodeId, jenis]);
  useEffect(() => {
    if (!periodeId || !bulan) return;
    api.get(`/agregasi/bulanan?periode_id=${periodeId}&tahun=${bulan.tahun}&bulan=${bulan.bulan}`).then(setBln).catch((e) => setError(e.message));
    api.get(`/agregasi/kri?periode_id=${periodeId}&tahun=${bulan.tahun}&bulan=${bulan.bulan}`).then(setKriBaku).catch((e) => setError(e.message));
  }, [periodeId, bulan?.tahun, bulan?.bulan]);

  const daftarRu = (agg?.risiko_utama || []).filter((r) => r.berlaku_untuk === tab);
  const r = bln?.ringkasan;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Building2 size={36} color="#1976d2" />
        <Box>
          <Typography variant="h4">Dashboard Risiko Korporat</Typography>
          <Typography variant="body2" color="text.secondary">Agregasi per risiko utama dari entri unit berstatus FINAL</Typography>
        </Box>
      </Box>

      {/* Satu baris filter untuk seluruh isi halaman */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField select size="small" label="Periode" sx={{ minWidth: 130 }} value={periodeId || ''} onChange={(e) => setPeriodeId(e.target.value)}>
          {daftarPeriode.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Penilaian" sx={{ minWidth: 140 }} value={jenis} onChange={(e) => setJenis(e.target.value)}>
          <MenuItem value="INHEREN">Inheren</MenuItem>
          <MenuItem value="RESIDUAL">Residual</MenuItem>
        </TextField>
        <TextField select size="small" label="Masa pemantauan" sx={{ minWidth: 200 }}
          value={bulan ? `${bulan.tahun}-${bulan.bulan}` : ''}
          onChange={(e) => { const [t, b] = e.target.value.split('-').map(Number); setBulan({ tahun: t, bulan: b }); }}>
          {opsiBulan.map((o) => <MenuItem key={`${o.tahun}-${o.bulan}`} value={`${o.tahun}-${o.bulan}`}>{namaMasa(o.tahun, o.bulan, n)}</MenuItem>)}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><Kpi label="Risk register final" nilai={r ? `${r.risiko_final} / ${r.risiko}` : '-'} keterangan="Entri seluruh unit pada periode" /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Laporan pemantauan final" nilai={r ? `${r.laporan_final} / ${r.risiko}` : '-'} keterangan={bulan && `${namaMasa(bulan.tahun, bulan.bulan, n)}`} /></Grid>
        <Grid item xs={6} md={2}><Kpi label="KRI merah" nilai={r?.kri_merah ?? '-'} keterangan="Dari laporan final" /></Grid>
        <Grid item xs={6} md={2}><Kpi label="Peristiwa risiko" nilai={r?.peristiwa ?? '-'} keterangan={r && r.kerugian ? `Kerugian ${rupiah(r.kerugian)}` : 'Dari laporan final'} /></Grid>
        <Grid item xs={12} md={2}><Kpi label="Mitigasi lewat target" nilai={r?.mitigasi_terlambat ?? '-'} keterangan="Belum selesai per akhir masa" /></Grid>
      </Grid>

      <Paper sx={{ mb: 3, opacity: memuat ? 0.6 : 1, transition: 'opacity .2s' }}>
        <Box px={2} pt={2}>
          <Typography variant="h6">Agregasi per Risiko Utama · {jenis === 'INHEREN' ? 'Inheren' : 'Residual'}</Typography>
          <Typography variant="body2" color="text.secondary">
            Nilai utama = sel matriks paling sering dipilih unit (seri: skor lalu dampak terbesar). Modus K/D ditampilkan sebagai pembanding.
          </Typography>
        </Box>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab value="CABANG" label="Risiko utama Cabang" />
          <Tab value="PUSAT" label="Risiko utama Pusat" />
        </Tabs>
        {agg && (
          <Box display="flex" gap={2} px={2} py={1} flexWrap="wrap" aria-label="Legenda level risiko">
            {agg.level.map((l) => <Level key={l.id} nama={l.nama} warna={l.warna} />)}
          </Box>
        )}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Risiko utama</TableCell>
                <TableCell>Pemilik</TableCell>
                <TableCell>Kelengkapan</TableCell>
                <TableCell>Nilai utama</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>Modus K / D</TableCell>
                <TableCell>Sebaran</TableCell>
                <TableCell>Tertinggi</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Perlu perhatian</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {daftarRu.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">Belum ada risiko utama pada periode ini.</TableCell></TableRow>
              )}
              {daftarRu.map((ru) => {
                const h = ru.hasil;
                return (
                  <TableRow key={ru.id} hover>
                    <TableCell sx={{ maxWidth: 260 }}><strong>{ru.kode}</strong><br /><Typography variant="body2">{ru.nama}</Typography></TableCell>
                    <TableCell>{ru.pemilik || '-'}</TableCell>
                    <TableCell><Kelengkapan final={ru.jumlah_final} seharusnya={ru.jumlah_seharusnya} /></TableCell>
                    <TableCell>
                      {h ? (
                        <>
                          <Level nama={h.nilai_utama.level} warna={h.nilai_utama.warna} />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            K{h.nilai_utama.kemungkinan} · D{h.nilai_utama.dampak} · skor {h.nilai_utama.skor} · {h.nilai_utama.frekuensi} unit
                          </Typography>
                        </>
                      ) : <Typography variant="body2" color="text.secondary">Belum ada data final</Typography>}
                    </TableCell>
                    <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{h ? `${h.modus_kemungkinan} / ${h.modus_dampak}` : '-'}</TableCell>
                    <TableCell>{h ? <BatangSebaran sebaran={h.sebaran} /> : '-'}</TableCell>
                    <TableCell>{h ? <><Typography variant="body2">Skor {h.tertinggi.skor}</Typography><Typography variant="caption" color="text.secondary">{h.tertinggi.unit.join(', ')}</Typography></> : '-'}</TableCell>
                    <TableCell>
                      {h?.penanda.length
                        ? h.penanda.map((p) => <Chip key={p.unit} size="small" variant="outlined" label={`${p.unit} · ${p.level}`} sx={{ mr: 0.5, mb: 0.5 }} />)
                        : <Typography variant="body2" color="text.secondary">-</Typography>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">KRI Korporat · {bulan && namaMasa(bulan.tahun, bulan.bulan, n)}</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Gabungan KRI baku seluruh unit kerja. Untuk KRI rasio, angka nyata semua unit dijumlahkan lalu dihitung ulang, sehingga unit bervolume besar berbobot sesuai volumenya.
        </Typography>
        {kriBaku.length === 0
          ? <Alert severity="info">Belum ada KRI baku. Tambahkan di Risiko Utama &amp; Pustaka pada risiko utama terkait.</Alert>
          : kriBaku.map((k) => <KartuKriBaku key={k.id} k={k} />)}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Kelengkapan per Unit Kerja · {bulan && `${namaMasa(bulan.tahun, bulan.bulan, n)}`}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Unit Kerja</TableCell><TableCell align="right">Risiko final</TableCell><TableCell align="right">Laporan final</TableCell><TableCell align="right">Menunggu verifikasi</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {(bln?.per_unit || []).map((u) => (
                  <TableRow key={u.unit_kerja}>
                    <TableCell>{u.unit_kerja} <Typography component="span" variant="caption" color="text.secondary">({u.jenis})</Typography></TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{u.risiko_final} / {u.risiko}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{u.laporan_final} / {u.risiko}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{u.laporan_diajukan}</TableCell>
                  </TableRow>
                ))}
                {bln && !bln.per_unit.length && <TableRow><TableCell colSpan={4} align="center">Belum ada data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>KRI Merah</Typography>
            {!bln?.kri_merah.length ? <Typography variant="body2" color="text.secondary">Tidak ada KRI merah pada laporan final masa ini.</Typography> : (
              <Table size="small">
                <TableBody>
                  {bln.kri_merah.map((k, i) => (
                    <TableRow key={i}>
                      <TableCell>{k.kri}<Typography variant="caption" color="text.secondary" display="block">{k.risiko} · {k.unit_kerja}</Typography></TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{k.nilai} {k.satuan}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Peristiwa Risiko</Typography>
            {!bln?.peristiwa.length ? <Typography variant="body2" color="text.secondary">Tidak ada peristiwa pada laporan final masa ini.</Typography> : (
              <Table size="small">
                <TableBody>
                  {bln.peristiwa.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(p.tanggal).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>{p.deskripsi}<Typography variant="caption" color="text.secondary" display="block">{p.risiko} · {p.unit_kerja}</Typography></TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{p.kerugian ? rupiah(p.kerugian) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardKorporat;
