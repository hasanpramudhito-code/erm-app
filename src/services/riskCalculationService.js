import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

class RiskCalculationService {
  
  // ✅ CALCULATE RISK LEVEL BERDASARKAN KOORDINAT 2D
  calculateRiskLevel(likelihood, impact) {
    // Validasi input dengan lebih ketat
    const validated = this.validateRiskCoordinates(likelihood, impact);
    if (!validated.isValid) {
      // Return default jika validasi gagal
      likelihood = 1;
      impact = 1;
    } else {
      likelihood = Math.max(1, Math.min(5, parseInt(likelihood) || 1));
      impact = Math.max(1, Math.min(5, parseInt(impact) || 1));
    }
    
    const coordinates = {
      likelihood: likelihood,
      impact: impact,
      x: likelihood,
      y: impact
    };
    
    // Gunakan coordinate method untuk konsistensi
    const riskResult = this.calculateRiskByCoordinate(likelihood, impact);
    
    return {
      level: riskResult.level,
      color: riskResult.color,
      score: riskResult.score,
      coordinates: coordinates,
      position: this.calculateHeatmapPosition(coordinates),
      description: riskResult.description,
      scoreLabel: riskResult.scoreLabel,
      categoryLabel: riskResult.categoryLabel
    };
  }
  
  // ✅ RISK MATRIX CONFIGURATION (5x5 Grid) - DIKONSISTENKAN
  getRiskMatrixConfiguration() {
    // Matrix koordinat 5x5 sesuai dengan riskCalculator.js
    const COORDINATE_MATRIX = [
      [1, 3, 5, 8, 20],
      [2, 7, 11, 13, 21],
      [4, 10, 14, 17, 22],
      [6, 12, 16, 19, 24],
      [9, 15, 18, 23, 25]
    ];
    
    // Mapping level berdasarkan score
    const getLevelFromScore = (score) => {
      if (score <= 3) return { level: 'Very Low', color: '#1976d2', description: 'Risiko sangat rendah' };
      if (score <= 5) return { level: 'Low', color: '#388e3c', description: 'Risiko rendah' };
      if (score <= 8) return { level: 'Low', color: '#388e3c', description: 'Risiko rendah' };
      if (score <= 15) return { level: 'Medium', color: '#fbc02d', description: 'Risiko medium' };
      if (score <= 20) return { level: 'High', color: '#f57c00', description: 'Risiko tinggi' };
      return { level: 'Extreme', color: '#d32f2f', description: 'Risiko sangat tinggi' };
    };
    
    // Generate zones secara dinamis berdasarkan matrix
    const zones = [];
    
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      for (let impact = 1; impact <= 5; impact++) {
        const row = likelihood - 1;
        const col = impact - 1;
        const score = COORDINATE_MATRIX[row][col];
        const levelInfo = getLevelFromScore(score);
        
        zones.push([
          likelihood, // min_likelihood
          likelihood, // max_likelihood
          impact,     // min_impact
          impact,     // max_impact
          levelInfo.level,
          levelInfo.color,
          score,
          levelInfo.description
        ]);
      }
    }
    
