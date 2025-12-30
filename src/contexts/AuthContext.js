// src/contexts/AuthContext.js
import React, {
  createContext,
  useState,
  useContext,
  useEffect
} from 'react';

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import {
  doc,
  getDoc
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed:', user?.email || 'LOGOUT');

      if (!user) {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
        // 🔒 PRODUKSI: SELALU AMBIL USER BERDASARKAN UID
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        // 🚨 USER TIDAK ADA DI FIRESTORE
        if (!snap.exists()) {
          console.error(`❌ User doc not found for UID: ${user.uid}`);
          await signOut(auth);
          setCurrentUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }

        const data = snap.data();

        // 🚫 USER NON-AKTIF
        if (data.status !== 'active') {
          console.warn(`🚫 ${user.email} is INACTIVE`);
          alert('Akun Anda telah dinonaktifkan. Hubungi administrator.');
          await signOut(auth);
          setCurrentUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }

        // 🎯 NORMALIZE ROLE (LOGIC LAMA DIPERTAHANKAN)
        const allowedRoles = [
          'STAFF',
          'RISK_OWNER',
          'RISK_MANAGER',
          'DIRECTOR',
          'ADMIN'
        ];

        const rawRole = data.role?.toString().trim().toUpperCase();
        const role = allowedRoles.includes(rawRole)
          ? rawRole
          : 'STAFF';

        setUserData({
          ...data,
          uid: user.uid,
          role
        });

        console.log(`✅ ${user.email} logged in as ${role}`);

      } catch (error) {
        console.error('🔥 AuthContext error:', error);
        await signOut(auth);
        setCurrentUser(null);
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
