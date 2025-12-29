export const scoreByConfig = (L, I, calculateScore) => {
  const l = Number(L);
  const p = Number(I);

  const ln = Number.isFinite(l) ? l : 0;
  const pn = Number.isFinite(p) ? p : 0;

  if (typeof calculateScore === 'function') {
    try {
      const s = calculateScore(ln, pn);
      if (Number.isFinite(Number(s))) return Number(s);
    } catch {}
  }
  return ln * pn;
};

export const levelByConfig = (score, calculateRiskLevel) => {
  const s = Number.isFinite(Number(score)) ? Number(score) : 0;

  if (typeof calculateRiskLevel === 'function') {
    const lvl = calculateRiskLevel(s);
    if (typeof lvl === 'string') return { level: lvl, score: s };
    if (lvl?.level) return { ...lvl, score: s };
  }

  return {
    level:
      s >= 20 ? 'Extreme' :
      s >= 16 ? 'High' :
      s >= 10 ? 'Medium' : 'Low',
    score: s,
  };
};
