import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { GitBranch } from 'lucide-react';
import { api } from '../../services/api';
import { LABEL_PERSETUJUAN } from '../../services/risiko';
import AksiPersetujuan from '../persetujuan/AksiPersetujuan';

const TERBUKA = ['DRAF', 'DIAJUKAN', 'DISETUJUI_PIMPINAN', 'DIKEMBALIKAN'];

// Ringkas satu sisi (sebelum/usulan) menjadi baris yang bisa dibandingkan.
const ringkas = (d) => ({
  'Penilaian inheren': d.inheren ? `K${d.inheren.kemungkinan} × D${d.inheren.dampak}` : '-',
  Penyebab: (d.penyebab || []).map((x) => x.uraian).join('; ') || '-',
  Dampak: (d.dampak || []).map((x) => x.uraian).join('; ') || '-',
  Mitigasi: (d.mitigasi || []).map((x) => x.uraian).join('; ') || '-',
  'Kontrol eksisting': d.kontrol_eksisting || '-',
  'Catatan penilaian': d.catatan_penilaian || '-',
});

// Perbandingan sebelum vs usulan; hanya baris yang berubah.
export const Banding = ({ data }) => {
  const [a, b] = [ringkas(data.sebelum), ringkas({ ...data.sebelum, ...data.usulan })];
  const beda = Object.keys(a).filter((k) => a[k] !== b[k]);
  if (!beda.length) return <Typography variant="body2" color="text.secondary">Tidak ada perubahan.</Typography>;
  return (
    <Table size="small">
      <TableHead><TableRow><TableCell>Bagian</TableCell><TableCell>Sebelum</TableCell><TableCell>Usulan</TableCell></TableRow></TableHead>
      <TableBody>
        {beda.map((k) => (
          <TableRow key={k}>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{k}</TableCell>
            <TableCell sx={{ color: 'text.secondary' }}>{a[k]}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{b[k]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Daftar revisi satu risiko di dialog detail, dengan aksi persetujuan untuk revisi yang masih berjalan.
const PanelRevisi = ({ risiko, onBerubah }) => {
  const [daftar, setDaftar] = useState(null);
  const muat = () => api.get(`/risiko/${risiko.id}/revisi`).then(setDaftar).catch(() => setDaftar([]));
  useEffect(() => { muat(); }, [risiko.id]);

  const batal = async () => {
    if (!window.confirm('Batalkan usulan revisi ini?')) return;
    await api.delete(`/risiko/${risiko.id}/revisi`);
    muat();
  };
  if (!daftar?.length) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitBranch size={18} /> Revisi
          <Typography component="span" variant="body2" color="text.secondary">· versi berlaku {risiko.raw?.versi_aktif ?? 1}</Typography>
        </Typography>
        {daftar.map((r) => (
          <Box key={r.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
              <Box>
                <Typography variant="subtitle2">Revisi #{r.nomor_revisi} <Chip size="small" label={LABEL_PERSETUJUAN[r.status_persetujuan]} sx={{ ml: 1 }} /></Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.diajukan_oleh?.nama} · {new Date(r.diubah_pada).toLocaleDateString('id-ID')} · Alasan: {r.alasan_revisi}
                </Typography>
              </Box>
              {TERBUKA.includes(r.status_persetujuan) && (
                <Box display="flex" gap={1} alignItems="center">
                  {['DRAF', 'DIKEMBALIKAN'].includes(r.status_persetujuan) && <Button size="small" color="error" onClick={batal}>Batalkan</Button>}
                  <AksiPersetujuan entitas="revisi" id={r.id} status={r.status_persetujuan} unitId={risiko.department}
                    alur={risiko.raw?.unit_kerja?.alur_persetujuan} onSelesai={() => { muat(); onBerubah(); }} />
                </Box>
              )}
            </Box>
            <Banding data={r.salinan_data} />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default PanelRevisi;
