
// src/config/riskMatrix.js
// Sumber data matriks koordinat dipisahkan dari komponen UI agar reusable lintas modul.
// Format entri: [Likelihood (L), Impact (I), Score Numerik]
export const COORDINATE_MATRIX = [
  [1, 1, 1],
  [1, 2, 3],
  [1, 3, 5],
  [1, 4, 8],
  [1, 5, 20],
  [2, 1, 2],
  [2, 2, 7],
  [2, 3, 11],
  [2, 4, 13],
  [2, 5, 21],
  [3, 1, 4],
  [3, 2, 10],
  [3, 3, 14],
  [3, 4, 17],
  [3, 5, 22],
  [4, 1, 6],
  [4, 2, 12],
  [4, 3, 16],
  [4, 4, 19],
  [4, 5, 24],
  [5, 1, 9],
  [5, 2, 15],
  [5, 3, 18],
  [5, 4, 23],
  [5, 5, 25],
];

/**
 * Ambil skor numerik dari koordinat L-I; fallback ke perkalian jika tidak ditemukan.
 * @param {number|string} likelihood Likelihood (L)
 * @param {number|string} impact Impact (I)
 * @param {number} [fallbackProduct] opsional untuk override fallback
 * @returns {number} skor numerik
 */
export function getCoordinateScore(likelihood, impact, fallbackProduct) {
  const L = Number(likelihood) || 1;
  const I = Number(impact) || 1;
  const entry = COORDINATE_MATRIX.find(([l, i]) => l === L && i === I);
  if (entry) return entry[2];
  const product = L * I;
  return typeof fallbackProduct === 'number' ? fallbackProduct : product;
}