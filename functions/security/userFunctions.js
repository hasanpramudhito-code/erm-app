/**
 * Callable functions untuk manajemen user & sinkronisasi role.
 * Deploy hanya saat siap: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const {
  requireUserManager,
  requireSuperAdmin,
  requireAuth,
  validateUid,
  validateRole,
  syncRoleClaims,
  writeAuditLog,
  getCallerRole
} = require('../shared/securityHelpers');

function createUserFunctions(admin, checkRateLimit) {
  const db = admin.firestore();

  const createUserWithRole = functions.https.onCall(async (data, context) => {
    const { role: callerRole } = await requireUserManager(context, admin);

    const rateLimitCheck = await checkRateLimit(context.auth.uid, 'createUserWithRole');
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const { email, password, name, role, department, position, phone, status } = data || {};

    if (!email || !password || !name) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email, password, and name are required'
      );
    }

    const finalRole = role || 'STAFF';
    validateRole(finalRole, callerRole);

    try {
      const userRecord = await admin.auth().createUser({
        email: email.toLowerCase().trim(),
        password,
        displayName: name,
        disabled: status === 'inactive'
      });

      await syncRoleClaims(admin, userRecord.uid, finalRole);

      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: email.toLowerCase().trim(),
        name,
        role: finalRole,
        department: department || '',
        position: position || '',
        phone: phone || '',
        status: status || 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid
      });

      await writeAuditLog(admin, {
        action: 'USER_CREATED_WITH_ROLE',
        performedBy: context.auth.uid,
        targetUser: userRecord.uid,
        targetEmail: email,
        role: finalRole
      });

      return {
        success: true,
        message: `User ${email} created with role ${finalRole}`,
        uid: userRecord.uid
      };
    } catch (error) {
      console.error('createUserWithRole error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Failed to create user'
      );
    }
  });

  const updateUserRole = functions.https.onCall(async (data, context) => {
    const { role: callerRole } = await requireUserManager(context, admin);

    const rateLimitCheck = await checkRateLimit(context.auth.uid, 'updateUserRole');
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const { uid, role } = data || {};
    validateUid(uid);
    validateRole(role, callerRole);

    try {
      const userRecord = await admin.auth().getUser(uid);
      await syncRoleClaims(admin, uid, role);

      await db.collection('users').doc(uid).update({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid
      });

      await writeAuditLog(admin, {
        action: 'ROLE_UPDATE',
        performedBy: context.auth.uid,
        targetUser: uid,
        targetEmail: userRecord.email,
        newRole: role
      });

      return {
        success: true,
        message: `Role updated to ${role}`,
        uid,
        email: userRecord.email
      };
    } catch (error) {
      await writeAuditLog(admin, {
        action: 'ROLE_UPDATE_FAILED',
        performedBy: context.auth.uid,
        targetUser: uid,
        error: error.message
      });
      throw new functions.https.HttpsError('internal', 'Failed to update role');
    }
  });

  const updateUserSecure = functions.https.onCall(async (data, context) => {
    const { role: callerRole } = await requireUserManager(context, admin);

    const rateLimitCheck = await checkRateLimit(context.auth.uid, 'updateUserRole');
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const { uid, name, role, department, position, phone, status } = data || {};
    validateUid(uid);

    if (role) {
      validateRole(role, callerRole);
    }

    try {
      const userRecord = await admin.auth().getUser(uid);
      const userRef = db.collection('users').doc(uid);
      const existing = await userRef.get();

      if (!existing.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const updates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid
      };

      if (name !== undefined) updates.name = name;
      if (department !== undefined) updates.department = department;
      if (position !== undefined) updates.position = position;
      if (phone !== undefined) updates.phone = phone;
      if (status !== undefined) updates.status = status;

      if (role && role !== existing.data().role) {
        await syncRoleClaims(admin, uid, role);
        updates.role = role;
      }

      await userRef.update(updates);

      if (status !== undefined) {
        await admin.auth().updateUser(uid, { disabled: status === 'inactive' });
      }

      await writeAuditLog(admin, {
        action: 'USER_UPDATED',
        performedBy: context.auth.uid,
        targetUser: uid,
        targetEmail: userRecord.email,
        changes: { name, role, department, position, phone, status }
      });

      return { success: true, uid, email: userRecord.email };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to update user');
    }
  });

  const deactivateUser = functions.https.onCall(async (data, context) => {
    await requireUserManager(context, admin);

    const { uid } = data || {};
    validateUid(uid);

    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'You cannot deactivate your own account'
      );
    }

    try {
      const userRecord = await admin.auth().getUser(uid);

      await admin.auth().updateUser(uid, { disabled: true });
      await db.collection('users').doc(uid).update({
        status: 'inactive',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid
      });

      await writeAuditLog(admin, {
        action: 'USER_DEACTIVATED',
        performedBy: context.auth.uid,
        targetUser: uid,
        targetEmail: userRecord.email
      });

      return { success: true, message: `User ${userRecord.email} deactivated` };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to deactivate user');
    }
  });

  const deleteUser = functions.https.onCall(async (data, context) => {
    await requireSuperAdmin(context, admin);

    const rateLimitCheck = await checkRateLimit(context.auth.uid, 'deleteUser');
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const { uid } = data || {};
    validateUid(uid);

    try {
      const userRecord = await admin.auth().getUser(uid);
      await admin.auth().deleteUser(uid);
      await db.collection('users').doc(uid).delete();

      await writeAuditLog(admin, {
        action: 'USER_DELETED',
        performedBy: context.auth.uid,
        targetUser: uid,
        targetEmail: userRecord.email
      });

      return { success: true, message: `User ${userRecord.email} deleted` };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to delete user');
    }
  });

  const refreshMyClaims = functions.https.onCall(async (_data, context) => {
    const auth = requireAuth(context);
    const snap = await db.collection('users').doc(auth.uid).get();

    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }

    const role = snap.data().role || 'STAFF';
    await syncRoleClaims(admin, auth.uid, role);

    return {
      success: true,
      role,
      message: 'Custom claims synced. Sign out and sign in again, or refresh token.'
    };
  });

  const getAuditLogs = functions.https.onCall(async (data, context) => {
    requireAuth(context);

    const callerRole = getCallerRole(context);
    if (!['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'].includes(callerRole)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Audit logs require admin access'
      );
    }

    const rateLimitCheck = await checkRateLimit(context.auth.uid, 'getAuditLogs');
    if (!rateLimitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`,
        { retryAfter: rateLimitCheck.retryAfter }
      );
    }

    const { limit = 100, offset = 0 } = data || {};

    if (typeof limit !== 'number' || limit > 1000 || limit < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Limit must be 1-1000');
    }

    const snapshot = await db.collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString?.() || null
    }));

    return { success: true, logs, total: logs.length, hasMore: logs.length === limit };
  });

  return {
    createUserWithRole,
    updateUserRole,
    updateUserSecure,
    deactivateUser,
    deleteUser,
    refreshMyClaims,
    getAuditLogs
  };
}

module.exports = { createUserFunctions };
