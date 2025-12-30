// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdTokenResult  // ✅ Pastikan ini di-import
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
  const [debugInfo, setDebugInfo] = useState(''); // ✅ Untuk debugging

  const login = async (email, password) => {
    console.log("🔐 Attempting login for:", email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login successful, user UID:", userCredential.user.uid);
      
      // ✅ FORCE REFRESH TOKEN untuk mendapatkan custom claims
      await userCredential.user.getIdToken(true);
      console.log("🔄 Token refreshed");
      
      return userCredential;
    } catch (error) {
      console.error("❌ Login failed:", error.code, error.message);
      throw error;
    }
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    return signOut(auth);
  };

  useEffect(() => {
    console.log("🔧 AuthProvider mounted, setting up auth listener...");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed:', user ? `User: ${user.email} (${user.uid})` : 'LOGOUT');
      
      // Collect debug info
      let debugLog = `Auth State: ${user ? 'Logged In' : 'Logged Out'}\n`;
      debugLog += `Timestamp: ${new Date().toISOString()}\n`;

      if (!user) {
        console.log("👤 No user, clearing data");
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        debugLog += "Action: Cleared user data\n";
        setDebugInfo(debugLog);
        return;
      }

      try {
        // ✅ GET TOKEN RESULT untuk melihat claims
        console.log("🔍 Getting ID token result...");
        const tokenResult = await getIdTokenResult(user);
        console.log("📋 Token claims:", tokenResult.claims);
        debugLog += `Claims: ${JSON.stringify(tokenResult.claims, null, 2)}\n`;

        // ✅ FORCE TOKEN REFRESH jika claims tidak ada
        if (!tokenResult.claims.role) {
          console.log("⚠️ No role claim found, refreshing token...");
          await user.getIdToken(true);
          const newTokenResult = await getIdTokenResult(user);
          console.log("🔄 New claims:", newTokenResult.claims);
          debugLog += `New Claims: ${JSON.stringify(newTokenResult.claims, null, 2)}\n`;
        }

        setCurrentUser(user);
        debugLog += `Current User Set: ${user.email}\n`;

        // ✅ COBA AKSES FIRESTORE dengan retry
        console.log(`📁 Attempting to access Firestore at: users/${user.uid}`);
        debugLog += `Firestore Path: users/${user.uid}\n`;

        let retryCount = 0;
        const maxRetries = 3;
        let userDoc = null;
        let lastError = null;

        while (retryCount < maxRetries && !userDoc) {
          try {
            const userRef = doc(db, 'users', user.uid);
            console.log(`🔄 Retry ${retryCount + 1}/${maxRetries}: Getting user document...`);
            
            userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
              console.error(`❌ User document does not exist for UID: ${user.uid}`);
              debugLog += `Error: User document not found\n`;
              lastError = new Error('User document not found');
              break;
            }
            
            console.log("✅ User document found!");
            debugLog += `Success: User document retrieved on retry ${retryCount + 1}\n`;
            
          } catch (error) {
            retryCount++;
            lastError = error;
            console.error(`⚠️ Attempt ${retryCount} failed:`, error.code, error.message);
            debugLog += `Attempt ${retryCount} failed: ${error.code} - ${error.message}\n`;
            
            if (retryCount < maxRetries) {
              // Wait 1 second before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!userDoc || !userDoc.exists()) {
          console.error("🚫 Failed to get user document after all retries");
          debugLog += `Final Result: FAILED - ${lastError?.message}\n`;
          
          if (lastError?.code === 'permission-denied') {
            console.error("🔒 PERMISSION DENIED! Check Firestore rules:");
            console.error("1. Is rules deployed?");
            console.error("2. Does user have access to /users/{userId}?");
            console.error("3. Is user ID correct:", user.uid);
            
            // Show alert for admin
            if (window.confirm(`Permission denied for ${user.email}. Logout and check rules?`)) {
              await signOut(auth);
            }
          }
          
          setCurrentUser(null);
          setUserData(null);
          setLoading(false);
          setDebugInfo(debugLog);
          return;
        }

        const data = userDoc.data();
        console.log("📋 User data:", data);
        debugLog += `User Data: ${JSON.stringify(data, null, 2)}\n`;

        // Check user status
        if (data.status !== 'active') {
          console.warn(`🚫 ${user.email} is INACTIVE`);
          alert('Akun Anda telah dinonaktifkan. Hubungi administrator.');
          await signOut(auth);
          return;
        }

        // Normalize role
        const allowedRoles = ['STAFF', 'RISK_OWNER', 'RISK_MANAGER', 'DIRECTOR', 'ADMIN'];
        const rawRole = data.role?.toString().trim().toUpperCase() || 
                       tokenResult.claims.role?.toString().trim().toUpperCase() || 
                       'STAFF';
        
        const role = allowedRoles.includes(rawRole) ? rawRole : 'STAFF';

        console.log(`✅ ${user.email} logged in as ${role}`);
        debugLog += `Final Role: ${role}\n`;

        setUserData({
          ...data,
          uid: user.uid,
          email: user.email,
          role,
          claims: tokenResult.claims
        });

        debugLog += `✅ Auth flow completed successfully\n`;
        
      } catch (error) {
        console.error('🔥 AuthContext FATAL ERROR:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        debugLog += `🔥 FATAL ERROR: ${error.code} - ${error.message}\n`;
        
        // Auto logout on permission error
        if (error.code === 'permission-denied') {
          console.error('🔒 Auto-logout due to permission error');
          await signOut(auth);
        }
        
        setCurrentUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
        setDebugInfo(debugLog);
        console.log("🏁 Auth loading complete");
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth listener");
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    debugInfo,  // ✅ Export debug info
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      
      {/* ✅ DEBUG PANEL - Hanya muncul di development */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '10px',
          fontSize: '10px',
          maxWidth: '400px',
          maxHeight: '300px',
          overflow: 'auto',
          zIndex: 9999,
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          <strong>🔍 Auth Debug Info:</strong>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {debugInfo}
          </pre>
          <button 
            onClick={() => setDebugInfo('')}
            style={{ marginTop: '5px', fontSize: '8px' }}
          >
            Clear
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
};