const prisma = require('./db');

// Matriks koordinat 5x5 [kemungkinan-1][dampak-1], sama dengan aplikasi eksisting.
const MATRIKS_KOORDINAT = [
  [1, 3, 5, 8, 20],
  [2, 7, 11, 13, 21],
  [4, 10, 14, 17, 22],
  [6, 12, 16, 19, 24],
  [9, 15, 18, 23, 25],
];

function hitungSkor(kemungkinan, dampak, metode) {
  if (metode === 'coordinate' && kemungkinan <= 5 && dampak <= 5) return MATRIKS_KOORDINAT[kemungkinan - 1][dampak - 1];
  return kemungkinan * dampak;
}

// Muat skala, level, dan metode sekali per request.
async function konteksPenilaian() {
  const [k, d, level, metode] = await Promise.all([
    prisma.skala_kemungkinan.findMany({ select: { nilai: true } }),
    prisma.skala_dampak.findMany({ select: { nilai: true }, distinct: ['nilai'] }),
    prisma.level_risiko.findMany({ orderBy: { skor_min: 'asc' } }),
    prisma.pengaturan.findUnique({ where: { kunci: 'metode_penilaian' } }),
  ]);
  return {
    nilaiK: new Set(k.map((x) => x.nilai)),
    nilaiD: new Set(d.map((x) => x.nilai)),
    level,
    metode: metode?.nilai ?? 'multiplication',
  };
}

// Validasi pasangan (kemungkinan, dampak) dan hitung skor + level. Kembalikan {data} atau {error}.
function nilaiPenilaian(ctx, input, nama) {
  const kemungkinan = Number(input?.kemungkinan);
  const dampak = Number(input?.dampak);
  if (!ctx.nilaiK.has(kemungkinan)) return { error: `${nama}: nilai kemungkinan tidak ada di skala` };
  if (!ctx.nilaiD.has(dampak)) return { error: `${nama}: nilai dampak tidak ada di skala` };
  const skor = hitungSkor(kemungkinan, dampak, ctx.metode);
  const level = ctx.level.find((l) => skor >= l.skor_min && skor <= l.skor_maks);
  if (!level) return { error: `${nama}: skor ${skor} tidak masuk rentang level risiko manapun` };
  return { data: { kemungkinan, dampak, skor, level_id: level.id } };
}

module.exports = { hitungSkor, konteksPenilaian, nilaiPenilaian, MATRIKS_KOORDINAT };
