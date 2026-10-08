// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || "AIzaSyBG3gPzqbda-55msxaFJCiSAaxS8aKMGCo",
  authDomain: import.meta.env.VITE_AUTH_DOMAIN || "tirtatuahbanuarm.firebaseapp.com",
  projectId: import.meta.env.VITE_PROJECT_ID || "tirtatuahbanuarm",
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET || "tirtatuahbanuarm.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID || "462375281179",
  appId: import.meta.env.VITE_APP_ID || "1:462375281179:web:4a8709924dbe792ea0cebe",
  measurementId: import.meta.env.VITE_MEASUREMENT_ID || "G-XNNN0MLZWK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

if (import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { auth, db, storage, app };