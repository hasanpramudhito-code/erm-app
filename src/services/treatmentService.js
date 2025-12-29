import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Ambil SEMUA treatment plans dari Firestore
 * Ini akan jadi SINGLE SOURCE OF TRUTH
 */
export const fetchTreatmentPlans = async () => {
  const q = query(
    collection(db, 'treatment_plans'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || null,
      deadline: data.deadline?.toDate?.() || null,
    };
  });
};
