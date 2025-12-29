// src/services/reporting/exportRiskRegister.js
import { saveAs } from 'file-saver';
import { fmtRp } from '../../utils/reporting/numberUtils';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Cache untuk data referensi dari risk_parameters
let referenceDataCache = null;

/**
 * Fetch data referensi dari Firestore (risk_parameters collection)
 */
const fetchReferenceData = async () => {
  if (referenceDataCache) {
    return referenceDataCache;
  }

  try {
    console.log('📥 Fetching reference data from risk_parameters...');
    
    const paramsSnapshot = await getDocs(collection(db, 'risk_parameters'));
    
    const riskTypesMap = {};
    const departmentsMap = {};

    paramsSnapshot.forEach(doc => {
      const data = doc.data();
      const type = data.type;

      if (type === 'risk_type') {
        riskTypesMap[doc.id] = data.name || data.nama || data.label || doc.id;
        if (data.code) {
          riskTypesMap[data.code] = data.name || data.nama || data.label || doc.id;
        }
      } else if (type === 'organization_unit') {
        departmentsMap[doc.id] = data.name || data.nama || data.label || doc.id;
        if (data.code) {
          departmentsMap[data.code] = data.name || data.nama || data.label || doc.id;
        }
      }
    });

    console.log('📊 Reference data loaded from risk_parameters:', {
      riskTypesCount: Object.keys(riskTypesMap).length,
      departmentsCount: Object.keys(departmentsMap).length
    });

    referenceDataCache = { departmentsMap, riskTypesMap };
    return referenceDataCache;

  } catch (error) {
    console.error('❌ Error fetching reference data:', error);
    return { departmentsMap: {}, riskTypesMap: {} };
  }
};

/**
 * Clear cache
 */
export const clearReferenceCache = () => {
  referenceDataCache = null;
};

/**
 * Fungsi helper untuk mendapatkan label dengan fallback
 */
const getLabelFromMap = (value, map, fieldName = '') => {
  if (!value) return '-';
  
  const label = map[value];
  
  if (label) {
    return label;
  }
  
  console.warn(`⚠️ ${fieldName} not found in map: "${value}"`);
  return value || '-';
};

/**
 * Matrix koordinat 5x5 untuk metode coordinate
 */
const COORDINATE_MATRIX = [
  [1, 3, 5, 8, 20],
  [2, 7, 11, 13, 21],
  [4, 10, 14, 17, 22],
  [6, 12, 16, 19, 24],
  [9, 15, 18, 23, 25]
];

/**
 * Fungsi untuk mendapatkan skor dari matrix koordinat
 */
const getMatrixScore = (likelihood, impact) => {
  const likelihoodNum = parseInt(likelihood);
  const impactNum = parseInt(impact);
  
  if (isNaN(likelihoodNum) || isNaN(impactNum)) return null;
  if (likelihoodNum < 1 || likelihoodNum > 5 || impactNum < 1 || impactNum > 5) return null;
  
  const row = likelihoodNum - 1;
  const col = impactNum - 1;
  
  return COORDINATE_MATRIX[row][col];
};

/**
 * Fungsi untuk mendapatkan kategori berdasarkan skor dan assessmentConfig
 */
const getCategoryFromScore = (score, assessmentConfig) => {
  console.log('🔍 getCategoryFromScore called:', {
    score,
    configExists: !!assessmentConfig,
    riskLevels: assessmentConfig?.riskLevels,
    riskLevelsLength: assessmentConfig?.riskLevels?.length
  });

  if (!score || score === '-') return '-';
  
  const scoreNum = typeof score === 'number' ? score : parseInt(score);
  if (isNaN(scoreNum)) return '-';

  if (!assessmentConfig || !assessmentConfig.riskLevels || !Array.isArray(assessmentConfig.riskLevels)) {
    console.warn('⚠️ No valid assessment config, using default categories');
    // Default fallback berdasarkan config Firestore
    if (scoreNum >= 20 && scoreNum <= 25) return 'Sangat Tinggi';
    if (scoreNum >= 15 && scoreNum <= 19) return 'Tinggi';
    if (scoreNum >= 10 && scoreNum <= 14) return 'Sedang';
    if (scoreNum >= 5 && scoreNum <= 9) return 'Rendah';
    if (scoreNum >= 1 && scoreNum <= 4) return 'Sangat Rendah';
    return '-';
  }

  const sortedLevels = [...assessmentConfig.riskLevels].sort((a, b) => a.min - b.min);
  
  console.log('📊 Sorted risk levels:', sortedLevels);
  
  for (const level of sortedLevels) {
    if (scoreNum >= level.min && scoreNum <= level.max) {
      console.log(`✅ Score ${scoreNum} → ${level.label} (${level.min}-${level.max})`);
      return level.label;
    }
  }

  const lastLevel = sortedLevels[sortedLevels.length - 1];
  console.warn(`⚠️ Score ${scoreNum} not in any range (${sortedLevels.map(l => `${l.min}-${l.max}`).join(', ')}), using last level: ${lastLevel.label}`);
  return lastLevel.label;
};

