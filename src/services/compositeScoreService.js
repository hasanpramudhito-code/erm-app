import { db } from '../config/firebase';
import { collection, doc, getDocs, addDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import KRIService from './kriService';

class CompositeScoreService {
  
  // ✅ CALCULATE COMPOSITE SCORE untuk organization/department
  async calculateCompositeScore(organizationUnitId = 'default', period = 'monthly') {
    try {
      console.log(`Calculating composite score for ${organizationUnitId}...`);
      
      const [
        inherentScore,
        residualScore, 
        kriScore,
        treatmentScore
      ] = await Promise.all([
        this.calculateInherentRiskScore(organizationUnitId),
        this.calculateResidualRiskScore(organizationUnitId),
        this.calculateKRIScore(organizationUnitId),
        this.calculateTreatmentScore(organizationUnitId)
      ]);

      // Weighted calculation sesuai SK-7
      const compositeScore = (
        (inherentScore * 0.25) +
        (residualScore * 0.35) +
        (kriScore * 0.25) + 
        (treatmentScore * 0.15)
      );

      const scoreData = {
        organization_unit_id: organizationUnitId,
        period: period,
        score: Math.round(compositeScore * 100) / 100,
        components: {
          inherent_risk: Math.round(inherentScore * 100) / 100,
          residual_risk: Math.round(residualScore * 100) / 100,
          kri_performance: Math.round(kriScore * 100) / 100,
          treatment_progress: Math.round(treatmentScore * 100) / 100
        },
        risk_level: this.getRiskLevel(compositeScore),
        calculated_at: Timestamp.now(),
        trend: await this.calculateScoreTrend(organizationUnitId, compositeScore)
      };

      // Save ke database
      await this.saveCompositeScore(scoreData);
      
      console.log('Composite Score Calculated:', scoreData);
      return scoreData;
    } catch (error) {
      console.error('Error calculating composite score:', error);
      throw error;
    }
  }

  // ✅ CALCULATE INHERENT RISK SCORE
  async calculateInherentRiskScore(organizationUnitId) {
    try {
      const risksQuery = query(
        collection(db, 'risks'),
        where('organization_unit_id', '==', organizationUnitId),
        where('status', 'in', ['active', 'monitoring'])
      );
      
      const querySnapshot = await getDocs(risksQuery);
      if (querySnapshot.empty) return 0;

      let totalScore = 0;
      let count = 0;

      querySnapshot.forEach(doc => {
        const risk = doc.data();
        if (risk.inherent_likelihood && risk.inherent_impact) {
          const riskScore = risk.inherent_likelihood * risk.inherent_impact;
          totalScore += riskScore;
          count++;
        }
      });

      const averageScore = count > 0 ? totalScore / count : 0;
      // Convert to 0-100 scale (asumsi max risk score 25 = 5x5)
      return (averageScore / 25) * 100;
    } catch (error) {
      console.error('Error calculating inherent risk score:', error);
      return 0;
    }
  }

  // ✅ CALCULATE RESIDUAL RISK SCORE
  async calculateResidualRiskScore(organizationUnitId) {
    try {
      const risksQuery = query(
        collection(db, 'risks'),
        where('organization_unit_id', '==', organizationUnitId),
        where('status', 'in', ['active', 'monitoring'])
      );
      
      const querySnapshot = await getDocs(risksQuery);
      if (querySnapshot.empty) return 0;

      let totalScore = 0;
      let count = 0;

      querySnapshot.forEach(doc => {
        const risk = doc.data();
        if (risk.residual_likelihood && risk.residual_impact) {
          const riskScore = risk.residual_likelihood * risk.residual_impact;
          totalScore += riskScore;
          count++;
        }
      });

      const averageScore = count > 0 ? totalScore / count : 0;
      // Convert to 0-100 scale
      return (averageScore / 25) * 100;
    } catch (error) {
      console.error('Error calculating residual risk score:', error);
      return 0;
    }
  }

  // ✅ CALCULATE KRI PERFORMANCE SCORE
  async calculateKRIScore(organizationUnitId) {
    try {
      const kris = await KRIService.getAllKRIs(organizationUnitId);
      if (kris.length === 0) return 100; // No KRIs = perfect score

      let totalScore = 0;
      let activeKRIs = 0;

      kris.forEach(kri => {
        if (kri.status !== 'inactive') {
          let kriScore;
          
          if (kri.status === 'green') kriScore = 100;
          else if (kri.status === 'yellow') kriScore = 70;
          else if (kri.status === 'red') kriScore = 30;
          else kriScore = 50; // unknown
          
          totalScore += kriScore;
          activeKRIs++;
        }
      });

      return activeKRIs > 0 ? totalScore / activeKRIs : 100;
    } catch (error) {
      console.error('Error calculating KRI score:', error);
      return 100;
    }
  }

  // ✅ CALCULATE TREATMENT PROGRESS SCORE
  async calculateTreatmentScore(organizationUnitId) {
    try {
      const treatmentsQuery = query(
        collection(db, 'treatment_plans'),
        where('organization_unit_id', '==', organizationUnitId),
        where('status', 'in', ['in_progress', 'completed'])
      );
      
      const querySnapshot = await getDocs(treatmentsQuery);
      if (querySnapshot.empty) return 100; // No treatments = perfect score

      let totalProgress = 0;
      let count = 0;

      querySnapshot.forEach(doc => {
        const treatment = doc.data();
        if (typeof treatment.progress === 'number') {
          totalProgress += treatment.progress;
          count++;
        }
      });

      return count > 0 ? totalProgress / count : 100;
    } catch (error) {
      console.error('Error calculating treatment score:', error);
      return 100;
    }
  }

  // ✅ GET RISK LEVEL dari score
  getRiskLevel(score) {
    if (score >= 80) return 'Extreme';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Very Low';
  }

  // ✅ CALCULATE SCORE TREND
  async calculateScoreTrend(organizationUnitId, currentScore) {
    try {
      // Get historical scores (last 3 periods)
      const historyQuery = query(
        collection(db, 'composite_scores'),
        where('organization_unit_id', '==', organizationUnitId),
        orderBy('calculated_at', 'desc'),
        limit(4)
      );
      
      const querySnapshot = await getDocs(historyQuery);
      const scores = querySnapshot.docs.map(doc => doc.data().score);
      
      if (scores.length < 2) return 'stable';
      
      const previousScore = scores[1]; // Skip current
      const difference = currentScore - previousScore;
      
      if (Math.abs(difference) < 5) return 'stable';
      return difference > 0 ? 'deteriorating' : 'improving';
    } catch (error) {
      console.error('Error calculating trend:', error);
      return 'stable';
    }
  }

  // ✅ SAVE COMPOSITE SCORE
  async saveCompositeScore(scoreData) {
    try {
      await addDoc(collection(db, 'composite_scores'), scoreData);
    } catch (error) {
      console.error('Error saving composite score:', error);
      throw error;
    }
  }

  // ✅ GET COMPOSITE SCORE HISTORY - FIXED VERSION
  async getScoreHistory(limitCount = 10) {
    try {
      console.log('Getting score history with limit:', limitCount);
      
      const scoresRef = collection(db, 'composite_scores');
      
      // ✅ FIXED: Gunakan limit dengan benar
      const q = query(
        scoresRef, 
        orderBy('calculated_at', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const scores = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scores.push({
          id: doc.id,
          ...data,
          // Ensure date is properly converted
          calculated_at: data.calculated_at?.toDate?.() || data.calculated_at
        });
      });
      
      console.log('Retrieved score history:', scores.length, 'records');
      return scores;
      
    } catch (error) {
      console.error('Error getting score history:', error);
      // ✅ Return empty array instead of throwing error
      return [];
    }
  }

  // ✅ GET ALL ORGANIZATION SCORES
  async getAllOrganizationScores() {
    try {
      const scoresQuery = query(
        collection(db, 'composite_scores'),
        orderBy('calculated_at', 'desc')
      );
      
      const querySnapshot = await getDocs(scoresQuery);
      const scores = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group by organization unit
      const organizationScores = {};
      scores.forEach(score => {
        const orgId = score.organization_unit_id;
        if (!organizationScores[orgId]) {
          organizationScores[orgId] = [];
        }
        organizationScores[orgId].push(score);
      });

      return organizationScores;
    } catch (error) {
      console.error('Error getting all organization scores:', error);
      return {};
    }
  }

  // ✅ MANUAL TRIGGER CALCULATION
  async manualCalculate(organizationUnitId = 'default') {
    try {
      const result = await this.calculateCompositeScore(organizationUnitId);
      return result;
    } catch (error) {
      console.error('Error in manual calculation:', error);
      throw error;
    }
  }
}

export default new CompositeScoreService();