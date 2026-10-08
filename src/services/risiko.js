// Akses data risiko lewat API + adapter ke bentuk lama (riskCode, initialProbability, ...) yang
// masih dipakai halaman RiskRegister, RiskAssessment, dan layanan ekspor.
import { useEffect, useState } from 'react';
import { api } from './api';

export const LABEL_STATUS = {
  BARU: 'Open - Baru Teridentifikasi',
  DALAM_PENILAIAN: 'In Assessment - Dalam Penilaian',
  DINILAI: 'Assessed - Telah Dinilai',
  DALAM_PENANGANAN: 'In Treatment - Dalam Penanganan',
  DIPANTAU: 'Monitored - Dalam Pemantauan',
  DITUTUP: 'Closed - Ditutup',
  DITOLAK: 'Rejected - Ditolak',
};
export const LABEL_KLASIFIKASI = {
  KRITIS: 'Critical - Prioritas Tertinggi',
  TINGGI: 'High Priority - Prioritas Tinggi',
  SEDANG: 'Medium Priority - Prioritas Menengah',
  RENDAH: 'Low Priority - Prioritas Rendah',
  PEMANTAUAN: 'Monitoring - Pemantauan Rutin',
};
export const LABEL_PRIORITAS = {
  KRITIS: 'Critical - Kritis (Penanganan Segera)',
  TINGGI: 'High - Tinggi (Penanganan < 1 Minggu)',
  SEDANG: 'Medium - Sedang (Penanganan < 1 Bulan)',
  RENDAH: 'Low - Rendah (Penanganan < 3 Bulan)',
  PEMANTAUAN: 'Monitor - Pantau Saja',
};
export const LABEL_SUMBER = { INTERNAL: 'Internal', EKSTERNAL: 'External' };
export const LABEL_PERSETUJUAN = {
  DRAF: 'Draf',
  DIAJUKAN: 'Diajukan',
  DISETUJUI_PIMPINAN: 'Disetujui Pimpinan',
  FINAL: 'Final',
  DIKEMBALIKAN: 'Dikembalikan',
};

const balik = (peta) => Object.fromEntries(Object.entries(peta).map(([k, v]) => [v, k]));
const KODE_STATUS = balik(LABEL_STATUS);
const KODE_KLASIFIKASI = balik(LABEL_KLASIFIKASI);
const KODE_PRIORITAS = balik(LABEL_PRIORITAS);
const KODE_SUMBER = balik(LABEL_SUMBER);

const angkaAtauKosong = (v) => (v === null || v === undefined ? '' : Number(v));
const baris = (teks) => String(teks || '').split('\n').map((s) => s.trim()).filter(Boolean);

// Data API -> bentuk lama.
export function keBentukLama(r) {
  const inheren = r.penilaian?.find((p) => p.jenis === 'INHEREN');
  const residual = r.pemantauan_bulanan?.[0];
  return {
    id: r.id,
    raw: r,
    riskCode: r.kode,
    riskName: r.nama,
    riskDescription: r.deskripsi || r.nama,
    riskType: r.kategori_id || '',
    riskTypeName: r.kategori?.nama || '',
    department: r.unit_id,
    departmentName: r.unit?.nama || '',
    riskOwner: r.unit?.direktorat?.nama_jabatan_direktur || '',
    classification: LABEL_KLASIFIKASI[r.klasifikasi] || '',
    riskSource: LABEL_SUMBER[r.sumber] || '',
    status: LABEL_STATUS[r.status] || r.status,
    approvalStatus: r.status_persetujuan,
    modifiedByDirectors: r.diubah_direksi,
    mainRisk: r.risiko_utama,
    cause: (r.penyebab || []).map((p) => p.uraian).join('\n'),
    causes: r.penyebab || [],
    impactText: (r.dampak || []).map((p) => p.uraian).join('\n'),
    impacts: r.dampak || [],
    responsiblePersonId: r.penanggung_jawab_id || '',
    responsiblePerson: r.penanggung_jawab?.nama || '',
    initialProbability: inheren?.kemungkinan ?? '',
    initialImpact: inheren?.dampak ?? '',
    inherentScore: inheren?.skor,
    inherentLevel: inheren?.level?.nama,
    residualProbability: residual?.kemungkinan_residual ?? '',
    residualImpact: residual?.dampak_residual ?? '',
    residualScore: residual?.skor,
    residualLevel: residual?.level?.nama,
    residualPeriod: residual ? `${residual.bulan}/${residual.tahun}` : '',
    // Alias yang dipakai heatmap & filter URL.
    likelihood: inheren?.kemungkinan,
    impact: inheren?.dampak,
    residualLikelihood: residual?.kemungkinan_residual,
    existingControls: r.kontrol_eksisting || '',
    controlEffectiveness: r.efektivitas_kontrol || '',
    additionalControls: r.kontrol_tambahan || '',
    inherentRiskQuantification: angkaAtauKosong(r.kuantifikasi_inheren),
    residualRiskQuantification: angkaAtauKosong(r.kuantifikasi_residual),
    controlCost: angkaAtauKosong(r.biaya_kontrol),
    targetCompletion: r.target_selesai ? r.target_selesai.slice(0, 10) : '',
    treatmentPriority: LABEL_PRIORITAS[r.prioritas_penanganan] || '',
    assessmentNotes: r.catatan_penilaian || '',
    createdAt: r.dibuat_pada,
    updatedAt: r.diubah_pada,
  };
}

