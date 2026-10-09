export const fmtNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('id-ID') : '-';
};

export const fmtRp = (v) => {
  if (v === '' || v == null) return '-';
  const n = Number(v);
  return Number.isFinite(n)
    ? `Rp ${n.toLocaleString('id-ID')}`
    : '-';
};