    return { zones };
  }
  
  // ✅ METODE COORDINATE YANG KONSISTEN DENGAN riskCalculator.js
  calculateRiskByCoordinate(likelihood, impact) {
    const COORDINATE_MATRIX = [
      [1, 3, 5, 8, 20],
      [2, 7, 11, 13, 21],
      [4, 10, 14, 17, 22],
      [6, 12, 16, 19, 24],
      [9, 15, 18, 23, 25]
    ];
    
    const row = Math.max(0, Math.min(likelihood - 1, 4));
    const col = Math.max(0, Math.min(impact - 1, 4));
    const score = COORDINATE_MATRIX[row][col];
    
    // Mapping yang konsisten dengan riskCalculator.js
    let level, color, description, categoryLabel;
    
    if (score <= 3) {
      level = 'Very Low';
      color = '#1976d2';
      categoryLabel = 'SANGAT RENDAH';
      description = 'Risiko sangat rendah';
    } else if (score <= 8) {
      level = 'Low';
      color = '#388e3c';
      categoryLabel = 'RENDAH';
      description = 'Risiko rendah';
    } else if (score <= 15) {
      level = 'Medium';
      color = '#fbc02d';
      categoryLabel = 'SEDANG';
      description = 'Risiko medium';
    } else if (score <= 20) {
      level = 'High';
      color = '#f57c00';
      categoryLabel = 'TINGGI';
      description = 'Risiko tinggi';
    } else {
      level = 'Extreme';
      color = '#d32f2f';
      categoryLabel = 'SANGAT TINGGI';
      description = 'Risiko sangat tinggi';
    }
    
    return {
      level,
      color,
      score,
      description,
      scoreLabel: `L${likelihood}×I${impact}`,
      categoryLabel
    };
  }
  
  // ✅ FIND RISK LEVEL BERDASARKAN KOORDINAT - DISEDERHANAKAN
  findRiskLevelInMatrix(coordinates, riskMatrix) {
    const { likelihood, impact } = coordinates;
    
    for (const zone of riskMatrix.zones) {
      const [minLikelihood, maxLikelihood, minImpact, maxImpact, level, color, score, description] = zone;
      
      if (likelihood >= minLikelihood && likelihood <= maxLikelihood &&
          impact >= minImpact && impact <= maxImpact) {
        return { 
          level, 
          color, 
          score, 
          description,
          scoreLabel: `L${likelihood}×I${impact}`,
          categoryLabel: this.getCategoryLabelFromLevel(level)
        };
      }
    }
    
    // Fallback ke metode coordinate
    return this.calculateRiskByCoordinate(likelihood, impact);
  }
  
  // ✅ GET CATEGORY LABEL DARI LEVEL
  getCategoryLabelFromLevel(level) {
    const mapping = {
      'Very Low': 'SANGAT RENDAH',
      'Low': 'RENDAH',
      'Medium': 'SEDANG',
      'High': 'TINGGI',
      'Extreme': 'SANGAT TINGGI'
    };
    return mapping[level] || 'TIDAK TERDEFINISI';
  }
  
  // ✅ CALCULATE HEATMAP POSITION (untuk visualisasi) - TETAP SAMA
  calculateHeatmapPosition(coordinates) {
    const { likelihood, impact } = coordinates;
    
    const x = ((likelihood - 1) / 4) * 100;
    const y = 100 - ((impact - 1) / 4) * 100;
    
    return { x, y };
  }
  
  // ✅ GET ALL RISKS WITH HEATMAP COORDINATES - DIKONSISTENKAN
  async getAllRisksWithHeatmap(organizationId = null) {
    try {
      let risksQuery;
      if (organizationId) {
        risksQuery = query(
          collection(db, 'risks'),
          where('organization_unit_id', '==', organizationId),
          where('status', 'in', ['active', 'monitoring'])
        );
      } else {
        risksQuery = query(collection(db, 'risks'));
      }
      
      const querySnapshot = await getDocs(risksQuery);
      const risks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Gunakan metode coordinate yang konsisten
      return risks.map(risk => {
        const likelihood = risk.likelihood || 1;
        const impact = risk.impact || 1;
        const heatmapData = this.calculateRiskByCoordinate(likelihood, impact);
        const coordinates = { likelihood, impact };
        
        return {
          ...risk,
          heatmap: {
            ...heatmapData,
            coordinates: coordinates,
            position: this.calculateHeatmapPosition(coordinates)
          },
          // Legacy score untuk compatibility - gunakan score dari coordinate method
          riskScore: heatmapData.score,
          riskLevel: heatmapData.level
        };
      });
    } catch (error) {
      console.error('Error getting risks with heatmap:', error);
      return [];
    }
  }
  
  // ✅ GET HEATMAP DATA UNTUK VISUALISASI - TETAP SAMA
  async getHeatmapData(organizationId = null) {
    const risks = await this.getAllRisksWithHeatmap(organizationId);
    
    const heatmapData = {};
    
    risks.forEach(risk => {
      const key = `${risk.heatmap.coordinates.likelihood}-${risk.heatmap.coordinates.impact}`;
      
      if (!heatmapData[key]) {
        heatmapData[key] = {
          coordinates: risk.heatmap.coordinates,
          position: risk.heatmap.position,
          count: 0,
          risks: [],
          level: risk.heatmap.level,
          color: risk.heatmap.color,
          score: risk.heatmap.score,
          scoreLabel: risk.heatmap.scoreLabel,
          categoryLabel: risk.heatmap.categoryLabel
        };
      }
      
      heatmapData[key].count++;
      heatmapData[key].risks.push({
        id: risk.id,
        title: risk.title,
        description: risk.description,
        level: risk.heatmap.level
      });
    });
    
    return {
      risks: risks,
      heatmap: Object.values(heatmapData),
      statistics: this.calculateHeatmapStatistics(risks)
    };
  }
  
  // ✅ CALCULATE HEATMAP STATISTICS - TETAP SAMA
  calculateHeatmapStatistics(risks) {
    const stats = {
      total: risks.length,
      byLevel: {
        'Extreme': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0,
        'Very Low': 0
      },
      byCategory: {
        'SANGAT TINGGI': 0,
        'TINGGI': 0,
        'SEDANG': 0,
        'RENDAH': 0,
        'SANGAT RENDAH': 0
      },
      byCoordinate: {},
      highestRisk: null
    };
    
    let maxScore = 0;
    
    risks.forEach(risk => {
      // Count by level
      stats.byLevel[risk.heatmap.level] = (stats.byLevel[risk.heatmap.level] || 0) + 1;
      
      // Count by category label
      stats.byCategory[risk.heatmap.categoryLabel] = (stats.byCategory[risk.heatmap.categoryLabel] || 0) + 1;
      
      // Count by coordinate
      const coordKey = `${risk.heatmap.coordinates.likelihood},${risk.heatmap.coordinates.impact}`;
      stats.byCoordinate[coordKey] = (stats.byCoordinate[coordKey] || 0) + 1;
      
      // Find highest risk
      if (risk.heatmap.score > maxScore) {
        maxScore = risk.heatmap.score;
        stats.highestRisk = risk;
      }
    });
    
    return stats;
  }
  
  // ✅ COMPARE TWO RISK POSITIONS - TETAP SAMA
  compareRiskPositions(risk1, risk2) {
    const pos1 = risk1.heatmap.position;
    const pos2 = risk2.heatmap.position;
    
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    
    return {
      distance: distance,
      risk1Position: `L${risk1.heatmap.coordinates.likelihood}-I${risk1.heatmap.coordinates.impact}`,
      risk2Position: `L${risk2.heatmap.coordinates.likelihood}-I${risk2.heatmap.coordinates.impact}`,
      similarity: Math.max(0, 100 - (distance * 10))
    };
  }
  
  // ✅ GET RISK CLUSTERS - TETAP SAMA
  getRiskClusters(risks, maxDistance = 20) {
    const clusters = [];
    const processed = new Set();
    
    risks.forEach((risk, index) => {
      if (processed.has(risk.id)) return;
      
      const cluster = {
        center: risk.heatmap.position,
        risks: [risk],
        level: risk.heatmap.level,
        color: risk.heatmap.color,
        scoreLabel: risk.heatmap.scoreLabel,
        categoryLabel: risk.heatmap.categoryLabel
      };
      
      // Find similar risks
      risks.forEach((otherRisk, otherIndex) => {
        if (index === otherIndex || processed.has(otherRisk.id)) return;
        
        const comparison = this.compareRiskPositions(risk, otherRisk);
        if (comparison.distance <= maxDistance) {
          cluster.risks.push(otherRisk);
          processed.add(otherRisk.id);
        }
      });
      
      clusters.push(cluster);
      processed.add(risk.id);
    });
    
    return clusters;
  }

  // ✅ GET RISK MATRIX FOR DISPLAY - DIKONSISTENKAN
  getRiskMatrixForDisplay() {
    const matrix = [];
    
    for (let impact = 5; impact >= 1; impact--) {
      const row = [];
      for (let likelihood = 1; likelihood <= 5; likelihood++) {
        const riskData = this.calculateRiskByCoordinate(likelihood, impact);
        row.push({
          likelihood,
          impact,
          level: riskData.level,
          color: riskData.color,
          description: riskData.description,
          score: riskData.score,
          scoreLabel: riskData.scoreLabel,
          categoryLabel: riskData.categoryLabel
        });
      }
      matrix.push(row);
    }
    
    return matrix;
  }

  // ✅ VALIDATE RISK COORDINATES - DIKONSISTENKAN
  validateRiskCoordinates(likelihood, impact) {
    const errors = [];
    
    if (likelihood === undefined || impact === undefined) {
      errors.push('Likelihood dan Impact harus diisi');
    }
    
    const likelihoodNum = parseInt(likelihood);
    const impactNum = parseInt(impact);
    
    if (isNaN(likelihoodNum) || isNaN(impactNum)) {
      errors.push('Likelihood dan Impact harus angka');
    } else {
      if (likelihoodNum < 1 || likelihoodNum > 5) {
        errors.push('Likelihood harus antara 1-5');
      }
      
      if (impactNum < 1 || impactNum > 5) {
        errors.push('Impact harus antara 1-5');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      validatedValues: errors.length === 0 ? {
        likelihood: likelihoodNum,
        impact: impactNum
      } : null
    };
  }
  
  // ✅ METODE MULTIPLICATION UNTUK COMPATIBILITY (jika diperlukan)
  calculateRiskByMultiplication(likelihood, impact) {
    const score = likelihood * impact;
    let level, color, description, categoryLabel;
    
    if (score <= 3) {
      level = 'Very Low';
      color = '#1976d2';
      categoryLabel = 'SANGAT RENDAH';
      description = 'Risiko sangat rendah';
    } else if (score <= 8) {
      level = 'Low';
      color = '#388e3c';
      categoryLabel = 'RENDAH';
      description = 'Risiko rendah';
    } else if (score <= 15) {
      level = 'Medium';
      color = '#fbc02d';
      categoryLabel = 'SEDANG';
      description = 'Risiko medium';
    } else if (score <= 20) {
      level = 'High';
      color = '#f57c00';
      categoryLabel = 'TINGGI';
      description = 'Risiko tinggi';
    } else {
      level = 'Extreme';
      color = '#d32f2f';
      categoryLabel = 'SANGAT TINGGI';
      description = 'Risiko sangat tinggi';
    }
    
    return {
      level,
      color,
      score,
      description,
      scoreLabel: `${score}`,
      categoryLabel
    };
  }
}

export default new RiskCalculationService();