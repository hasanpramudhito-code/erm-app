// src/utils/riskCalculator.js
import { getCoordinateScore } from '../config/riskMatrix.js';
import { getRiskLevelByScore } from '../config/riskLevels.js';

/**
 * Hitung skor dan kategori secara konsisten.
 * @param {number|string} impact
 * @param {number|string} likelihood
 * @param {'multiplication'|'coordinate'} method
 * @returns {{
 *   scoreNumeric:number,
 *   scoreLabel:string,
 *   categoryLabel:string,
 *   categoryColor:string,
 *   methodUsed:string,
 * }}
 */
export function calculateRisk(impact, likelihood, method = 'multiplication') {
  const I = Number(impact) || 1;
  const L = Number(likelihood) || 1;

  let scoreNumeric;
  let scoreLabel;

  if (method === 'coordinate') {
    // PASTIKAN ini matrix lookup, bukan perkalian!
    scoreNumeric = getCoordinateScore(L, I); // L dulu, baru I
    scoreLabel = `L${L}×I${I}`; // Format jelas
  } else {
    scoreNumeric = I * L;
    scoreLabel = `${I}×${L}`;
  }

  const level = getRiskLevelByScore(scoreNumeric);
  return {
    scoreNumeric,
    scoreLabel,
    categoryLabel: level?.label ?? 'Unknown',
    categoryColor: level?.color ?? '#9E9E9E',
    methodUsed: method,
  };
}

// Tambahkan fungsi helper untuk export
export const getRiskScoreForExport = (impact, likelihood, method) => {
  const result = calculateRisk(impact, likelihood, method);
  return method === 'coordinate' ? result.scoreLabel : result.scoreNumeric;
};