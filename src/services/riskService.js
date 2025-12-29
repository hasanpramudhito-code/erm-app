import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const fetchRisks = async () => {
  const snapshot = await getDocs(collection(db, 'risks'));

  return snapshot.docs.map(doc => ({
    id: doc.id,        // 🔥 KUNCI UTAMA
    ...doc.data()
  }));
};
