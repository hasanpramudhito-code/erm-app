import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../config/firebase';
import { SECURITY_CONFIG } from '../config/securityConfig';

let functionsInstance = null;

function getFunctionsInstance() {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, SECURITY_CONFIG.functionsRegion);

    if (SECURITY_CONFIG.useFunctionsEmulator) {
      connectFunctionsEmulator(
        functionsInstance,
        SECURITY_CONFIG.emulatorHost,
        SECURITY_CONFIG.emulatorPort
      );
    }
  }

  return functionsInstance;
}

function callFunction(name, data) {
  if (!SECURITY_CONFIG.useSecureFunctions) {
    return Promise.reject(
      new Error(
        'Secure functions belum aktif. Set REACT_APP_USE_SECURE_FUNCTIONS=true setelah deploy functions.'
      )
    );
  }

  const callable = httpsCallable(getFunctionsInstance(), name);
  return callable(data).then((result) => result.data);
}

export const isSecureUserManagementEnabled = () => SECURITY_CONFIG.useSecureFunctions;

export const createUserSecure = (payload) => callFunction('createUserWithRole', payload);

export const updateUserRoleSecure = (uid, role) =>
  callFunction('updateUserRole', { uid, role });

export const updateUserSecure = (payload) => callFunction('updateUserSecure', payload);

export const deactivateUserSecure = (uid) => callFunction('deactivateUser', { uid });

export const deleteUserSecure = (uid) => callFunction('deleteUser', { uid });

export const refreshMyClaimsSecure = () => callFunction('refreshMyClaims', {});

export const getAuditLogsSecure = (params = {}) => callFunction('getAuditLogs', params);
