import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
} from 'docx';


import { buildFileName } from '../../utils/reporting/fileUtils';

/* ======================
   SHARED ROW BUILDER
====================== */
const buildRows = (risks) =>
  risks.map((r, i) => ({
    No: i + 1,
    Kode_Risiko: r.riskCode || '-',
    Nama_Risiko: r.riskDescription|| '-',
    Rencana_Mitigasi: r.treatmentPlan || '-',
    PIC: r.responsiblePerson || '-',
    Target: r.treatmentTargetDate || '-',
    Status: r.treatmentStatus || '-',
  }));

  export const exportTreatmentProgressPDF = async ({ risks }) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  autoTable(doc, {
    head: [[
      'Kode Risiko',
      'Nama Risiko',
      'Rencana',
      'PIC',
      'Target',
      'Status'
    ]],
    body: risks.map(r => [
      r.riskCode,
      r.riskDescription,
      r.treatmentPlan,
      r.responsiblePerson,
      r.treatmentTargetDate,
      r.treatmentStatus,
    ]),
  });

  doc.save('Treatment_Progress.pdf');
};

/* ======================
   EXCEL (.xlsx)
====================== */
export const exportTreatmentProgressExcel = ({ risks }) => {
  const ws = XLSX.utils.json_to_sheet(buildRows(risks));
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, 'Treatment Progress');
  XLSX.writeFile(wb, buildFileName('Treatment_Progress', 'xlsx'));
};

/* ======================
   WORD (.docx)
====================== */
export const exportTreatmentProgressWord = async ({ risks }) => {
  const rows = buildRows(risks);

  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
  } = docx;

  const table = new Table({
    rows: [
      new TableRow({
        children: Object.keys(rows[0]).map(
          (h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: Object.values(r).map(
              (v) =>
                new TableCell({
                  children: [new Paragraph(String(v))],
                })
            ),
          })
      ),
    ],
  });

  const doc = new Document({
    sections: [{ children: [table] }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Treatment_Progress.docx');
};
