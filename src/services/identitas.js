// Identitas tampilan: "Nama Perusahaan — Nama Unit Kerja" sesuai akun yang login.
import { useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from '../contexts/AuthContext';

let cache = null;
const pendengar = new Set();

export const muatIdentitas = async (paksa = false) => {
  if (!cache || paksa) {
    cache = await api.get('/identitas').catch(() => ({ nama_perusahaan: 'Perusahaan' }));
    pendengar.forEach((f) => f(cache));
  }
  return cache;
};

export function useIdentitas() {
  const { userData } = useAuth();
  const [data, setData] = useState(cache);

  useEffect(() => {
    pendengar.add(setData);
    muatIdentitas().then(setData);
    return () => pendengar.delete(setData);
  }, []);

  const perusahaan = data?.nama_perusahaan || '';
  const uk = userData?.unit_kerja_asal;
  // Akun tanpa unit kerja (mis. admin) dianggap Kantor Pusat. Cabang/Unit diberi awalan bila namanya belum memuatnya.
  const awalan = { CABANG: 'Cabang', UNIT: 'Unit' }[uk?.jenis];
  const namaUnit = uk ? (awalan && !new RegExp(`^${awalan}`, 'i').test(uk.nama) ? `${awalan} ${uk.nama}` : uk.nama) : 'Kantor Pusat';
  return { perusahaan, namaUnit, judul: perusahaan ? `${perusahaan} — ${namaUnit}` : namaUnit };
}
