// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdTokenResult // ✅ Tambahkan ini
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // ✅ Refresh token untuk mendapatkan custom claims
      await userCredential.user.getIdToken(true);
      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

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

      try {
        // ✅ Refresh token untuk memastikan claims terbaru
        await user.getIdToken(true);
        const tokenResult = await getIdTokenResult(user);
        console.log('🔑 User claims:', tokenResult.claims);

        setCurrentUser(user);

        // 🔒 Coba ambil user data dengan retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let snap = null;

        while (retryCount < maxRetries && !snap) {
          try {
            const userRef = doc(db, 'users', user.uid);
            snap = await getDoc(userRef);
            
            if (!snap.exists()) {
              console.error(`❌ User doc not found for UID: ${user.uid}`);
              break;
            }
          } catch (error) {
            console.warn(`⚠️ Retry ${retryCount + 1}/${maxRetries}:`, error.message);
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Tunggu sebentar sebelum retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw error;
            }
          }
        }

        if (!snap || !snap.exists()) {
          console.error('🚫 User document tidak ditemukan');
          await signOut(auth);
          return;
        }

        const data = snap.data();

        // 🚫 User non-aktif
        if (data.status !== 'active') {
          console.warn(`🚫 ${user.email} is INACTIVE`);
          alert('Akun Anda telah dinonaktifkan. Hubungi administrator.');
          await signOut(auth);
          return;
        }

        // 🎯 Normalize role dengan fallback dari claims
        const allowedRoles = [
          'STAFF',
          'RISK_OWNER',
          'RISK_MANAGER',
          'DIRECTOR',
          'ADMIN'
        ];

        const rawRole = data.role?.toString().trim().toUpperCase() || 
                       tokenResult.claims.role?.toString().trim().toUpperCase();
        
        const role = allowedRoles.includes(rawRole)
          ? rawRole
          : 'STAFF';

        setUserData({
          ...data,
          uid: user.uid,
          role,
          email: user.email,
          // ✅ Tambahkan claims untuk debugging
          claims: tokenResult.claims
        });

        console.log(`✅ ${user.email} logged in as ${role}`);

      } catch (error) {
        console.error('🔥 AuthContext error:', error.code, error.message);
        
        if (error.code === 'permission-denied') {
          console.error('🚨 Permission denied! Kemungkinan masalah:');
          console.error('1. Security rules terlalu ketat');
          console.error('2. User belum ada di Firestore');
          console.error('3. Custom claims tidak ter-update');
          
          // Logout user karena tidak bisa akses data
          await signOut(auth);
        }
        
        setCurrentUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
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