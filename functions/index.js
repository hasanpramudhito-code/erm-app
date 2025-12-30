const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Function 1: Set claims saat user dibuat
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    // Default role: STAFF
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'STAFF',
      staff: true,
      created: Date.now()
    });
    
    // Create user document di Firestore
    await admin.firestore().collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      name: user.displayName || '',
      role: 'STAFF',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ User ${user.email} created with STAFF role`);
  } catch (error) {
    console.error('Error creating user:', error);
  }
});

// Function 2: Update role (dipanggil dari admin panel)
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  // Cek apakah admin
  if (!context.auth || context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Hanya admin yang bisa update role'
    );
  }
  
  const { uid, role } = data;
  
  if (!uid || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'UID dan Role diperlukan'
    );
  }
  
  try {
    // Update custom claims
    const claims = { role: role };
    claims[role.toLowerCase()] = true;
    
    await admin.auth().setCustomUserClaims(uid, claims);
    
    // Update Firestore
    await admin.firestore().collection('users').doc(uid).update({
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    });
    
    return { 
      success: true, 
      message: `Role updated to ${role}`,
      uid: uid
    };
    
  } catch (error) {
    console.error('Error updating role:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Function 3: Set admin claims (ONE-TIME untuk user existing)
exports.setAdminClaims = functions.https.onRequest(async (req, res) => {
  // Simple security: check secret key
  const secret = req.query.secret;
  if (secret !== 'YOUR_SECRET_KEY') {
    return res.status(403).send('Forbidden');
  }
  
  const uid = req.query.uid || 'jkAff3bfO2ZnbznEkCDXBZM6DJq1';
  
  try {
    await admin.auth().setCustomUserClaims(uid, {
      role: 'ADMIN',
      admin: true,
      accessLevel: 10
    });
    
    await admin.firestore().collection('users').doc(uid).update({
      role: 'ADMIN',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.send(`
      <h1>✅ Custom Claims Set Successfully!</h1>
      <p>User UID: ${uid}</p>
      <p>Role: ADMIN</p>
      <p>Claims: {"role":"ADMIN","admin":true}</p>
      <br>
      <p>Now refresh your app and login again.</p>
    `);
    
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});