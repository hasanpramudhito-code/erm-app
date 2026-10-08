// Identitas tampilan: "Nama Perusahaan — Nama Unit" sesuai akun yang login.
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
  const unit = userData?.unit;
  // Akun tanpa unit (mis. admin) dianggap Kantor Pusat.
  const namaUnit = unit ? (unit.jenis === 'CABANG' && !/^cabang/i.test(unit.nama) ? `Cabang ${unit.nama}` : unit.nama) : 'Kantor Pusat';
  return { perusahaan, namaUnit, jenisUnit: unit?.jenis || 'PUSAT', judul: perusahaan ? `${perusahaan} — ${namaUnit}` : namaUnit };
}
