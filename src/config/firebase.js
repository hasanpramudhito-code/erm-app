// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';


// TEMPORARY CONFIG - nanti diganti dengan config asli dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAsDoe4YD89i6RrJEDopgiQDzEg-VD-zuo",
  authDomain: "erm-system-2449b.firebaseapp.com",
  projectId: "erm-system-2449b",
  storageBucket: "erm-system-2449b.firebasestorage.app",
  messagingSenderId: "72430044646",
  appId: "1:72430044646:web:b70a4eba1cae2dd0e74227",
  measurementId: "G-1C2PYG5XFX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Pastikan ini ada



export default app;