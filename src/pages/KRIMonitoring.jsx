import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import { Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePeriode, LABEL_STATUS_KRI, LABEL_FREKUENSI, LABEL_PERSETUJUAN } from '../services/risiko';
import { KepalaPantauan, PilihPeriode, PilihDari, BarisKpi, NAMA_BULAN } from '../components/pantauan/Kerangka';

const WARNA = { HIJAU: 'success', KUNING: 'warning', MERAH: 'error', NONAKTIF: 'default' };
const IKON_TREN = { NAIK: ArrowUp, TURUN: ArrowDown, STABIL: Minus };
const angka = (v) => (v == null ? '-' : Number(v).toLocaleString('id-ID'));

// Grafik riwayat nilai KRI: satu garis 2px + titik, pita ambang sebagai garis tipis berlabel. Tabel di bawahnya memuat nilai lengkap.
const GrafikRiwayat = ({ kri }) => {
  const titik = kri.riwayat;
  if (titik.length < 2) return null;
  const W = 520, H = 180, P = { l: 44, r: 64, t: 12, b: 28 };
  const ambang = [['Hijau', kri.ambang_hijau], ['Kuning', kri.ambang_kuning], ['Merah', kri.ambang_merah]].map(([l, v]) => [l, Number(v)]);
  const semua = [...titik.map((t) => t.nilai), ...ambang.map((a) => a[1])];
  const min = Math.min(...semua), maks = Math.max(...semua);
  const pad = (maks - min || 1) * 0.1;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - (min - pad)) / (maks - min + 2 * pad));
  const x = (i) => P.l + (W - P.l - P.r) * (i / (titik.length - 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Riwayat nilai ${kri.nama}`} style={{ display: 'block', margin: '8px 0' }}>
      {ambang.map(([l, v]) => (
        <g key={l}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#d7d6d1" strokeWidth="1" />
          <text x={W - P.r + 6} y={y(v) + 4} fontSize="11" fill="#52514e">{l} {v}</text>
        </g>
      ))}
      <polyline fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        points={titik.map((t, i) => `${x(i)},${y(t.nilai)}`).join(' ')} />
      {titik.map((t, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(t.nilai)} r="4" fill="#2a78d6" stroke="#fff" strokeWidth="2">
            <title>{`${NAMA_BULAN[t.bulan - 1]} ${t.tahun}: ${t.nilai} (${LABEL_STATUS_KRI[t.status]})`}</title>
          </circle>
          <text x={x(i)} y={H - 8} fontSize="11" fill="#52514e" textAnchor="middle">{NAMA_BULAN[t.bulan - 1]}</text>
        </g>
      ))}
    </svg>
  );
};

// Pantauan KRI lintas risiko (baca saja). Definisi di Risk Register; nilai di Pemantauan Bulanan.
const KRIMonitoring = () => {
  const { daftar: daftarPeriode, periodeId, setPeriodeId } = usePeriode();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ status: '', unit: '' });
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!periodeId) return;
    api.get(`/pantauan/kri?periode_id=${periodeId}`).then(setData).catch((e) => setError(e.message));
  }, [periodeId]);

  const unitOpsi = useMemo(() => [...new Map(data.map((k) => [k.risiko.unit.id, k.risiko.unit.nama])).entries()], [data]);
  const tersaring = data.filter((k) => (!filter.status || k.status === filter.status) && (!filter.unit || k.risiko.unit.id === Number(filter.unit)));
  const hitung = (s) => data.filter((k) => k.status === s).length;

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<Activity size={36} color="#1976d2" />} judul="Pantauan KRI"
        keterangan="Key Risk Indicator seluruh risiko. Definisi diubah di Risk Register; nilai dilaporkan di Pemantauan Bulanan.">
        <PilihPeriode daftar={daftarPeriode} value={periodeId} onChange={setPeriodeId} />
        <PilihDari label="Status" value={filter.status} onChange={(v) => setFilter({ ...filter, status: v })} opsi={Object.entries(LABEL_STATUS_KRI)} />
        <PilihDari label="Unit" value={filter.unit} onChange={(v) => setFilter({ ...filter, unit: v })} opsi={unitOpsi} minWidth={180} />
      </KepalaPantauan>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <BarisKpi data={[
        { label: 'Total KRI', nilai: data.length },
        { label: 'Hijau', nilai: hitung('HIJAU') },
        { label: 'Kuning', nilai: hitung('KUNING') },
        { label: 'Merah', nilai: hitung('MERAH') },
        { label: 'Belum ada nilai', nilai: hitung('NONAKTIF') },
      ]} />

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Risiko</TableCell>
                <TableCell>Indikator</TableCell>
                <TableCell align="right">Nilai terakhir</TableCell>
                <TableCell align="right">Sebelumnya</TableCell>
                <TableCell align="center">Tren</TableCell>
                <TableCell>Ambang H / K / M</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Frekuensi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tersaring.length === 0 && <TableRow><TableCell colSpan={8} align="center">Tidak ada KRI.</TableCell></TableRow>}
              {tersaring.map((k) => {
                const Tren = IKON_TREN[k.tren] || Minus;
                return (
                  <TableRow key={k.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(k)}>
                    <TableCell><strong>{k.risiko.kode}</strong><Typography variant="caption" display="block" color="text.secondary">{k.risiko.unit.nama}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      {k.nama}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {k.arah_target === 'LEBIH_RENDAH' ? 'Makin rendah makin baik' : 'Makin tinggi makin baik'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{angka(k.nilai_sekarang)} {k.nilai_sekarang != null && k.satuan}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{angka(k.nilai_sebelumnya)}</TableCell>
                    <TableCell align="center"><Tren size={18} aria-label={`Tren ${k.tren.toLowerCase()}`} /></TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{angka(k.ambang_hijau)} / {angka(k.ambang_kuning)} / {angka(k.ambang_merah)}</TableCell>
                    <TableCell><Chip size="small" color={WARNA[k.status]} label={LABEL_STATUS_KRI[k.status]} /></TableCell>
                    <TableCell>{LABEL_FREKUENSI[k.frekuensi]}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detail?.nama} {detail?.satuan && `(${detail.satuan})`}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <>
              <Typography variant="body2">{detail.risiko.kode} · {detail.risiko.deskripsi || detail.risiko.nama} · {detail.risiko.unit.nama}</Typography>
              {detail.deskripsi && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{detail.deskripsi}</Typography>}
              <GrafikRiwayat kri={detail} />
              {detail.riwayat.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Belum ada pengukuran.</Typography> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Bulan</TableCell><TableCell align="right">Nilai</TableCell><TableCell>Status</TableCell><TableCell>Catatan</TableCell></TableRow></TableHead>
                  <TableBody>
                    {[...detail.riwayat].reverse().map((r) => (
                      <TableRow key={`${r.tahun}-${r.bulan}`}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{NAMA_BULAN[r.bulan - 1]} {r.tahun}<Typography variant="caption" display="block" color="text.secondary">{LABEL_PERSETUJUAN[r.status_laporan]}</Typography></TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{angka(r.nilai)}</TableCell>
                        <TableCell><Chip size="small" color={WARNA[r.status]} label={LABEL_STATUS_KRI[r.status]} /></TableCell>
                        <TableCell>{r.catatan || '-'}</TableCell>
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

export default KRIMonitoring;
