import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchRisks } from '../riskService';

const risks = await fetchRisks();


/**
 * Helper: Ambil nama risiko dari berbagai kemungkinan field
 */
const getRiskName = (risk) =>
  risk.riskName ||
  risk.riskEvent ||
  risk.name ||
  risk.title ||
  risk.riskDescription ||
  'Risiko tidak terdefinisi';

/**
 * Validasi assessment config
 * WAJIB berasal dari AssessmentConfigContext
 */
const resolveAssessment = (assessment) => {
  if (
    assessment &&
    typeof assessment.calculateScore === 'function' &&
    typeof assessment.calculateRiskLevel === 'function'
  ) {
    return assessment;
  }

  throw new Error(
    'AssessmentConfig tidak tersedia. Pastikan calculateScore dan calculateRiskLevel dikirim ke export.'
  );
};

/**
 * Bangun laporan eksekutif berbasis assessment config
 */
const buildExecutiveReport = (risks = [], treatmentPlans = [], assessment) => {
  const validAssessment = resolveAssessment(assessment);

  const scoredRisks = risks.map((risk) => {
    const likelihood =
      risk.residualLikelihood ??
      risk.residualProbability ??
      risk.likelihood ??
      0;

    const impact =
      risk.residualImpact ??
      risk.impact ??
      0;

    const score = validAssessment.calculateScore(likelihood, impact);
    const { level } = validAssessment.calculateRiskLevel(score);

    return {
      ...risk,
      riskName: getRiskName(risk),
      likelihood,
      impact,
      score,
      level,
      mitigationStatus: getMitigationStatus(risk, treatmentPlans)
    };
  });

  const totalRisks = scoredRisks.length;

  const averageScore =
    scoredRisks.reduce((sum, r) => sum + r.score, 0) /
    (totalRisks || 1);

  const { level: overallRiskLevel } =
    validAssessment.calculateRiskLevel(averageScore);

  const topRisks = [...scoredRisks]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    totalRisks,
    averageScore,
    overallRiskLevel,
    topRisks
  };
};
/**
 * Ambil status mitigasi berdasarkan treatment_plans
 * Cocokkan riskId secara fleksibel
 */
const getMitigationStatus = (risk, treatmentPlans = []) => {
  const riskId =
    risk?.id ||
    risk?.docId ||
    risk?.uid ||
    risk?.riskId;

  if (!riskId) return 'Risiko tidak valid';

  const plans = treatmentPlans.filter(
    p => p.riskId === riskId
  );

  if (!plans.length) return 'Belum ada rencana mitigasi';

  const latest = plans
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

  const progress = latest.progress ?? 0;

  const statusMap = {
    planned: 'Direncanakan',
    in_progress: 'Dalam Proses',
    completed: 'Selesai',
    delayed: 'Tertunda'
  };

  return `${statusMap[latest.status] || latest.status} (${progress}%)`;
};



/**
 * Narasi Ringkasan Eksekutif (LAYAK DIREKSI)
 */
const buildExecutiveNarrative = (report) => `
Ringkasan Eksekutif Manajemen Risiko ini disusun untuk memberikan gambaran umum
mengenai profil risiko organisasi kepada Manajemen dan Direksi sebagai dasar
pengambilan keputusan strategis.

Berdasarkan hasil penilaian risiko yang dilakukan, organisasi telah
mengidentifikasi sebanyak ${report.totalRisks} risiko utama. Secara keseluruhan,
tingkat risiko organisasi berada pada level "${report.overallRiskLevel}", yang
mencerminkan eksposur risiko aktual setelah mempertimbangkan efektivitas
pengendalian yang ada.

Risiko-risiko prioritas utama memerlukan perhatian Manajemen melalui penguatan
strategi mitigasi, peningkatan pengendalian internal, serta pemantauan risiko
secara berkelanjutan guna memastikan pencapaian tujuan organisasi tetap terjaga.
`;

const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageSize = doc.internal.pageSize;
  const pageHeight = pageSize.height || pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(150);

  doc.text(
    `Ringkasan Eksekutif Manajemen Risiko`,
    14,
    pageHeight - 10
  );

  doc.text(
    `Halaman ${pageCount}`,
    pageSize.width - 40,
    pageHeight - 10
  );
};

/**
 * EXPORT PDF – EXECUTIVE SUMMARY
 */
export const exportExecutiveSummaryPDF = async (payload = {}) => {
  const {
    risks = [],
    treatmentPlans = [],
    assessment,
    userData,
  } = payload;



  const report = buildExecutiveReport(
    risks,
    treatmentPlans,
    assessment
  );
  const narrative = buildExecutiveNarrative(report);

  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(14);
  doc.text('RINGKASAN EKSEKUTIF MANAJEMEN RISIKO', 14, y);
  y += 10;

  doc.setFontSize(10);
  const narrativeLines = doc.splitTextToSize(narrative, 180);
  doc.text(narrativeLines, 14, y);
  y += narrativeLines.length * 5 + 5;

  doc.setFontSize(11);
  doc.text('Ikhtisar Risiko:', 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.text(`• Total Risiko Teridentifikasi : ${report.totalRisks}`, 18, y);
  y += 5;
  doc.text(`• Tingkat Risiko Organisasi     : ${report.overallRiskLevel}`, 18, y);
  y += 5;

  y += 5;
  doc.setFontSize(11);
  doc.text('Risiko Prioritas Utama:', 14, y);
  y += 6;

autoTable(doc, {
  startY: y,
  head: [[
    'No',
    'Deskripsi Risiko',
    'Likelihood',
    'Impact',
    'Skor',
    'Level Risiko',
    'Status Mitigasi'
  ]],
body: report.topRisks.map((risk, index) => [
  index + 1,
  risk.riskName,
  risk.likelihood,
  risk.impact,
  risk.score,
  risk.level,
  risk.mitigationStatus
]),

  styles: {
    fontSize: 9,
    cellPadding: 3,
    valign: 'top'
  },
  headStyles: {
    fillColor: [0, 102, 153],
    textColor: 255,
    halign: 'center'
  },
  columnStyles: {
    0: { halign: 'center', cellWidth: 10 },
    2: { halign: 'center', cellWidth: 20 },
    3: { halign: 'center', cellWidth: 18 },
    4: { halign: 'center', cellWidth: 15 },
    5: { halign: 'center', cellWidth: 26 },
    6: { halign: 'center', cellWidth: 30 }
  },

  // ⬇️ PENTING UNTUK FOOTER
  didDrawPage: (data) => {
    addFooter(doc);
  }
});


  addFooter(doc);

  doc.save('Executive_Summary_Manajemen_Risiko.pdf');
};
