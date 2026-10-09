import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

// ponytail: peta peran baru -> kode role lama, agar halaman yang belum dipindahkan tetap jalan.
// Hapus setelah semua pengecekan role (roles.js, EnhancedNavigation) memakai `peran`.
const ROLE_LAMA = [
  ['ADMIN', 'ADMIN'],
  ['DIREKSI', 'DIRECTOR'],
  ['PENGELOLA_RISIKO', 'RISK_MANAGER'],
  ['PIMPINAN', 'RISK_OWNER'],
  ['AUDITOR', 'RISK_OWNER'],
];
const roleLama = (peran) => ROLE_LAMA.find(([baru]) => peran.includes(baru))?.[1] || 'STAFF';

const keUserData = (p) => ({
  ...p,
  uid: p.id,
  name: p.nama,
  role: roleLama(p.peran),
  status: 'active',
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = useCallback(async () => {
    try {
      const p = keUserData(await api.get('/auth/saya'));
      setUserData(p);
      return p;
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      setUserData(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUserData().finally(() => setLoading(false));
  }, [refreshUserData]);

  const login = async (email, password) => {
    const p = keUserData(await api.post('/auth/login', { email, kata_sandi: password }));
    setUserData(p);
    return p;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setUserData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser: userData,
        userData,
        loading,
        isInitialized: !loading,
        authReady: !loading,
        login,
        logout,
        refreshUserData,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
