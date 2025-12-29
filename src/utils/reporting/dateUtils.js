export const toDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

export const formatDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('id-ID') : '-';
};

export const formatDateTime = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleString('id-ID') : '-';
};
