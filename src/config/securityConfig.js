/**
 * Konfigurasi keamanan frontend.
 * Functions SIAP di functions/ tetapi default TIDAK aktif sampai di-deploy.
 */

export const SECURITY_CONFIG = {
  /** Set VITE_USE_SECURE_FUNCTIONS=true setelah firebase deploy --only functions */
  useSecureFunctions: import.meta.env.VITE_USE_SECURE_FUNCTIONS === 'true',
  functionsRegion: import.meta.env.VITE_FUNCTIONS_REGION || 'asia-southeast2',
  useFunctionsEmulator: import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true',
  emulatorHost: import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST || 'localhost',
  emulatorPort: Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001)
};

/** Role yang boleh mengakses halaman admin */
export const ADMIN_PAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** Role untuk executive dashboard */
export const EXECUTIVE_PAGE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'RISK_MANAGER'];
