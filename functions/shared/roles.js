/**
 * Definisi role terpusat — sinkron dengan src/config/roles.js
 */

const VALID_ROLES = [
  'STAFF',
  'RISK_OWNER',
  'RISK_MANAGER',
  'DIRECTOR',
  'COMPLIANCE_OFFICER',
  'ADMIN',
  'SUPER_ADMIN'
];

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const USER_MANAGER_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** Role yang boleh ditetapkan admin biasa (bukan SUPER_ADMIN) */
const ASSIGNABLE_BY_ADMIN = [
  'STAFF',
  'RISK_OWNER',
  'RISK_MANAGER',
  'DIRECTOR',
  'COMPLIANCE_OFFICER',
  'ADMIN'
];

/** Hanya SUPER_ADMIN yang boleh menetapkan SUPER_ADMIN */
const ASSIGNABLE_BY_SUPER_ADMIN = [...VALID_ROLES];

function isValidRole(role) {
  return typeof role === 'string' && VALID_ROLES.includes(role);
}

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function canAssignRole(callerRole, targetRole) {
  if (!isValidRole(targetRole)) return false;
  if (callerRole === 'SUPER_ADMIN') {
    return ASSIGNABLE_BY_SUPER_ADMIN.includes(targetRole);
  }
  if (callerRole === 'ADMIN') {
    return ASSIGNABLE_BY_ADMIN.includes(targetRole);
  }
  return false;
}

function buildCustomClaims(role) {
  const claims = {
    role,
    updatedAt: Date.now()
  };

  VALID_ROLES.forEach((r) => {
    claims[r.toLowerCase()] = r === role;
  });

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    claims.admin = true;
  }

  return claims;
}

module.exports = {
  VALID_ROLES,
  ADMIN_ROLES,
  USER_MANAGER_ROLES,
  ASSIGNABLE_BY_ADMIN,
  isValidRole,
  isAdminRole,
  canAssignRole,
  buildCustomClaims
};