/**
 * Fungsi untuk menghitung skor berdasarkan metode
 */
const calculateScore = (impact, likelihood, method) => {
  const impactNum = parseInt(impact);
  const likelihoodNum = parseInt(likelihood);
  
  if (isNaN(impactNum) || isNaN(likelihoodNum)) return null;
  
  if (method === 'coordinate') {
    return getMatrixScore(likelihoodNum, impactNum);
  } else {
    // Metode multiplication
    return impactNum * likelihoodNum;
  }
};

/**
 * Fungsi untuk mendapatkan display score dengan format yang benar
 */
const getScoreDisplay = (impact, likelihood, method, assessmentConfig) => {
  console.log('🔢 getScoreDisplay START:', {
    impact,
    likelihood,
    method, // ← INI HARUS DARI CONFIG
    assessmentConfig
  });

  if (!impact || !likelihood) return '-';
  
  const impactNum = parseInt(impact);
  const likelihoodNum = parseInt(likelihood);
  
  if (isNaN(impactNum) || isNaN(likelihoodNum)) return '-';
  
  // TENTUKAN METODE - PRIORITAS: method parameter → assessmentConfig → default
  const effectiveMethod = method || assessmentConfig?.assessmentMethod || 'multiplication';
  
  console.log('🔢 Effective method for calculation:', effectiveMethod);
  
  // HITUNG SKOR BERDASARKAN METODE
  const score = calculateScore(impactNum, likelihoodNum, effectiveMethod);
  
  if (score === null || score === undefined) return '-';
  
  // DAPATKAN KATEGORI
  const categoryLabel = getCategoryFromScore(score, assessmentConfig);
  
  console.log('📊 Final calculation:', {
    impact: impactNum,
    likelihood: likelihoodNum,
    method: effectiveMethod,
    score,
    categoryLabel
  });
  
  return `${score} (${categoryLabel})`;
};

/**
 * EXPORT RISK REGISTER - PDF
 */
