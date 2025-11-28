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

/* -----------------------------------------------------------
   🔥 ROLE NORMALIZER — FINAL VERSION
   Membersihkan spasi, newline, tab, karakter tersembunyi
   dan menormalkan role ke: ADMIN, DIRECTOR, RISK_MANAGER,
   RISK_OWNER, STAFF
----------------------------------------------------------- */
const normalizeRole = (role) => {
  if (!role) return "STAFF";

  // Convert to string always
  let clean = role.toString();

  // Remove ALL invisible characters
  clean = clean
    .replace(/[\n\r\t]/g, "")     // newline, tab
    .replace(/\s+/g, " ")         // multiple spaces → single space
    .trim();                      // trim front & back

  // Lowercase for detection
  const r = clean.toLowerCase();

  // Matching flexible, covers all variations:
  if (r === "admin") return "ADMIN";
  if (r.includes("admin")) return "ADMIN";          // admin / administrator
  if (r.includes("administrator")) return "ADMIN";

  if (r.includes("director")) return "DIRECTOR";
  if (r.includes("risk manager") || r.includes("risk_manager"))
    return "RISK_MANAGER";

  if (r.includes("risk owner") || r.includes("risk_owner"))
    return "RISK_OWNER";

  return "STAFF";
};

/* -----------------------------------------------------------
   HOOK
----------------------------------------------------------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/* -----------------------------------------------------------
   PROVIDER
----------------------------------------------------------- */
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          setUserData(null);
          setLoading(false);
          return;
        }

        const data = snap.data();

        // FINAL FIX → Normalize role fully
        const fixedRole = normalizeRole(data.role);

        setUserData({
          ...data,
          role: fixedRole
        });

      } catch (err) {
        console.error("AuthContext Firestore error:", err);
        setUserData(null);
      }

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
