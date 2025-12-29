// scripts/migrateRiskData.js
const { collection, getDocs, writeBatch } = require('firebase/firestore');
const { db } = require('../config/firebase');
export const migrateRiskData = async (db) => {
  const risksRef = collection(db, 'risks');
  const snapshot = await getDocs(risksRef);
  
  const batch = writeBatch(db);
  let migratedCount = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Update flag assessment
    if (data.likelihood && data.impact && !data.hasAssessment) {
      batch.update(doc.ref, {
        hasAssessment: true,
        lastMigrated: new Date().toISOString()
      });
      migratedCount++;
    }
    
    // Recalculate scores if needed
    if (data.likelihood && data.impact && !data.inherentScore) {
      const inherentScore = data.likelihood * data.impact;
      batch.update(doc.ref, {
        inherentScore: inherentScore,
        riskScore: inherentScore // Jika tidak ada residual
      });
    }
  });
  
  if (migratedCount > 0) {
    await batch.commit();
    console.log(`✅ Migrated ${migratedCount} risks`);
  }
};