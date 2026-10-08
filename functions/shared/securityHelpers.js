const functions = require('firebase-functions');
const {
  isAdminRole,
  isValidRole,
  canAssignRole,
  buildCustomClaims,
  VALID_ROLES
} = require('./roles');

function requireAuth(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  return context.auth;
}

function getCallerRole(context) {
  return context.auth?.token?.role || null;
}

function requireAdmin(context) {
  const auth = requireAuth(context);
  const role = getCallerRole(context);

  if (!isAdminRole(role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can perform this action'
    );
  }

  return auth;
}

async function getCallerFirestoreRole(admin, uid) {
  const doc = await admin.firestore().collection('users').doc(uid).get();
  return doc.exists ? doc.data().role : null;
}

async function requireUserManager(context, admin) {
  const auth = requireAuth(context);
  const tokenRole = getCallerRole(context);
  const firestoreRole = await getCallerFirestoreRole(admin, auth.uid);
  const effectiveRole = tokenRole || firestoreRole;

  if (!['ADMIN', 'SUPER_ADMIN'].includes(effectiveRole)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can manage users'
    );
  }

  return { auth, role: effectiveRole };
}

async function requireSuperAdmin(context, admin) {
  const auth = requireAuth(context);
  const firestoreRole = await getCallerFirestoreRole(admin, auth.uid);

  if (firestoreRole !== 'SUPER_ADMIN' && getCallerRole(context) !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super admins can perform this action'
    );
  }

  return auth;
}

function validateUid(uid) {
  if (!uid || typeof uid !== 'string' || uid.length < 20) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid UID format'
    );
  }
}

function validateRole(role, callerRole) {
  if (!isValidRole(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
    );
  }

  if (!canAssignRole(callerRole, role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      `You are not allowed to assign role: ${role}`
    );
  }
}

async function syncRoleClaims(admin, uid, role) {
  await admin.auth().setCustomUserClaims(uid, buildCustomClaims(role));
}

async function writeAuditLog(admin, payload) {
  try {
    await admin.firestore().collection('audit_logs').add({
      ...payload,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireUserManager,
  requireSuperAdmin,
  getCallerRole,
  validateUid,
  validateRole,
  syncRoleClaims,
  writeAuditLog,
  buildCustomClaims
};
