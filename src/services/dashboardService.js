import { db } from '../config/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, where } from 'firebase/firestore';

class DashboardService {
    constructor() {
        this.SUMMARY_DOC_PATH = 'dashboard_summary/current';
    }

    /**
     * Get dashboard summary from a single document
     * This is much more efficient than fetching all risks
     */
    async getSummary() {
        try {
            const summaryRef = doc(db, this.SUMMARY_DOC_PATH);
            const snapshot = await getDoc(summaryRef);

            if (snapshot.exists()) {
                const data = snapshot.data();
                return {
                    ...data,
                    lastUpdated: data.lastUpdated?.toDate?.() || new Date()
                };
            }

            // If summary doesn't exist, calculate it once
            return await this.refreshSummary();
        } catch (error) {

            throw error;
        }
    }

    /**
     * Calculate and save dashboard summary
     * Should be called periodically or triggered by changes
     */
    async refreshSummary() {
        try {


            const risksSnapshot = await getDocs(collection(db, 'risks'));
            const treatmentsSnapshot = await getDocs(collection(db, 'treatment_plans'));
            const incidentsSnapshot = await getDocs(collection(db, 'incidents'));

            const risks = risksSnapshot.docs.map(doc => doc.data());
            const treatments = treatmentsSnapshot.docs.map(doc => doc.data());
            const incidents = incidentsSnapshot.docs.map(doc => doc.data());

            // Basic statistics
            const summary = {
                totalRisks: risks.length,
                assessedRisks: risks.filter(r => r.likelihood && r.impact).length,
                totalTreatments: treatments.length,
                completedTreatments: treatments.filter(p =>
                    p.status?.toLowerCase().includes('completed') ||
                    p.status === 'completed'
                ).length,
                totalIncidents: incidents.length,
                criticalIncidents: incidents.filter(i =>
                    i.severity?.toLowerCase().includes('critical')
                ).length,
                riskLevels: {
                    Extreme: 0,
                    High: 0,
                    Medium: 0,
                    Low: 0,
                    VeryLow: 0
                },
                lastUpdated: Timestamp.now()
            };

            // Note: In real app, we would use the actual calculation logic here
            // but for summary we can store counts
            risks.forEach(risk => {
                // Tentukan level secara sederhana untuk summary
                const score = (risk.likelihood || 1) * (risk.impact || 1);
                if (score >= 20) summary.riskLevels.Extreme++;
                else if (score >= 15) summary.riskLevels.High++;
                else if (score >= 10) summary.riskLevels.Medium++;
                else if (score >= 5) summary.riskLevels.Low++;
                else summary.riskLevels.VeryLow++;
            });

            await setDoc(doc(db, this.SUMMARY_DOC_PATH), summary);


            return {
                ...summary,
                lastUpdated: summary.lastUpdated.toDate()
            };
        } catch (error) {

            throw error;
        }
    }
}

export default new DashboardService();
