import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { muatIdentitas } from '../services/identitas';

const JUDUL_HALAMAN = {
  '/dashboard': 'Dashboard',
  '/risk-register': 'Risk Register',
  '/risk-assessment': 'Risk Assessment',
  '/pemantauan-bulanan': 'Pemantauan Bulanan',
  '/approval': 'Antrean Verifikasi',
  '/user-management': 'Manajemen User',
  '/organization-structure': 'Struktur Organisasi',
  '/reporting': 'Laporan',
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
