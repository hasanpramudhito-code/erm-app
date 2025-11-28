// File: src/config/roles.js - TAMBAHKAN di bagian yang sudah ada

export const ROLES = {
  STAFF: {
    name: 'Staff',
    permissions: [
      'view_risks', 
      'submit_risks', 
      'view_own_data',
      'view_dashboard'
    ],
    approval_level: 0,
    can_approve: [],
    can_assess: false
  },
  
  RISK_OWNER: {
    name: 'Risk Owner', 
    permissions: [
      'view_risks',
      'submit_risks',
      'assess_risks', 
      'review_risks',
      'view_reports',
      'manage_own_risks',
      'approve_low_risks'  // ✅ TAMBAHKAN
    ],
    approval_level: 1,
    can_approve: ['LOW'],
    can_assess: true
  },
  
  RISK_MANAGER: {
    name: 'Risk Manager',
    permissions: [
      'view_all',
      'approve_risks',
      'manage_kris',
      'review_high_risks',
      'view_executive_dashboard',
      'manage_treatment_plans',
      'approve_medium_risks',  // ✅ TAMBAHKAN
      'final_approval'         // ✅ TAMBAHKAN
    ],
    approval_level: 2,
    can_approve: ['LOW', 'MEDIUM'],
    can_assess: true
  },
  
  DIRECTOR: {
    name: 'Director',
    permissions: [
      'full_access',
      'final_approval', 
      'executive_reports',
      'system_override',
      'approve_critical_risks',
      'view_audit_logs',
      'approve_all_risks'      // ✅ TAMBAHKAN
    ],
    approval_level: 3,
    can_approve: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    can_assess: true
  },
  
  ADMIN: {
    name: 'Administrator',
    permissions: [
      'system_management',
      'user_management', 
      'audit_logs',
      'data_backup',
      'api_management'
    ],
    approval_level: 0,
    can_approve: [],
    can_assess: true
  }
};

// ✅ TAMBAHKAN APPROVAL MATRIX YANG LEBIH DETAIL
export const APPROVAL_MATRIX = {
  'LOW': [
    { role: 'RISK_OWNER', action: 'Review & Approve', required: true }
  ],
  'MEDIUM': [
    { role: 'RISK_OWNER', action: 'Review', required: true },
    { role: 'RISK_MANAGER', action: 'Approve', required: true }
  ],
  'HIGH': [
    { role: 'RISK_OWNER', action: 'Review', required: true },
    { role: 'RISK_MANAGER', action: 'Approve', required: true },
    { role: 'DIRECTOR', action: 'Final Approval', required: true }
  ],
  'CRITICAL': [
    { role: 'RISK_OWNER', action: 'Review', required: true },
    { role: 'RISK_MANAGER', action: 'Approve', required: true },
    { role: 'DIRECTOR', action: 'Final Approval', required: true }
  ]
};

// ✅ TAMBAHKAN PERMISSION CHECK UTILITIES
export const hasPermission = (userRole, permission) => {
  const role = ROLES[userRole];
  return role?.permissions.includes(permission) || role?.permissions.includes('full_access');
};

export const canApproveRisk = (userRole, riskLevel) => {
  return ROLES[userRole]?.can_approve.includes(riskLevel);
};

export const canAssessRisks = (userRole) => {
  return ROLES[userRole]?.can_assess || false;
};

export const getRequiredApprovers = (riskLevel) => {
  return APPROVAL_MATRIX[riskLevel] || [];
};

// ✅ TAMBAHKAN FUNCTION UNTUK APPROVAL WORKFLOW
export const getNextApprovalStep = (riskData, currentUser) => {
  const requiredApprovers = getRequiredApprovers(riskData.level);
  const userApprovalLevel = ROLES[currentUser?.role]?.approval_level || 0;
  
  return requiredApprovers.find(step => 
    ROLES[step.role]?.approval_level > userApprovalLevel
  );
};