// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

const normalizeRole = (role) => {
  if (!role) return "STAFF";

  let clean = role.toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\n\r\t]/g, "")
    .trim()
    .toUpperCase();

  return clean;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
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
      if (!user) {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          setUserData(null);
        } else {
          const data = snap.data();
          const fixedRole = normalizeRole(data.role);
          
          const normalizedUserData = {
            uid: user.uid,
            email: data.email,
            name: data.name,
            role: fixedRole,
            department: data.department,
            position: data.position,
            phone: data.phone,
            status: data.status,
            permissions: data.permissions || []
          };
          
          setUserData(normalizedUserData);
        }

      } catch (err) {
        console.error("AuthContext Firestore error:", err);
        setUserData(null);
      }

      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider 
      value={{ currentUser, userData, login, logout, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};