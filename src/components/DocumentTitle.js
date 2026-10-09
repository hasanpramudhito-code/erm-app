import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { muatIdentitas } from '../services/identitas';

const JUDUL_HALAMAN = {
  '/dashboard': 'Dashboard',
  '/dashboard-korporat': 'Dashboard Korporat',
  '/dashboard-unit': 'Dashboard Unit Kerja',
  '/executive-dashboard': 'Dashboard Eksekutif',
  '/risk-register': 'Register Risiko',
  '/risiko-utama': 'Risiko Utama & Pustaka',
  '/pemantauan': 'Pemantauan',
  '/approval': 'Antrean Verifikasi',
  '/treatment-plans': 'Rencana Mitigasi',
  '/kri-monitoring': 'Indikator Risiko',
  '/incident-reporting': 'Peristiwa Risiko',
  '/reporting': 'Laporan',
  '/control-testing': 'Pengujian Kontrol',
  '/risk-appetite': 'Selera Risiko',
  '/risk-culture': 'Budaya Risiko',
  '/raci-chart': 'Matriks RACI',
  '/organization': 'Organisasi',
};

// Judul tab browser: "Halaman - Nama Perusahaan".
const DocumentTitle = () => {
  const location = useLocation();

  useEffect(() => {
    let aktif = true;
    muatIdentitas().then(({ nama_perusahaan }) => {
      if (!aktif) return;
      const halaman = JUDUL_HALAMAN[location.pathname] || 'Sistem Manajemen Risiko';
      document.title = `${halaman} - ${nama_perusahaan}`;
    });
    return () => { aktif = false; };
  }, [location.pathname]);

  return null;
};

export default DocumentTitle;
