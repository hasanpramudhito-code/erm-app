const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'tirtatuahbanuarm' });

const db = admin.firestore();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkEmulatorReady(host, port) {
  console.log(`Checking if emulator at ${host}:${port} is ready...`);
  let attempts = 0;
  while (attempts < 10) { // Try 10 times with 3-second intervals
    try {
      const response = await fetch(`http://${host}:${port}/`);
      if (response.ok) {
        console.log(`Emulator at ${host}:${port} is ready.`);
        return true;
      }
    } catch (e) {
      // console.log(`Attempt ${attempts + 1} failed: ${e.message}`);
    }
    await sleep(3000);
    attempts++;
  }
  console.error(`Emulator at ${host}:${port} not ready after ${attempts * 3} seconds.`);
  return false;
}

const USERS = [
  {
    email: 'superadmin@erm.local',
    password: 'Admin123!',
    displayName: 'Super Admin',
    role: 'SUPER_ADMIN'
  },
  {
    email: 'admin@erm.local',
    password: 'Admin123!',
    displayName: 'Admin ERM',
    role: 'ADMIN'
  },
  {
    email: 'riskmanager@erm.local',
    password: 'Staff123!',
    displayName: 'Risk Manager',
    role: 'RISK_MANAGER'
  },
  {
    email: 'staff@erm.local',
    password: 'Staff123!',
    displayName: 'Staff Biasa',
    role: 'STAFF'
  }
];

async function seed() {
  console.log('Seeding emulator...\n');

  const authReady = await checkEmulatorReady('127.0.0.1', 9099);
  const firestoreReady = await checkEmulatorReady('127.0.0.1', 8080);

  if (!authReady || !firestoreReady) {
    console.error('One or more emulators are not ready. Please ensure they are running.');
    process.exit(1);
  }

  for (const u of USERS) {
    const userRecord = await admin.auth().createUser({
      email: u.email,
      password: u.password,
      displayName: u.displayName
    });

    const claims = { role: u.role };
    claims[u.role.toLowerCase()] = true;
    if (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') {
      claims.admin = true;
    }
    await admin.auth().setCustomUserClaims(userRecord.uid, claims);

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: u.email,
      name: u.displayName,
      role: u.role,
      status: 'active',
      department: '',
      position: '',
      phone: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`  [OK] ${u.role.padEnd(14)} | ${u.email.padEnd(26)} | password: ${u.password}`);
  }

  console.log('\nSeeding selesai. Login di http://localhost:3000');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