export const exportRiskRegisterPDF = async ({
  risks,
  treatmentPlans = [],
  reportConfig,
  userData,
  assessmentConfig,
}) => {
  console.log('📄 PDF Export START - assessmentConfig:', assessmentConfig);
  console.log('📄 PDF Export - assessmentMethod:', assessmentConfig?.assessmentMethod);
  
  if (!assessmentConfig) {
    console.error('❌ CRITICAL: assessmentConfig is undefined in PDF export!');
    throw new Error('Assessment configuration is required for export');
  }
  
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const { departmentsMap, riskTypesMap } = await fetchReferenceData();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  const headerH = 60;

  const nowStr = new Date().toLocaleString('id-ID');
  
  // AMBIL METODE DARI ASSESSMENT CONFIG
  const method = assessmentConfig?.assessmentMethod || 'multiplication';
  console.log('🎯 Export Method from config:', method);
  
  const isCoordinate = method === 'coordinate';

  /* ================= HEADER ================= */
  doc.setFillColor(96, 125, 139);
  doc.rect(0, 0, pageW, headerH, 'F');

  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RISK REGISTER', pageW / 2, 30, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PT Odira Energy Karang Agung', pageW / 2, 46, { align: 'center' });

  doc.setTextColor(0);
  doc.setFontSize(7);
  doc.text(`Generated: ${nowStr}`, margin, headerH + 12);
  doc.text(`Period: ${reportConfig.dateRange}`, margin + 160, headerH + 12);
  doc.text(
    `By: ${userData?.name || userData?.displayName || 'Administrator'}`,
    margin + 320,
    headerH + 12
  );
  
  // TAMPILKAN METODE YANG DIGUNAKAN
  doc.text(
    `Method: ${isCoordinate ? 'Coordinate Matrix' : 'Multiplication'}`,
    pageW - margin - 100,
    headerH + 12
  );

  /* ================= TABLE HEADER ================= */
  const head = [
    [
      { content: 'No', rowSpan: 2 },
      { content: 'Kode Risiko', rowSpan: 2 },
      { content: 'Sumber Risiko', rowSpan: 2 },
      { content: 'Jenis Risiko', rowSpan: 2 },
      { content: 'Departemen', rowSpan: 2 },
      { content: 'Nama Risiko', rowSpan: 2 },
      { content: 'Deskripsi', rowSpan: 2 },
      { content: 'Penyebab', rowSpan: 2 },
      { content: 'Dampak', rowSpan: 2 },
      { content: 'Inheren', colSpan: 4 },
      { content: 'Residual', colSpan: 3 },
      { content: 'Pengendalian Tambahan', rowSpan: 2 },
      { content: 'Biaya Pengendalian', rowSpan: 2 },
      { content: 'Pemilik Risiko', rowSpan: 2 },
      { content: 'PIC', rowSpan: 2 },
    ],
    [
      'Likelihood',
      'Impact',
      'Skor Risiko', // SELALU "Skor Risiko" karena keduanya menghasilkan skor
      'Nilai Dampak (Rp)',
      'Likelihood',
      'Impact',
      'Skor Risiko', // SELALU "Skor Risiko"
    ],
  ];

  /* ================= TABLE BODY ================= */
  console.log(`🔍 Processing ${risks.length} risks for PDF export with method: ${method}`);
  
  const body = risks.map((r, i) => {
    const departmentLabel = getLabelFromMap(r.department, departmentsMap, 'Department');
    const riskTypeLabel = getLabelFromMap(r.riskType, riskTypesMap, 'Risk Type');

    // HITUNG SKOR DENGAN METHOD DARI CONFIG
    const inherentScoreDisplay = getScoreDisplay(
      r.initialImpact, 
      r.initialProbability, 
      method, // ← PASS METHOD KE FUNGSI
      assessmentConfig
    );
    
    const residualScoreDisplay = getScoreDisplay(
      r.residualImpact, 
      r.residualProbability, 
      method, // ← PASS METHOD KE FUNGSI
      assessmentConfig
    );

    console.log(`Risk ${i + 1}:`, {
      inherent: `L${r.initialProbability}×I${r.initialImpact} = ${inherentScoreDisplay}`,
      residual: `L${r.residualProbability}×I${r.residualImpact} = ${residualScoreDisplay}`
    });

    return [
      i + 1,
      r.riskCode || '-',
      r.riskSource || '-',
      riskTypeLabel,
      departmentLabel,
      r.title || r.riskDescription || '-',
      r.riskDescription || '-',
      r.cause || '-',
      r.impactText || '-',
      r.initialProbability ?? '',
      r.initialImpact ?? '',
      inherentScoreDisplay,
      fmtRp(r.inherentRiskQuantification),
      r.residualProbability ?? '',
      r.residualImpact ?? '',
      residualScoreDisplay,
      r.additionalControls || '-',
      fmtRp(r.controlCost),
      r.riskOwner || '-',
      r.responsiblePerson || '-',
    ];
  });

  /* ================= TABLE ================= */
  autoTable(doc, {
    startY: headerH + 24,
    head,
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fontStyle: 'bold',
      fillColor: [245, 247, 250],
      textColor: 33,
      halign: 'center',
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFontSize(6);
      doc.setTextColor(120);
      doc.text(
        `Halaman ${doc.getCurrentPageInfo().pageNumber}`,
        pageW / 2,
        pageH - 12,
        { align: 'center' }
      );
    },
  });

  doc.save(`Risk_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ======== EXPORT: RISK REGISTER – XLSX ========
export const exportRiskRegisterXLSX = async ({
  risks,
  userData,
  assessmentConfig,
}) => {
  console.log('📊 XLSX Export START - assessmentConfig:', assessmentConfig);
  console.log('📊 XLSX Export - assessmentMethod:', assessmentConfig?.assessmentMethod);
  
  if (!assessmentConfig) {
    console.error('❌ CRITICAL: assessmentConfig is undefined in XLSX export!');
    throw new Error('Assessment configuration is required for export');
  }

  const ExcelJS = (await import('exceljs')).default;

  const { departmentsMap, riskTypesMap } = await fetchReferenceData();

  const wb = new ExcelJS.Workbook();
  wb.creator = userData?.name || 'ERM System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Risk Register', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
  });

  // AMBIL METODE DARI CONFIG
  const method = assessmentConfig?.assessmentMethod || 'multiplication';
  console.log('🎯 XLSX Export Method from config:', method);
  
  const isCoordinate = method === 'coordinate';

  // Title
  ws.mergeCells('D1', 'U1');
  const tCell = ws.getCell('D1');
  tCell.value = 'RISK REGISTER';
  tCell.font = { name: 'Calibri', size: 16, bold: true };
  tCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  ws.mergeCells('D2', 'U2');
  const methodInfo = isCoordinate ? 'Coordinate Matrix' : 'Multiplication';
  ws.getCell('D2').value = `PT Odira Energy Karang Agung • Generated: ${new Date().toLocaleString('id-ID')} • Method: ${methodInfo}`;
  ws.getCell('D2').alignment = { horizontal: 'center' };
  ws.getRow(2).height = 18;

  // Grup header baris 3
  ws.mergeCells('J3', 'M3');
  ws.getCell('J3').value = 'Inheren';
  ws.getCell('J3').font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell('J3').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('N3', 'P3');
  ws.getCell('N3').value = 'Residual';
  ws.getCell('N3').font = { name: 'Calibri', size: 11, bold: true };
  ws.getCell('N3').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  // Header rinci - SELALU "Skor Risiko"
  const columns = [
    { key: 'no', header: 'No', width: 6 },
    { key: 'riskCode', header: 'Kode Risiko', width: 12 },
    { key: 'riskSource', header: 'Sumber Risiko', width: 14 },
    { key: 'riskType', header: 'Jenis Risiko', width: 14 },
    { key: 'department', header: 'Departemen', width: 14 },
    { key: 'title', header: 'Nama Risiko', width: 24 },
    { key: 'riskDescription', header: 'Deskripsi', width: 56, wrap: true },
    { key: 'cause', header: 'Penyebab', width: 40, wrap: true },
    { key: 'impactText', header: 'Dampak', width: 40, wrap: true },
    { key: 'initialProbability', header: 'Likelihood', width: 12 },
    { key: 'initialImpact', header: 'Impact', width: 12 },
    { key: 'inherentScore', header: 'Skor Risiko', width: 12 }, // SELALU "Skor Risiko"
    { key: 'inherentRiskQuantification', header: 'Nilai Dampak (Rp)', width: 20 },
    { key: 'residualProbability', header: 'Likelihood', width: 12 },
    { key: 'residualImpact', header: 'Impact', width: 12 },
    { key: 'residualScore', header: 'Skor Risiko', width: 12 }, // SELALU "Skor Risiko"
    { key: 'additionalControls', header: 'Pengendalian Tambahan', width: 40, wrap: true },
    { key: 'controlCost', header: 'Biaya Pengendalian', width: 18 },
    { key: 'riskOwner', header: 'Pemilik Risiko', width: 18 },
    { key: 'responsiblePerson', header: 'PIC', width: 16 },
  ];

  ws.columns = columns.map(c => ({
    key: c.key, 
    width: c.width,
    style: { 
      font: { name: 'Calibri', size: 9 }, 
      alignment: { 
        vertical: 'top', 
        wrapText: !!c.wrap 
      } 
    }
  }));

  const headerRow = ws.getRow(4);
  headerRow.values = columns.map(c => c.header);
  headerRow.font = { name: 'Calibri', size: 10, bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;

  // Rows dengan logging
  console.log(`🔍 Creating Excel rows with method: ${method}`);
  let iRow = 5;
  
  risks.forEach((r, i) => {
    const departmentLabel = getLabelFromMap(r.department, departmentsMap, 'Department');
    const riskTypeLabel = getLabelFromMap(r.riskType, riskTypesMap, 'Risk Type');

    // HITUNG SKOR DENGAN METHOD DARI CONFIG
    const inherentScoreDisplay = getScoreDisplay(
      r.initialImpact, 
      r.initialProbability, 
      method, // ← PASS METHOD
      assessmentConfig
    );
    
    const residualScoreDisplay = getScoreDisplay(
      r.residualImpact, 
      r.residualProbability, 
      method, // ← PASS METHOD
      assessmentConfig
    );

    console.log(`Row ${i + 1} scores:`, {
      method,
      inherent: inherentScoreDisplay,
      residual: residualScoreDisplay
    });

    ws.addRow({
      no: i + 1,
      riskCode: r.riskCode || '-',
      riskSource: r.riskSource || '-',
      riskType: riskTypeLabel,
      department: departmentLabel,
      title: r.title || r.riskDescription || '-',
      riskDescription: r.riskDescription || '-',
      cause: r.cause || '-',
      impactText: r.impactText || '-',
      initialProbability: r.initialProbability || '',
      initialImpact: r.initialImpact || '',
      inherentScore: inherentScoreDisplay,
      inherentRiskQuantification: fmtRp(r.inherentRiskQuantification),
      residualProbability: r.residualProbability || '',
      residualImpact: r.residualImpact || '',
      residualScore: residualScoreDisplay,
      additionalControls: r.additionalControls || '-',
      controlCost: fmtRp(r.controlCost),
      riskOwner: r.riskOwner || '-',
      responsiblePerson: r.responsiblePerson || '-',
    });

    const lens = [
      String(r.riskDescription || '').length,
      String(r.cause || '').length,
      String(r.impactText || '').length,
      String(r.additionalControls || '').length,
    ];
    const longest = Math.max(...lens);
    const estLines = Math.ceil(longest / 60);
    ws.getRow(iRow).height = Math.max(22, 18 * estLines);
    iRow++;
  });

  // Tambahkan catatan tentang metode yang digunakan
  const noteRow = ws.getRow(iRow + 1);
  noteRow.getCell(1).value = 'Catatan:';
  noteRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
  
  const methodNoteRow = ws.getRow(iRow + 2);
  methodNoteRow.getCell(1).value = `Metode perhitungan: ${methodInfo}`;
  methodNoteRow.getCell(1).font = { name: 'Calibri', size: 9 };
  
  // Tampilkan informasi metode
  if (method === 'coordinate') {
    const matrixNoteRow = ws.getRow(iRow + 3);
    matrixNoteRow.getCell(1).value = 'Matrix Koordinat: L1×I1=1, L1×I2=3, L1×I3=5, L1×I4=8, L1×I5=20, dst';
    matrixNoteRow.getCell(1).font = { name: 'Calibri', size: 9 };
  } else {
    const multNoteRow = ws.getRow(iRow + 3);
    multNoteRow.getCell(1).value = 'Metode Multiplication: Skor = Impact × Likelihood';
    multNoteRow.getCell(1).font = { name: 'Calibri', size: 9 };
  }
  
  // Tampilkan risk levels dari config
  const configNoteRow = ws.getRow(iRow + 4);
  configNoteRow.getCell(1).value = 'Kategori berdasarkan assessment config:';
  configNoteRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
  
  if (assessmentConfig?.riskLevels) {
    assessmentConfig.riskLevels.forEach((level, idx) => {
      const levelRow = ws.getRow(iRow + 5 + idx);
      levelRow.getCell(1).value = `  ${level.min}-${level.max}: ${level.label}`;
      levelRow.getCell(1).font = { name: 'Calibri', size: 9 };
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `Risk_Register_${new Date().toISOString().slice(0,10)}.xlsx`);
};

export const exportRiskRegisterExcel = async (payload) => {
  return exportRiskRegisterXLSX(payload);
};

// Eksport fungsi bantuan jika diperlukan
export { getScoreDisplay, getMatrixScore, getCategoryFromScore, calculateScore };