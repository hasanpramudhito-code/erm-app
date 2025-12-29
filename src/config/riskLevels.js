
// src/config/riskLevels.js
// Definisi risk levels dipisahkan dari UI agar konsisten lintas modul.
export const RISK_LEVELS = [
  { min: 1,  max: 3,  label: 'Sangat Rendah',  color: '#4caf50' },
  { min: 4,  max: 6,  label: 'Rendah',         color: '#81c784' },
  { min: 7,  max: 10, label: 'Sedang',         color: '#ffeb3b' },
  { min: 11, max: 15, label: 'Tinggi',         color: '#f57c00' },
  { min: 16, max: 20, label: 'Sangat Tinggi',  color: '#d32f2f' },
  { min: 21, max: 25, label: 'Ekstrim',        color: '#7b1fa2' },
];

/**
 * Dapatkan kategori berdasarkan skor numerik.
 * @param {number} score
 * @returns {{label:string,color:string,min:number,max:number}|null}
 */
export function getRiskLevelByScore(score) {
  const s = Number(score) || 0;
  return RISK_LEVELS.find(level => s >= level.min && s <= level.max) || null;
}