const pasangan = (k, d) => (k && d ? { kemungkinan: Number(k), dampak: Number(d) } : undefined);

// Form bentuk lama -> body API. Field kosong dikirim null agar bisa dikosongkan.
export function keBodyApi(f) {
  return {
    kode: f.riskCode,
    nama: f.riskName || String(f.riskDescription || '').slice(0, 255),
    deskripsi: f.riskDescription,
    kategori_id: f.riskType || null,
    unit_id: f.department || null,
    sumber: KODE_SUMBER[f.riskSource] || 'INTERNAL',
    klasifikasi: KODE_KLASIFIKASI[f.classification] || null,
    status: KODE_STATUS[f.status] || 'BARU',
    penyebab: baris(f.cause).map((uraian) => ({ uraian })),
    dampak: baris(f.impactText).map((uraian) => ({ uraian })),
    penanggung_jawab_id: f.responsiblePersonId || null,
    kontrol_eksisting: f.existingControls,
    efektivitas_kontrol: f.controlEffectiveness,
    kontrol_tambahan: f.additionalControls,
    kuantifikasi_inheren: f.inherentRiskQuantification === '' ? null : f.inherentRiskQuantification,
    kuantifikasi_residual: f.residualRiskQuantification === '' ? null : f.residualRiskQuantification,
    biaya_kontrol: f.controlCost === '' ? null : f.controlCost,
    target_selesai: f.targetCompletion || null,
    prioritas_penanganan: KODE_PRIORITAS[f.treatmentPriority] || null,
    catatan_penilaian: f.assessmentNotes,
    inheren: pasangan(f.initialProbability, f.initialImpact),
    residual: pasangan(f.residualProbability, f.residualImpact),
  };
}

export const muatRisiko = async (periodeId) => (await api.get(`/risiko?periode_id=${periodeId}`)).map(keBentukLama);

const KUNCI_PERIODE = 'erm.periode_id';

// Daftar periode + periode terpilih (diingat di localStorage).
export function usePeriode() {
  const [daftar, setDaftar] = useState([]);
  const [periodeId, setPeriodeIdState] = useState(() => Number(localStorage.getItem(KUNCI_PERIODE)) || null);

  useEffect(() => {
    api.get('/periode').then((list) => {
      setDaftar(list);
      setPeriodeIdState((id) => (list.some((p) => p.id === id) ? id : (list.find((p) => p.status === 'TERBUKA') || list[0])?.id ?? null));
    }).catch(() => setDaftar([]));
  }, []);

  const setPeriodeId = (id) => {
    localStorage.setItem(KUNCI_PERIODE, String(id));
    setPeriodeIdState(id);
  };

  return { daftar, periodeId, setPeriodeId, periode: daftar.find((p) => p.id === periodeId) };
}
