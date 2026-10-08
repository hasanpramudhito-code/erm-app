import React from 'react';
import { Box, Button, Chip, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import { Plus, Trash2, BookOpen } from 'lucide-react';

// Daftar penyebab/dampak. Pilih dari pustaka risiko utama (teks disalin, rujukan disimpan) atau tulis sendiri.
// value: [{ uraian, pustaka_id }]
const UraianPustakaEditor = ({ label, value = [], onChange, pustaka = [] }) => {
  const terpakai = new Set(value.map((v) => v.pustaka_id).filter(Boolean));
  const tersedia = pustaka.filter((p) => !terpakai.has(p.id));
  const ubah = (i, uraian) => onChange(value.map((v, j) => (j === i ? { ...v, uraian } : v)));

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>{label}</Typography>
      {value.map((v, i) => (
        <Box key={i} display="flex" gap={1} alignItems="flex-start" mb={1}>
          <TextField
            fullWidth size="small" multiline value={v.uraian}
            onChange={(e) => ubah(i, e.target.value)}
            InputProps={v.pustaka_id ? { startAdornment: <Chip size="small" icon={<BookOpen size={14} />} label="Pustaka" sx={{ mr: 1 }} /> } : undefined}
            helperText={v.pustaka_id ? 'Dari pustaka; boleh disesuaikan dengan kondisi unit' : ''}
          />
          <IconButton size="small" color="error" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Hapus ${label} ${i + 1}`}>
            <Trash2 size={18} />
          </IconButton>
        </Box>
      ))}
      <Box display="flex" gap={1} flexWrap="wrap">
        {tersedia.length > 0 && (
          <TextField
            select size="small" label="Pilih dari pustaka" value="" sx={{ minWidth: 260 }}
            onChange={(e) => {
              const p = pustaka.find((x) => x.id === e.target.value);
              onChange([...value, { uraian: p.uraian, pustaka_id: p.id }]);
            }}
          >
            {tersedia.map((p) => <MenuItem key={p.id} value={p.id} sx={{ whiteSpace: 'normal' }}>{p.uraian}</MenuItem>)}
          </TextField>
        )}
        <Button size="small" startIcon={<Plus size={16} />} onClick={() => onChange([...value, { uraian: '', pustaka_id: null }])}>
          Tulis sendiri
        </Button>
      </Box>
    </Box>
  );
};

export default UraianPustakaEditor;
