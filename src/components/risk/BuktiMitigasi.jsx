import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { FileText, Paperclip, X } from 'lucide-react';
import { api } from '../../services/api';

const TERIMA = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx';
const ukuran = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const urlBukti = (b, lihat) => `/api/pemantauan/bukti/${b.id}${lihat ? '?lihat=1' : ''}`;

// Bukti pelaksanaan satu mitigasi dalam laporan pemantauan: foto/file, unggah banyak sekaligus, pratinjau foto.
// laporanId null = laporan belum pernah disimpan (bukti butuh laporan tersimpan).
const BuktiMitigasi = ({ laporanId, mitigasiId, daftar = [], terkunci, onBerubah }) => {
  const input = useRef(null);
  const [proses, setProses] = useState(false);
  const [error, setError] = useState('');

  const unggah = async (files) => {
    setProses(true);
    setError('');
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        await api.post(`/pemantauan/laporan/${laporanId}/mitigasi/${mitigasiId}/bukti`, fd);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProses(false);
      if (input.current) input.current.value = '';
      onBerubah();
    }
  };
  const hapus = async (b) => {
    if (!window.confirm(`Hapus bukti "${b.nama_file}"?`)) return;
    try { await api.delete(`/pemantauan/bukti/${b.id}`); onBerubah(); } catch (e) { setError(e.message); }
  };

  return (
    <Box mt={1.5}>
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">Bukti pelaksanaan:</Typography>
        {daftar.length === 0 && <Typography variant="body2" color="text.secondary">belum ada</Typography>}
        {!terkunci && (laporanId ? (
          <>
            <input ref={input} type="file" accept={TERIMA} multiple hidden onChange={(e) => e.target.files.length && unggah([...e.target.files])} />
            <Button size="small" startIcon={proses ? <CircularProgress size={14} /> : <Paperclip size={16} />} disabled={proses} onClick={() => input.current.click()}>
              Unggah foto / file
            </Button>
          </>
        ) : <Typography variant="caption" color="text.secondary">(simpan laporan dulu untuk mengunggah bukti)</Typography>)}
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>{error}</Alert>}
      {daftar.length > 0 && (
        <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
          {daftar.map((b) => {
            const foto = (b.tipe_mime || '').startsWith('image/');
            return (
              <Box key={b.id} sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', width: foto ? 96 : 'auto' }}>
                <Tooltip title={`${b.nama_file} · ${ukuran(b.ukuran)} · ${b.diunggah_oleh?.nama || ''}`}>
                  <Box component="a" href={urlBukti(b, foto)} target="_blank" rel="noopener" aria-label={`Buka ${b.nama_file}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'inherit', p: foto ? 0 : 1 }}>
                    {foto
                      ? <Box component="img" src={urlBukti(b, true)} alt={b.nama_file} sx={{ width: 96, height: 72, objectFit: 'cover', display: 'block' }} />
                      : <><FileText size={18} /><Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>{b.nama_file}</Typography></>}
                  </Box>
                </Tooltip>
                {!terkunci && (
                  <IconButton size="small" onClick={() => hapus(b)} aria-label={`Hapus ${b.nama_file}`}
                    sx={{ position: 'absolute', top: 2, right: 2, p: 0.25, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#fff' } }}>
                    <X size={14} />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default BuktiMitigasi;
