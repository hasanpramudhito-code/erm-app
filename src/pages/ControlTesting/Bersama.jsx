import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export const LABEL = {
  PREVENTIF: 'Preventif', DETEKTIF: 'Detektif', KOREKTIF: 'Korektif',
  HARIAN: 'Harian', MINGGUAN: 'Mingguan', BULANAN: 'Bulanan', TRIWULANAN: 'Triwulanan', SEMESTERAN: 'Semesteran', TAHUNAN: 'Tahunan',
  DESAIN: 'Desain', OPERASIONAL: 'Operasional', KEDUANYA: 'Desain & operasional',
  DIJADWALKAN: 'Dijadwalkan', SELESAI: 'Selesai', DIBATALKAN: 'Dibatalkan',
  EFEKTIF: 'Efektif', SEBAGIAN_EFEKTIF: 'Sebagian efektif', TIDAK_EFEKTIF: 'Tidak efektif',
  TERBUKA: 'Terbuka', BERJALAN: 'Berjalan', DITUTUP: 'Ditutup',
  PEMANTAUAN: 'Pemantauan', RENDAH: 'Rendah', SEDANG: 'Sedang', TINGGI: 'Tinggi', KRITIS: 'Kritis',
};
export const opsi = (...kode) => kode.map((k) => [k, LABEL[k]]);
export const hariIni = () => new Date().toISOString().slice(0, 10);

// Pilihan kontrol aktif & pengguna untuk form.
export function usePilihan() {
  const [kontrol, setKontrol] = useState([]);
  const [pengguna, setPengguna] = useState([]);
  useEffect(() => {
    api.get('/kontrol').then((d) => setKontrol(d.filter((k) => k.aktif).map((k) => [k.id, k.kode ? `${k.kode} · ${k.nama}` : k.nama]))).catch(() => {});
    api.get('/pengguna/ringkas').then((d) => setPengguna(d.map((p) => [p.id, p.nama]))).catch(() => {});
  }, []);
  return { kontrol, pengguna };
}
