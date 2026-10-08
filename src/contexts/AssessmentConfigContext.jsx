import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const AssessmentConfigContext = createContext();

export const useAssessmentConfig = () => useContext(AssessmentConfigContext);

// Ubah respons /konfigurasi-penilaian ke bentuk lama yang dipakai halaman-halaman eksisting.
const keBentukLama = (k) => {
  const dampakPerNilai = new Map();
  for (const d of k.dampak) if (!dampakPerNilai.has(d.nilai)) dampakPerNilai.set(d.nilai, d.label);
  return {
    assessmentMethod: k.metode_penilaian,
    toleranceThreshold: k.ambang_toleransi,
    likelihoodOptions: k.kemungkinan.map((x) => ({ id: x.id, value: x.nilai, label: `${x.nilai} - ${x.label}`, rawLabel: x.label })),
    impactOptions: [...dampakPerNilai].map(([value, label]) => ({ value, label: `${value} - ${label}`, rawLabel: label })),
    riskLevels: k.level.map((l) => ({ id: l.id, label: l.nama, min: l.skor_min, max: l.skor_maks, color: l.warna })),
    impactCriteria: k.dampak,
  };
};

export const AssessmentConfigProvider = ({ children }) => {
  const { isInitialized, currentUser } = useAuth();
  const [assessmentConfig, setAssessmentConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setAssessmentConfig(keBentukLama(await api.get('/konfigurasi-penilaian')));
    } catch (e) {
      console.error('Gagal memuat konfigurasi penilaian', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!currentUser) {
      setAssessmentConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    reload();
  }, [isInitialized, currentUser?.id, reload]);

  // Helper functions dengan fallback yang aman
  const getRatingOptions = (type = 'likelihood') => {
    if (!assessmentConfig) return [1, 2, 3, 4, 5];

    if (type === 'likelihood') {
      return assessmentConfig.likelihoodOptions?.map(opt => opt.value) || [1, 2, 3, 4, 5];
    } else {
      return assessmentConfig.impactOptions?.map(opt => opt.value) || [1, 2, 3, 4, 5];
    }
  };

  const getRatingLabel = (value, type = 'likelihood') => {
    const options = type === 'likelihood' ? assessmentConfig?.likelihoodOptions : assessmentConfig?.impactOptions;
    return options?.find(opt => opt.value === value)?.label || `${value}`;
  };

  const getRiskLevelOptions = () =>
    (assessmentConfig?.riskLevels || []).map(level => ({
      value: level.label.toLowerCase().replace(/ /g, '_'),
      label: level.label,
      min: level.min,
      max: level.max,
      color: level.color
    }));

  const getRiskLevelColor = (levelLabel) =>
    assessmentConfig?.riskLevels?.find(l => l.label === levelLabel)?.color || 'default';

  const getRiskLevelLabel = (levelValue) => {
    const level = getRiskLevelOptions().find(opt => opt.value === levelValue);
    return level?.label || levelValue;
  };

  const calculateScore = (likelihood, impact) => {
    if (!assessmentConfig) return likelihood * impact;

    if (assessmentConfig.assessmentMethod === 'coordinate') {
      // Matriks koordinat 5x5
      const matrix = [
        [1, 3, 5, 8, 20],
        [2, 7, 11, 13, 21],
        [4, 10, 14, 17, 22],
        [6, 12, 16, 19, 24],
        [9, 15, 18, 23, 25]
      ];

      const lIndex = Math.min(Math.max(likelihood - 1, 0), 4);
      const iIndex = Math.min(Math.max(impact - 1, 0), 4);
      return matrix[lIndex][iIndex];
    }

    return likelihood * impact;
  };

  const calculateRiskLevel = (score) => {
    const options = getRiskLevelOptions();
    const riskLevel = options.find(level =>
      score >= level.min && score <= level.max
    ) || options[0] || { label: '-', color: 'default' };

    return {
      score,
      level: riskLevel.label,
      color: riskLevel.color
    };
  };

  const value = {
    assessmentConfig,
    loading,
    getRatingOptions,
    getRatingLabel,
    getRiskLevelOptions,
    getRiskLevelColor,
    getRiskLevelLabel,
    calculateScore,
    calculateRiskLevel,
    // Dipertahankan untuk kompatibilitas: kini memuat ulang dari server.
    updateConfig: reload,
    refreshConfig: reload,
    updateToleranceThreshold: async (newThreshold) => {
      try {
        await api.put('/pengaturan/ambang_toleransi', { nilai: parseInt(newThreshold) });
        await reload();
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  return (
    <AssessmentConfigContext.Provider value={value}>
      {children}
    </AssessmentConfigContext.Provider>
  );
};
