import { saveAs } from 'file-saver';

export const buildFileName = (prefix, ext) => {
  const d = new Date().toISOString().slice(0, 10);
  return `${prefix}_${d}.${ext}`;
};

export const saveTextFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
};
