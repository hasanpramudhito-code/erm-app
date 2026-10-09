import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { FileText, Paperclip, X } from 'lucide-react';
import { api } from '../../services/api';

const TERIMA = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx';
const EKSTENSI = /\.(jpe?g|png|webp|pdf|docx?|xlsx?)$/i;
const MAKS = 20 * 1024 * 1024;
const ukuran = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const urlBukti = (b, lihat) => `/api/pemantauan/bukti/${b.id}${lihat ? '?lihat=1' : ''}`;

// Satu kotak bukti: gambar kecil untuk foto, nama file untuk dokumen.
const Kotak = ({ nama, foto, src, href, ket, onHapus, tertunda }) => (
  <Box sx={{ position: 'relative', border: 1, borderColor: tertunda ? 'warning.main' : 'divider', borderStyle: tertunda ? 'dashed' : 'solid', borderRadius: 1, overflow: 'hidden', width: foto ? 96 : 'auto' }}>
    <Tooltip title={ket}>
      <Box component={href ? 'a' : 'div'} href={href} target="_blank" rel="noopener" aria-label={nama}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'inherit', p: foto ? 0 : 1 }}>
        {foto
          ? <Box component="img" src={src} alt={nama} sx={{ width: 96, height: 72, objectFit: 'cover', display: 'block' }} />
          : <><FileText size={18} /><Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>{nama}</Typography></>}
      </Box>
    </Tooltip>
    {onHapus && (
      <IconButton size="small" onClick={onHapus} aria-label={`Hapus ${nama}`}
        sx={{ position: 'absolute', top: 2, right: 2, p: 0.25, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#fff' } }}>
        <X size={14} />
      </IconButton>
    )}
  </Box>
);

// Bukti pelaksanaan satu mitigasi. File yang dipilih ditahan di form (`tertunda`) dan diunggah saat laporan disimpan;
// `daftar` = bukti yang sudah tersimpan di server.
const BuktiMitigasi = ({ daftar = [], tertunda = [], onTertunda, terkunci, onBerubah }) => {
  const input = useRef(null);
  const [error, setError] = useState('');
  // Pratinjau lokal untuk foto yang belum diunggah.
  const pratinjau = useMemo(() => tertunda.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [tertunda]);
  useEffect(() => () => pratinjau.forEach((u) => u && URL.revokeObjectURL(u)), [pratinjau]);

  const pilih = (files) => {
    const ditolak = files.filter((f) => !EKSTENSI.test(f.name) || f.size > MAKS);
    setError(ditolak.length ? `Tidak bisa dipakai: ${ditolak.map((f) => f.name).join(', ')}. Gunakan JPG/PNG/WebP, PDF, Word, atau Excel maks. 20 MB (foto HEIC iPhone: ubah ke JPG).` : '');
    onTertunda([...tertunda, ...files.filter((f) => !ditolak.includes(f))]);
    input.current.value = '';
  };
  const hapus = async (b) => {
    if (!window.confirm(`Hapus bukti "${b.nama_file}"?`)) return;
    try { await api.delete(`/pemantauan/bukti/${b.id}`); onBerubah(); } catch (e) { setError(e.message); }
  };
  const jumlah = daftar.length + tertunda.length;

  return (
    <Box mt={1.5}>
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="body2" color={jumlah ? 'text.secondary' : 'error'}>
          Bukti pelaksanaan{jumlah ? ':' : ' wajib diunggah'}
        </Typography>
        {!terkunci && (
          <>
            <input ref={input} type="file" accept={TERIMA} multiple hidden onChange={(e) => e.target.files.length && pilih([...e.target.files])} />
            <Button size="small" startIcon={<Paperclip size={16} />} onClick={() => input.current.click()}>Tambah foto / file</Button>
          </>
        )}
      </Box>
      {error && <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setError('')}>{error}</Alert>}
      {jumlah > 0 && (
        <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
          {daftar.map((b) => {
            const foto = (b.tipe_mime || '').startsWith('image/');
            return <Kotak key={b.id} nama={b.nama_file} foto={foto} src={urlBukti(b, true)} href={urlBukti(b, foto)}
              ket={`${b.nama_file} · ${ukuran(b.ukuran)} · ${b.diunggah_oleh?.nama || ''}`} onHapus={!terkunci && (() => hapus(b))} />;
          })}
          {tertunda.map((f, i) => (
            <Kotak key={`t${i}`} tertunda nama={f.name} foto={!!pratinjau[i]} src={pratinjau[i]} ket={`${f.name} · ${ukuran(f.size)} · diunggah saat Simpan`}
              onHapus={() => onTertunda(tertunda.filter((_, j) => j !== i))} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default BuktiMitigasi;
