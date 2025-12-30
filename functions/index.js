// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.createUserWithRole = functions.https.onCall(async (data, context) => {
  // Cek apakah admin yang memanggil
  if (!context.auth || context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Hanya admin yang bisa membuat user'
    );
  }

  const { email, password, name, role, department, position, phone } = data;

  try {
    // 1. Create user di Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
      disabled: false
    });

    // 2. Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: role.toUpperCase()
    });

    // 3. Create user document di Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      name,
      role: role.toUpperCase(),
      department: department || '',
      position: position || '',
      phone: phone || '',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'User created successfully',
      uid: userRecord.uid
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Hanya admin yang bisa mengubah role'
    );
  }

  const { uid, role } = data;

  try {
    // Update custom claims
    await admin.auth().setCustomUserClaims(uid, {
      role: role.toUpperCase()
    });

    // Update Firestore
    await admin.firestore().collection('users').doc(uid).update({
      role: role.toUpperCase(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating role:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});