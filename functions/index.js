const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only ADMIN can assign roles'
    );
  }

  const { uid, role } = data;

  if (!uid || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'uid and role are required'
    );
  }

  await admin.auth().setCustomUserClaims(uid, { role });

  return { success: true };
});
