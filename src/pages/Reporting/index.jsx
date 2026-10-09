import React, { useState } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, CircularProgress, Grid, MenuItem, TextField, Typography
} from '@mui/material';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssessmentConfig } from '../../contexts/AssessmentConfigContext';
import { usePeriode, muatRisiko } from '../../services/risiko';
import { muatIdentitas } from '../../services/identitas';

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Laporan Excel dibuat server dari data yang sama dengan aplikasi; PDF dibuat di peramban.
const LAPORAN = [
  { kode: 'register', judul: 'Register Risiko', ket: 'Seluruh entri risiko: identifikasi, penilaian inheren & residual, status persetujuan.', pdf: 'register' },
  { kode: 'mitigasi', judul: 'Rencana & Progres Mitigasi', ket: 'Semua rencana mitigasi beserta PIC, target, anggaran, status, dan progres terkini.' },
  { kode: 'kri', judul: 'Key Risk Indicator', ket: 'Definisi KRI, ambang, nilai terakhir, tren, dan status.' },
  { kode: 'peristiwa', judul: 'Register Peristiwa Risiko', ket: 'Peristiwa risiko dari laporan bulanan beserta kerugian.' },
  { kode: 'bulanan', judul: 'Laporan Pemantauan', ket: 'Isi laporan per risiko per masa pemantauan: realisasi mitigasi, nilai KRI, catatan.', perBulan: true },
  { kode: 'eksekutif', judul: 'Ringkasan Eksekutif', ket: 'Narasi ringkas tingkat risiko organisasi dan 5 risiko prioritas.', pdf: 'eksekutif', tanpaExcel: true },
];

const unduhExcel = async (kode, query) => {
  const r = await fetch(`/api/laporan/${kode}.xlsx?${new URLSearchParams(query)}`, { credentials: 'same-origin' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Gagal (${r.status})`);
  const nama = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '')?.[1] || `${kode}.xlsx`;
  const url = URL.createObjectURL(await r.blob());
  Object.assign(document.createElement('a'), { href: url, download: nama }).click();
  URL.revokeObjectURL(url);
};

const Reporting = () => {
  const { userData } = useAuth();
  const { assessmentConfig, calculateScore, calculateRiskLevel } = useAssessmentConfig();
  const { daftar: daftarPeriode, periodeId, setPeriodeId, periode } = usePeriode();
  const [bulan, setBulan] = useState('');
  const [proses, setProses] = useState('');
  const [error, setError] = useState('');

  const opsiBulan = [];
  if (periode) {
    const akhir = new Date(Math.min(new Date(periode.tanggal_selesai), new Date()));
    for (let d = new Date(periode.tanggal_mulai); d <= akhir; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
      opsiBulan.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
  }

  const jalankan = async (kunci, fn) => {
    setProses(kunci);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setProses(''); }
  };

  const excel = (l) => jalankan(`${l.kode}-xlsx`, () => {
    const q = { periode_id: periodeId };
    if (l.perBulan && bulan) { const [t, b] = bulan.split('-'); Object.assign(q, { tahun: t, bulan: b }); }
    return unduhExcel(l.kode, q);
  });

  const pdf = (l) => jalankan(`${l.kode}-pdf`, async () => {
    const [risks, { nama_perusahaan }] = await Promise.all([muatRisiko(periodeId), muatIdentitas()]);
    if (!risks.length) throw new Error('Tidak ada risiko pada periode ini');
    if (l.pdf === 'register') {
      const mod = await import('../../services/reporting/exportRiskRegister');
      await mod.exportRiskRegisterPDF({ risks, userData, assessmentConfig, reportConfig: { dateRange: periode?.nama, company: nama_perusahaan } });
    } else {
      const mod = await import('../../services/reporting/exportExecutiveSummary');
      await mod.exportExecutiveSummaryPDF({ risks, userData, assessment: { calculateScore, calculateRiskLevel }, reportConfig: { company: nama_perusahaan, dateRange: periode?.nama } });
    }
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold">Laporan</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Unduh laporan sesuai periode. Data dibatasi sesuai hak akses unit Anda.
      </Typography>
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField select size="small" label="Periode" sx={{ minWidth: 130 }} value={periodeId || ''} onChange={(e) => setPeriodeId(e.target.value)}>
          {daftarPeriode.map((p) => <MenuItem key={p.id} value={p.id}>{p.nama}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Bulan (laporan bulanan)" sx={{ minWidth: 200 }} value={bulan} onChange={(e) => setBulan(e.target.value)}>
          <MenuItem value="">Semua bulan</MenuItem>
          {opsiBulan.reverse().map((o) => { const [t, b] = o.split('-'); return <MenuItem key={o} value={o}>{NAMA_BULAN[b - 1]} {t}</MenuItem>; })}
        </TextField>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2}>
        {LAPORAN.map((l) => (
          <Grid item xs={12} sm={6} lg={4} key={l.kode}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{l.judul}</Typography>
                <Typography variant="body2" color="text.secondary">{l.ket}</Typography>
              </CardContent>
              <CardActions>
                {!l.tanpaExcel && (
                  <Button size="small" startIcon={proses === `${l.kode}-xlsx` ? <CircularProgress size={16} /> : <FileSpreadsheet size={16} />}
                    disabled={!periodeId || !!proses} onClick={() => excel(l)}>Excel</Button>
                )}
                {l.pdf && (
                  <Button size="small" startIcon={proses === `${l.kode}-pdf` ? <CircularProgress size={16} /> : <FileText size={16} />}
                    disabled={!periodeId || !!proses} onClick={() => pdf(l)}>PDF</Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Reporting;
