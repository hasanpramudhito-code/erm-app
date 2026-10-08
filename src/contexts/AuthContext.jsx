import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { SECURITY_CONFIG } from '../config/securityConfig';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    setUserData(null);
    setCurrentUser(null);
    await signOut(auth);
  };

  const loadUserProfile = async (user) => {
    const snap = await getDoc(doc(db, 'users', user.uid));

    if (!snap.exists()) {
      return {
        uid: user.uid,
        email: user.email,
        role: 'STAFF'
      };
    }

    const data = snap.data();
    let role = data.role || 'STAFF';

    if (SECURITY_CONFIG.useSecureFunctions) {
      try {
        const tokenResult = await user.getIdTokenResult();
        if (tokenResult.claims?.role) {
          role = tokenResult.claims.role;
        }
      } catch (error) {
        // fallback ke Firestore
      }
    }

    return {
      uid: user.uid,
      email: user.email,
      role,
      name: data.name || data.displayName || user.email,
      status: data.status || 'active'
    };
  };

  const refreshUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    await user.getIdToken(true);
    const profile = await loadUserProfile(user);
    setUserData(profile);
    return profile;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);

        if (!user) {
          setCurrentUser(null);
          setUserData(null);
          return;
        }

        setCurrentUser(user);

        try {
          const profile = await loadUserProfile(user);
          setUserData(profile);
        } catch (error) {
          if (error.code === 'permission-denied') {
            setUserData(null);
            setCurrentUser(null);
          }
        }

      } catch (err) {
        setCurrentUser(null);
        setUserData(null);
      } finally {
        setLoading(false); // ⬅️ WAJIB DI SINI
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        loading,
        isInitialized: !loading,
        login,
        logout,
        refreshUserData
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
