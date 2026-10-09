import React, { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { usePeriode } from '../services/risiko';
import { useAuth } from '../contexts/AuthContext';
import { bisaKelola } from './TabelKelola';
import { KepalaPantauan, PilihPeriode, PilihDari } from './pantauan/Kerangka';

const PERAN = [['R', 'Responsible', 'Melaksanakan'], ['A', 'Accountable', 'Bertanggung jawab akhir'], ['C', 'Consulted', 'Dimintai pendapat'], ['I', 'Informed', 'Diberi informasi']];

// Matriks RACI: satu pengguna per peran per risiko.
const RACIChart = () => {
  const { userData } = useAuth();
  const kelola = bisaKelola(userData);
  const { daftar, periodeId, setPeriodeId } = usePeriode();
  const [risiko, setRisiko] = useState([]);
  const [pengguna, setPengguna] = useState([]);
  const [unit, setUnit] = useState('');
  const [error, setError] = useState('');

  const muat = () => periodeId && api.get(`/raci?periode_id=${periodeId}`).then(setRisiko).catch((e) => setError(e.message));
  useEffect(() => { muat(); }, [periodeId]);
  useEffect(() => { if (kelola) api.get('/pengguna/ringkas').then(setPengguna).catch(() => {}); }, [kelola]);

  const simpan = async (r, peran, p) => {
    try { await api.put(`/raci/${r.id}/${peran}`, { pengguna_id: p?.id ?? null }); await muat(); } catch (e) { setError(e.message); }
  };

  const unitOpsi = [...new Map(risiko.map((r) => [r.unit.id, r.unit.nama])).entries()];
  const tampil = risiko.filter((r) => !unit || r.unit.id === Number(unit));

  return (
    <Box sx={{ p: 3 }}>
      <KepalaPantauan ikon={<UserCheck size={36} color="#1976d2" />} judul="Matriks RACI"
        keterangan={PERAN.map(([k, l, d]) => `${k} = ${l} (${d})`).join(' · ')}>
        <PilihPeriode daftar={daftar} value={periodeId} onChange={setPeriodeId} />
        <PilihDari label="Unit" value={unit} onChange={setUnit} opsi={unitOpsi} minWidth={180} />
      </KepalaPantauan>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Risiko</TableCell>
                {PERAN.map(([k, l]) => <TableCell key={k} sx={{ minWidth: 180 }}><abbr title={l}>{k}</abbr> · {l}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {tampil.length === 0 && <TableRow><TableCell colSpan={5} align="center">Tidak ada risiko pada periode ini.</TableCell></TableRow>}
              {tampil.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><strong>{r.kode}</strong> {r.nama}<Typography variant="caption" display="block" color="text.secondary">{r.unit.nama}</Typography></TableCell>
                  {PERAN.map(([k, l]) => {
                    const isi = r.raci.find((x) => x.peran === k)?.pengguna || null;
                    return (
                      <TableCell key={k}>
                        {kelola ? (
                          <Autocomplete size="small" options={pengguna} value={pengguna.find((p) => p.id === isi?.id) || null}
                            getOptionLabel={(p) => p.nama} isOptionEqualToValue={(a, b) => a.id === b.id}
                            onChange={(_, p) => simpan(r, k, p)}
                            renderInput={(params) => <TextField {...params} placeholder="-" inputProps={{ ...params.inputProps, 'aria-label': `${l} untuk ${r.kode}` }} />} />
                        ) : (isi?.nama || '-')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default RACIChart;
