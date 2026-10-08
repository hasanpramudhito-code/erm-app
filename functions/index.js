const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({
  origin: [
    'https://tirtatuahbanuarm.firebaseapp.com',
    'https://tirtatuahbanuarm.web.app',
    'https://erm-system-2449b.firebaseapp.com',
    'https://persiapan-produksi.firebaseapp.com',
    'https://persiapan-produksi.web.app',
    'http://localhost:3000'
  ]
});

const { syncRoleClaims, writeAuditLog } = require('./shared/securityHelpers');
const { createUserFunctions } = require('./security/userFunctions');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMITS = {
  updateUserRole: { max: 50, windowMs: 60 * 60 * 1000 },
  setAdminClaims: { max: 10, windowMs: 60 * 60 * 1000 },
  deleteUser: { max: 20, windowMs: 60 * 60 * 1000 },
  getAuditLogs: { max: 300, windowMs: 60 * 60 * 1000 },
  createUserWithRole: { max: 50, windowMs: 60 * 60 * 1000 }
};

async function checkRateLimit(userId, functionName) {
  const config = RATE_LIMITS[functionName];
  if (!config) return { allowed: true };

  const rateLimitDoc = `rate_limit_${functionName}_${userId}`;
  const refDoc = admin.firestore().collection('_rate_limits').doc(rateLimitDoc);

  try {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const doc = await refDoc.get();
    let data = doc.data();

    if (!data || data.resetTime < now) {
      data = { count: 1, resetTime: now + config.windowMs, requests: [now] };
      await refDoc.set(data, { merge: true });
      return { allowed: true, remaining: config.max - 1, resetTime: data.resetTime };
    }

    const recentRequests = (data.requests || []).filter((t) => t > windowStart);

    if (recentRequests.length >= config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    recentRequests.push(now);
    await refDoc.update({
      count: recentRequests.length,
      requests: recentRequests,
      lastRequest: now
    });

    return {
      allowed: true,
      remaining: config.max - recentRequests.length,
      resetTime: data.resetTime
    };
  } catch (error) {
    console.error(`Rate limit check failed for ${functionName}:`, error);
    return { allowed: true, error: 'Rate limit check failed' };
  }
}

exports.cleanupRateLimits = functions.pubsub.schedule('every day 03:00').onRun(async () => {
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const batch = admin.firestore().batch();
    const snapshot = await admin.firestore()
      .collection('_rate_limits')
      .where('resetTime', '<', cutoff)
      .get();

    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} rate limit records`);
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
  }
});

// ============================================
// AUTH TRIGGER: default role on signup
// ============================================

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    const userDocRef = admin.firestore().collection('users').doc(user.uid);
    const docSnap = await userDocRef.get();

    if (docSnap.exists) {
      console.log(`User doc exists for ${user.email}, skipping default role`);
      return;
    }

    await syncRoleClaims(admin, user.uid, 'STAFF');

    await userDocRef.set({
      uid: user.uid,
      email: user.email,
      name: user.displayName || '',
      role: 'STAFF',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await writeAuditLog(admin, {
      action: 'USER_CREATED',
      targetUser: user.uid,
      email: user.email,
      role: 'STAFF',
      system: true
    });
  } catch (error) {
    console.error('Error in onUserCreated:', error);
  }
});

// ============================================
// HTTP: set admin claims (SUPER_ADMIN only)
// ============================================

exports.setAdminClaims = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const decodedToken = await admin.auth().verifyIdToken(authHeader.replace('Bearer ', ''));
      const currentUserDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

      if (!currentUserDoc.exists || currentUserDoc.data().role !== 'SUPER_ADMIN') {
        await writeAuditLog(admin, {
          action: 'SET_ADMIN_CLAIMS_UNAUTHORIZED',
          performedBy: decodedToken.uid,
          email: decodedToken.email
        });
        return res.status(403).json({ error: 'Only super admins can set admin claims' });
      }

      const rateLimitCheck = await checkRateLimit(decodedToken.uid, 'setAdminClaims');
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: `Rate limit exceeded. Retry in ${rateLimitCheck.retryAfter}s`,
          retryAfter: rateLimitCheck.retryAfter
        });
      }

      const uid = req.query.uid;
      if (!uid || typeof uid !== 'string' || uid.length < 20) {
        return res.status(400).json({ error: 'Invalid UID parameter' });
      }

      const targetUser = await admin.auth().getUser(uid);
      await syncRoleClaims(admin, uid, 'ADMIN');

      await admin.firestore().collection('users').doc(uid).update({
        role: 'ADMIN',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decodedToken.uid
      });

      await writeAuditLog(admin, {
        action: 'SET_ADMIN_CLAIMS',
        performedBy: decodedToken.uid,
        performedByEmail: decodedToken.email,
        targetUser: uid,
        targetEmail: targetUser.email,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'Admin claims set successfully',
        uid,
        email: targetUser.email
      });
    } catch (error) {
      console.error('setAdminClaims error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// ============================================
// CALLABLE: user & role security (undeployed until ready)
// ============================================

const userFns = createUserFunctions(admin, checkRateLimit);

exports.createUserWithRole = userFns.createUserWithRole;
exports.updateUserRole = userFns.updateUserRole;
exports.updateUserSecure = userFns.updateUserSecure;
exports.deactivateUser = userFns.deactivateUser;
exports.deleteUser = userFns.deleteUser;
exports.refreshMyClaims = userFns.refreshMyClaims;
exports.getAuditLogs = userFns.getAuditLogs;
