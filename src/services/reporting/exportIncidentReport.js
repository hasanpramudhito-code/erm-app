export const exportIncidentReportPDF = async ({ incidents }) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  autoTable(doc, {
    head: [[
      'No',
      'Tanggal',
      'Jenis Insiden',
      'Deskripsi',
      'Dampak',
      'Tindak Lanjut'
    ]],
    body: incidents.map((i, idx) => [
      idx + 1,
      i.date,
      i.type,
      i.description,
      i.impact,
      i.followUp,
    ]),
    styles: { fontSize: 8 },
  });

  doc.save('Incident_Report.pdf');
};
