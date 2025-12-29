// utils/assessmentHelpers.js
export const calculateRiskScore = (likelihood, impact, method = 'multiplication', matrix = null) => {
  if (method === 'coordinate' && matrix) {
    // Pastikan indeks valid (0-based)
    const likelihoodIndex = Math.min(Math.max(likelihood - 1, 0), 4);
    const impactIndex = Math.min(Math.max(impact - 1, 0), 4);
    return matrix[likelihoodIndex][impactIndex];
  }
  return likelihood * impact;
};

export const getRiskLevel = (score, riskLevels) => {
  if (!riskLevels || riskLevels.length === 0) {
    // Default fallback
    if (score <= 5) return { label: 'Low', color: '#4CAF50' };
    if (score <= 10) return { label: 'Medium', color: '#FFC107' };
    if (score <= 15) return { label: 'High', color: '#FF9800' };
    return { label: 'Critical', color: '#F44336' };
  }
  
  const level = riskLevels.find(
    levelItem => score >= levelItem.min && score <= levelItem.max
  );
  
  return level || { label: 'Unknown', color: '#9E9E9E' };
};

export const isRiskAssessed = (riskData) => {
  // Multiple ways to check if risk is assessed
  return (
    riskData.status === 'Assessed - Telah Dinilai' ||
    riskData.assessedBy !== undefined ||
    riskData.assessedAt !== undefined ||
    riskData.hasAssessment === true ||
    (riskData.likelihood && riskData.impact) // Jika sudah ada likelihood & impact
  );
};