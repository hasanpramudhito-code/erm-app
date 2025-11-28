// src/services/controlTestingService.js
import { db } from '../config/firebase';
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, Timestamp 
} from 'firebase/firestore';

export const controlTestingService = {
  // Control Register Management
  async getControls(organizationId) {
    const q = query(
      collection(db, 'controls'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createControl(controlData) {
    return await addDoc(collection(db, 'controls'), {
      ...controlData,
      createdAt: Timestamp.now(),
      status: 'active'
    });
  },

  async updateControl(controlId, updates) {
    await updateDoc(doc(db, 'controls', controlId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  },

  // Testing Schedule Management
  async getTestingSchedules(controlId) {
    const q = query(
      collection(db, 'controls', controlId, 'testingSchedules'),
      orderBy('scheduledDate', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createTestingSchedule(controlId, scheduleData) {
    return await addDoc(collection(db, 'controls', controlId, 'testingSchedules'), {
      ...scheduleData,
      createdAt: Timestamp.now(),
      status: 'scheduled'
    });
  },

  // Test Results Management
  async getTestResults(controlId) {
    const q = query(
      collection(db, 'controls', controlId, 'testResults'),
      orderBy('testDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addTestResult(controlId, resultData) {
    return await addDoc(collection(db, 'controls', controlId, 'testResults'), {
      ...resultData,
      createdAt: Timestamp.now(),
      status: 'completed'
    });
  },

  // Deficiency Tracking
  async getDeficiencies(organizationId) {
    const q = query(
      collection(db, 'deficiencies'),
      where('organizationId', '==', organizationId),
      orderBy('identifiedDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createDeficiency(deficiencyData) {
    return await addDoc(collection(db, 'deficiencies'), {
      ...deficiencyData,
      createdAt: Timestamp.now(),
      status: 'open'
    });
  },

  async updateDeficiency(deficiencyId, updates) {
    await updateDoc(doc(db, 'deficiencies', deficiencyId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }
};