import React, { useEffect, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import TabelKelola from '../../components/TabelKelola';
import { api } from '../../services/api';
import { LABEL, opsi, usePilihan } from './Bersama';
import { tanggal } from '../../components/pantauan/Kerangka';

const WARNA_HASIL = { EFEKTIF: 'success', SEBAGIAN_EFEKTIF: 'warning', TIDAK_EFEKTIF: 'error' };

const ControlRegister = () => {
  const { pengguna } = usePilihan();
  const [unit, setUnit] = useState([]);
  useEffect(() => { api.get('/unit').then((d) => setUnit(d.map((u) => [u.id, u.nama]))).catch(() => {}); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Register Kontrol</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Daftar kontrol internal yang diuji efektivitasnya secara berkala.</Typography>
      <TabelKelola
        endpoint="/kontrol"
        judulForm="Kontrol"
        kosong={{ jenis: 'PREVENTIF', frekuensi: 'TRIWULANAN', aktif: 'true' }}
        keForm={(k) => ({ ...k, aktif: String(k.aktif) })}
        keBody={(b) => ({ ...b, aktif: b.aktif !== 'false' })}
        medan={[
          { k: 'kode', label: 'Kode' },
          { k: 'nama', label: 'Nama kontrol', wajib: true },
          { k: 'jenis', label: 'Jenis', jenis: 'pilih', opsi: opsi('PREVENTIF', 'DETEKTIF', 'KOREKTIF'), wajib: true },
          { k: 'frekuensi', label: 'Frekuensi', jenis: 'pilih', opsi: opsi('HARIAN', 'MINGGUAN', 'BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN') },
          { k: 'kategori', label: 'Kategori' },
          { k: 'unit_id', label: 'Unit', jenis: 'pilih', opsi: unit },
          { k: 'pemilik_id', label: 'Pemilik kontrol', jenis: 'pilih', opsi: pengguna },
          { k: 'aktif', label: 'Status', jenis: 'pilih', opsi: [['true', 'Aktif'], ['false', 'Nonaktif']] },
          { k: 'deskripsi', label: 'Deskripsi', jenis: 'panjang' },
          { k: 'tujuan', label: 'Tujuan', jenis: 'panjang' },
          { k: 'prosedur_pengujian', label: 'Prosedur pengujian', jenis: 'panjang' },
        ]}
        kolom={[
          { label: 'Kontrol', isi: (k) => <><strong>{k.nama}</strong><Typography variant="caption" display="block" color="text.secondary">{[k.kode, k.kategori].filter(Boolean).join(' · ')}</Typography></> },
          { label: 'Jenis', isi: (k) => LABEL[k.jenis] },
          { label: 'Frekuensi', isi: (k) => LABEL[k.frekuensi] },
          { label: 'Unit / pemilik', isi: (k) => <>{k.unit?.nama || '-'}<Typography variant="caption" display="block" color="text.secondary">{k.pemilik?.nama || ''}</Typography></> },
          { label: 'Uji terakhir', isi: (k) => {
            const h = k.hasil_pengujian[0];
            if (!h) return 'Belum diuji';
            return <><Chip size="small" color={WARNA_HASIL[h.hasil]} label={LABEL[h.hasil]} /><Typography variant="caption" display="block" color="text.secondary">{tanggal(h.tanggal_uji)}</Typography></>;
          } },
          { label: 'Status', isi: (k) => (k.aktif ? 'Aktif' : 'Nonaktif') },
        ]}
      />
    </Box>
  );
};

export default ControlRegister;
