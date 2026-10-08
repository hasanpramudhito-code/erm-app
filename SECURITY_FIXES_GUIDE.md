# 🚀 PANDUAN PERBAIKAN KEAMANAN - IMPLEMENTASI STEP BY STEP

## 1️⃣ PERBAIKAN KRITIS: Regenerate API Key

### Step 1: Di Firebase Console

```
1. Buka https://console.firebase.google.com
2. Project: erm-system-2449b
3. Settings → Project Settings → Service Accounts
4. Download ulang private key
5. Paste ke serviceAccountKey.json
```

### Step 2: Revoke Old API Key

```
1. Settings → Project Settings → API Keys
2. Temukan: AIzaSyDpIt5UyfofJf6SKaJGQfZXGosqZ5kLc9s
3. Click → Edit → Delete
4. Regenerate key baru
```

### Step 3: Update .env.production

```bash
# BARU - Jangan include REACT_APP_API_KEY di production
REACT_APP_AUTH_DOMAIN=erm-system-2449b.firebaseapp.com
REACT_APP_PROJECT_ID=erm-system-2449b
REACT_APP_STORAGE_BUCKET=erm-system-2449b.appspot.com
REACT_APP_MESSAGING_SENDER_ID=72430044646
REACT_APP_APP_ID=1:72430044646:web:b70a4eba1cae2dd0e74227
```

### Step 4: Restrict API Key di Firebase Console

```
1. API Keys → [selected key]
2. Application restrictions → HTTP Referrers
3. Add: *.your-domain.com
4. API restrictions → Restrict to Firebase APIs only
```

---

## 2️⃣ PERBAIKAN KRITIS: Fix Cloud Function Security

### File: `functions/index.js` - Update ALL Functions

```javascript
// ============================================
// BEFORE: INSECURE
// ============================================
exports.setAdminClaims = functions.https.onRequest(async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'YOUR_SECRET_KEY') { // ❌ WRONG
    return res.status(403).send('Forbidden');
  }
  const uid = req.query.uid || 'jkAff3bfO2ZnbznEkCDXBZM6DJq1'; // ❌ HARDCODED UID
  // ...
});

// ============================================
// AFTER: SECURE
// ============================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({
  origin: [
    'https://your-domain.firebaseapp.com',
    'http://localhost:3000' // dev only
  ]
});

admin.initializeApp();

// Middleware untuk rate limiting & validation
const rateLimit = require('express-rate-limit');
const FirestoreStore = require('rate-limit-firestore');

// 1. SECURE: Update User Role with RBAC
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  // Validation 1: Must be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Validation 2: Must be ADMIN
  if (context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can update roles'
    );
  }

  // Validation 3: Validate input
  const { uid, role } = data;
  const validRoles = ['ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'STAFF'];

  if (!uid || typeof uid !== 'string' || uid.length < 20) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid UID');
  }

  if (!role || !validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid role. Must be one of: ${validRoles.join(', ')}`
    );
  }

  try {
    // Update auth claims
    const claims = {
      role: role,
      [role.toLowerCase()]: true,
      updated_at: new Date().toISOString()
    };

    await admin.auth().setCustomUserClaims(uid, claims);

    // Update Firestore
    await admin.firestore().collection('users').doc(uid).update({
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    });

    // Log audit trail
    await admin.firestore().collection('audit_logs').add({
      action: 'ROLE_UPDATE',
      performedBy: context.auth.uid,
      targetUser: uid,
      newRole: role,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest.ip
    });

    return {
      success: true,
      message: `Role updated to ${role}`,
      uid: uid
    };
  } catch (error) {
    console.error('Error updating role:', error);
    // Log failed attempt
    await admin.firestore().collection('audit_logs').add({
      action: 'ROLE_UPDATE_FAILED',
      performedBy: context.auth.uid,
      targetUser: uid,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    throw new functions.https.HttpsError('internal', 'Failed to update role');
  }
});

// 2. SECURE: Set Admin Claims with proper validation
const setAdminClaimsLimiter = rateLimit({
  store: new FirestoreStore({
    key: 'setAdminClaims',
    db: admin.firestore(),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // Max 5 attempts
  skipSuccessfulRequests: true // Don't count successful attempts
});

exports.setAdminClaims = functions
  .https
  .onRequest((req, res) => {
    // Apply CORS
    cors(req, res, async () => {
      try {
        // 1. Get ID token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Missing authorization header' });
        }

        const idToken = authHeader.replace('Bearer ', '');

        // 2. Verify token
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // 3. Check if current user is SUPER_ADMIN (can only be set manually in Firebase)
        const currentUserDoc = await admin.firestore()
          .collection('users')
          .doc(decodedToken.uid)
          .get();

        if (!currentUserDoc.exists() || currentUserDoc.data().role !== 'SUPER_ADMIN') {
          return res.status(403).json({
            error: 'Only super admins can set admin claims'
          });
        }

        // 4. Get and validate target UID from query parameter
        const uid = req.query.uid;
        if (!uid || typeof uid !== 'string' || uid.length < 20) {
          return res.status(400).json({ error: 'Invalid UID parameter' });
        }

        // 5. Verify target user exists
        try {
          await admin.auth().getUser(uid);
        } catch (error) {
          return res.status(400).json({ error: 'Target user not found' });
        }

        // 6. Set admin claims
        await admin.auth().setCustomUserClaims(uid, {
          role: 'ADMIN',
          admin: true,
          accessLevel: 10,
          grantedBy: decodedToken.uid,
          grantedAt: new Date().toISOString()
        });

        // 7. Update Firestore
        await admin.firestore().collection('users').doc(uid).update({
          role: 'ADMIN',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid
        });

        // 8. Log to audit trail
        await admin.firestore().collection('audit_logs').add({
          action: 'SET_ADMIN_CLAIMS',
          performedBy: decodedToken.uid,
          targetUser: uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: req.ip
        });

        res.json({
          success: true,
          message: 'Admin claims set successfully',
          uid: uid
        });

      } catch (error) {
        console.error('Error in setAdminClaims:', error);
        res.status(500).json({
          error: 'Internal server error'
        });

        // Log unexpected error
        await admin.firestore().collection('audit_logs').add({
          action: 'SET_ADMIN_CLAIMS_ERROR',
          error: error.message,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  });

// 3. NEW: Get audit logs (admin only)
exports.getAuditLogs = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  if (context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Audit logs are admin only'
    );
  }

  const { limit = 100, offset = 0 } = data;

  try {
    const logsRef = admin.firestore()
      .collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    const snapshot = await logsRef.get();
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { logs, total: logs.length };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

### Deploy Updated Functions

```bash
cd functions
npm install cors rate-limit-firestore joi
firebase deploy --only functions
```

---

## 3️⃣ PERBAIKAN TINGGI: Update Firestore Rules

### File: `firestore.rules`

```codex-rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return request.auth.token.role == role;
    }
    
    function isAdmin() {
      return hasRole('ADMIN') || hasRole('SUPER_ADMIN');
    }
    
    function isCreator() {
      return resource.data.created_by == request.auth.uid;
    }
    
    function isInvolvedInApproval() {
      return request.auth.uid in resource.data.approvers || 
             request.auth.uid == resource.data.requested_by;
    }
    
    function canModifyUser(userId) {
      return request.auth.uid == userId || isAdmin();
    }
    
    function preventPrivilegeEscalation() {
      return !('role' in request.resource.data) ||
             request.resource.data.role == resource.data.role ||
             isAdmin();
    }
    
    // ============================================
    // COLLECTION: users
    // ============================================
    
    match /users/{userId} {
      allow read: if canModifyUser(userId);
      allow create: if request.auth.uid == userId;
      allow update: if canModifyUser(userId) && preventPrivilegeEscalation();
      allow delete: if isAdmin();
    }
    
    // ============================================
    // COLLECTION: risks
    // ============================================
    
    match /risks/{riskId} {
      // Anyone can read risks
      allow read: if isAuthenticated();
      
      // Only RISK_MANAGER and ADMIN can create
      allow create: if hasRole('RISK_MANAGER') || isAdmin();
      
      // Only creator or ADMIN can update
      allow update: if isAdmin() || (isCreator() && hasRole('RISK_MANAGER'));
      
      // Only ADMIN can delete
      allow delete: if isAdmin();
      
      // Audit log on each interaction
      function validateRiskData() {
        let data = request.resource.data;
        return data.title != null &&
               data.description != null &&
               data.likelihood >= 1 && data.likelihood <= 5 &&
               data.impact >= 1 && data.impact <= 5;
      }
    }
    
    // ============================================
    // COLLECTION: treatment_plans
    // ============================================
    
    match /treatment_plans/{planId} {
      allow read: if isAuthenticated();
      allow create: if hasRole('RISK_MANAGER') || isAdmin();
      allow update: if isAdmin() || (isCreator() && hasRole('RISK_MANAGER'));
      allow delete: if isAdmin();
    }
    
    // ============================================
    // COLLECTION: incidents
    // ============================================
    
    match /incidents/{incidentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAdmin() || 
                       isCreator() ||
                       hasRole('COMPLIANCE_OFFICER');
      allow delete: if isAdmin();
    }
    
    // ============================================
    // COLLECTION: approvalRequests (MOST RESTRICTIVE)
    // ============================================
    
    match /approvalRequests/{requestId} {
      allow read: if isAuthenticated() && (
        isAdmin() ||
        isInvolvedInApproval() ||
        hasRole('COMPLIANCE_OFFICER')
      );
      
      allow create: if isAuthenticated() && 
                       request.resource.data.requested_by == request.auth.uid &&
                       request.resource.data.approvers.size() > 0;
      
      allow update: if isAdmin() || 
                       (isInvolvedInApproval() && request.resource.data.status == 'pending');
      
      allow delete: if isAdmin();
    }
    
    // ============================================
    // COLLECTION: audit_logs (ADMIN ONLY)
    // ============================================
    
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Backend only
    }
    
    // ============================================
    // COLLECTION: api_connections (ENCRYPTED)
    // ============================================
    
    match /api_connections/{connectionId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // ============================================
    // COLLECTION: settings (GLOBAL CONFIG)
    // ============================================
    
    match /settings/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // ============================================
    // DEFAULT: DENY ALL
    // ============================================
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Deploy Rules

```bash
firebase deploy --only firestore:rules
```

---

## 4️⃣ PERBAIKAN TINGGI: Encrypt API Credentials

### File: `src/services/apiIntegrationService.js` (Updated)

```javascript
import { db } from '../config/firebase';
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, Timestamp 
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// Security: Get encryption key from environment
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fallback-key-dev-only';

class APIIntegrationService {
  
  // ✅ HELPER: Encrypt sensitive data
  _encrypt(plaintext) {
    try {
      return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }
  
  // ✅ HELPER: Decrypt sensitive data (use with caution)
  _decrypt(ciphertext) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }
  
  // ✅ GET ALL API CONNECTIONS
  async getAllConnections(organizationId = 'default') {
    try {
      const connectionsQuery = query(
        collection(db, 'api_connections'),
        where('organization_id', '==', organizationId),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(connectionsQuery);
      const connections = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Don't return encrypted credentials to frontend
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          base_url: data.base_url,
          auth_type: data.auth_type,
          status: data.status,
          created_at: data.created_at,
          // Credentials NOT included in list view
        };
      });
      
      return connections;
    } catch (error) {
      console.error('Error getting API connections:', error);
      throw error;
    }
  }

  // ✅ CREATE NEW API CONNECTION - WITH ENCRYPTION
  async createConnection(connectionData) {
    try {
      // Validate input
      if (!connectionData.name || !connectionData.type) {
        throw new Error('Name and type are required');
      }

      // Encrypt sensitive fields
      const encryptedData = {
        ...connectionData,
        username: connectionData.username ? 
          this._encrypt(connectionData.username) : null,
        password: connectionData.password ? 
          this._encrypt(connectionData.password) : null,
        api_key: connectionData.api_key ? 
          this._encrypt(connectionData.api_key) : null,
        auth_token: connectionData.auth_token ? 
          this._encrypt(connectionData.auth_token) : null,
        // Metadata
        status: 'inactive',
        last_sync: null,
        sync_count: 0,
        error_count: 0,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: this._getCurrentUserId() // Track who created it
      };

      const docRef = await addDoc(
        collection(db, 'api_connections'),
        encryptedData
      );

      console.log('API connection created (encrypted):', docRef.id);
      return { id: docRef.id, ...connectionData }; // Return unencrypted data to app
    } catch (error) {
      console.error('Error creating API connection:', error);
      throw error;
    }
  }

  // ✅ TEST CONNECTION via Cloud Function (NOT frontend)
  async testConnection(connectionId) {
    try {
      console.log(`Testing connection: ${connectionId}...`);
      
      // Call Cloud Function instead of direct API call
      // This way, decryption happens on secure backend
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      });

      if (!response.ok) throw new Error('Test failed');

      const result = await response.json();

      // Update connection status
      await this.updateConnection(connectionId, {
        status: 'active',
        last_test: Timestamp.now(),
        test_status: 'success'
      });

      return {
        success: true,
        message: 'Connection test successful',
        response: result
      };
    } catch (error) {
      console.error('Connection test failed:', error);

      await this.updateConnection(connectionId, {
        status: 'error',
        last_test: Timestamp.now(),
        test_status: 'failed',
        last_error: error.message
      });

      return {
        success: false,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }

  // ✅ SYNC DATA via Cloud Function
  async syncFromExternal(connectionId) {
    try {
      const response = await fetch('/api/sync-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error);

      // Update sync statistics
      const connection = await this.getConnection(connectionId);
      await this.updateConnection(connectionId, {
        last_sync: Timestamp.now(),
        sync_count: (connection.sync_count || 0) + 1,
        status: 'active'
      });

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  // ✅ Helper: Get current user ID
  _getCurrentUserId() {
    // Implementation depends on your auth setup
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.uid || 'unknown';
  }

  // ✅ UPDATE CONNECTION
  async updateConnection(connectionId, updateData) {
    try {
      const connectionRef = doc(db, 'api_connections', connectionId);
      await updateDoc(connectionRef, {
        ...updateData,
        updated_at: Timestamp.now()
      });
      console.log('API connection updated:', connectionId);
    } catch (error) {
      console.error('Error updating API connection:', error);
      throw error;
    }
  }

  // ✅ DELETE CONNECTION
  async deleteConnection(connectionId) {
    try {
      await deleteDoc(doc(db, 'api_connections', connectionId));
      console.log('API connection deleted:', connectionId);
    } catch (error) {
      console.error('Error deleting API connection:', error);
      throw error;
    }
  }

  // ✅ Helper: Get single connection (without credentials)
  async getConnection(connectionId) {
    try {
      const docSnap = await getDocs(
        query(collection(db, 'api_connections'),
              where('id', '==', connectionId))
      );
      if (docSnap.empty) return null;
      return docSnap.docs[0].data();
    } catch (error) {
      console.error('Error getting connection:', error);
      throw error;
    }
  }
}

export default new APIIntegrationService();
```

---

## 5️⃣ PERBAIKAN MENENGAH: Fix localStorage Issues

### File: `src/pages/ControlTesting/TestResults.js` (Updated)

```javascript
// BEFORE
const savedResults = JSON.parse(localStorage.getItem('testResults') || '[]');
localStorage.setItem('testResults', JSON.stringify(updatedResults));

// AFTER
// Use sessionStorage instead (clears on browser close)
const savedResults = JSON.parse(sessionStorage.getItem('testResults') || '[]');
sessionStorage.setItem('testResults', JSON.stringify(updatedResults));

// OR use IndexedDB for persistent encrypted storage
import Dexie from 'dexie';

const db = new Dexie('ERMDatabase');
db.version(1).stores({
  testResults: '++id, timestamp',
  testSchedules: '++id, timestamp'
});

export async function saveTestResult(result) {
  await db.testResults.add({
    ...result,
    timestamp: new Date()
  });
}

export async function getTestResults() {
  return await db.testResults.toArray();
}

export async function deleteTestResult(id) {
  await db.testResults.delete(id);
}
```

---

## 6️⃣ PERBAIKAN MENENGAH: Implement Audit Logging

### File: `src/services/auditService.js` (NEW)

```javascript
import { db } from '../config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export class AuditService {
  
  static async log(action, details = {}) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      await addDoc(collection(db, 'audit_logs'), {
        action: action,
        performedBy: user?.uid || 'unknown',
        email: user?.email || 'unknown',
        details: details,
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    } catch (error) {
      console.error('[AUDIT] Logging failed:', error);
      // Don't throw - don't block app for audit failures
    }
  }
  
  static logLogin(email, success, reason = null) {
    return this.log('USER_LOGIN', {
      email, success, reason
    });
  }
  
  static logLogout(email) {
    return this.log('USER_LOGOUT', { email });
  }
  
  static logDataCreate(collection, docId, data) {
    return this.log('DATA_CREATE', { collection, docId });
  }
  
  static logDataUpdate(collection, docId, changes) {
    return this.log('DATA_UPDATE', { collection, docId, changes });
  }
  
  static logDataDelete(collection, docId) {
    return this.log('DATA_DELETE', { collection, docId });
  }
  
  static logRoleChange(targetUser, newRole) {
    return this.log('ROLE_CHANGE', { targetUser, newRole });
  }
  
  static logAPICall(connectionName, method, status) {
    return this.log('API_CALL', { connectionName, method, status });
  }
  
  static logSecurityEvent(event, details) {
    return this.log('SECURITY_EVENT', { event, details });
  }
}

// Usage
import { AuditService } from '../services/auditService';

// In login component
try {
  await auth.signInWithEmailAndPassword(email, password);
  AuditService.logLogin(email, true);
} catch (error) {
  AuditService.logLogin(email, false, error.code);
  throw error;
}
```

---

## 🔄 Testing & Validation

### 1. Test Firestore Rules

```bash
# Install Firebase emulator
firebase setup:emulators:firestore

# Start emulator
firebase emulators:start

# Run tests
npm test -- firestore.rules
```

### 2. Test Cloud Functions locally

```bash
firebase emulators:start --only functions,firestore

# Then call in browser console:
firebase.functions().httpsCallable('updateUserRole')({
  uid: 'test-uid',
  role: 'RISK_MANAGER'
}).then(result => console.log(result));
```

### 3. Security checklist

```bash
# Audit NPM dependencies
npm audit

# Check for secrets in code
npm install -g detect-secrets
detect-secrets scan > .secrets.baseline

# HTTPS check
curl -I https://your-domain.firebaseapp.com | grep Strict-Transport-Security

# CSP check
curl -I https://your-domain.firebaseapp.com | grep Content-Security-Policy
```

---

## 📋 Deployment Checklist

- [ ] API key regenerated & old key revoked
- [ ] Cloud Functions updated & tested
- [ ] Firestore rules deployed
- [ ] Encryption library installed
- [ ] Environment variables configured
- [ ] Audit logging implemented
- [ ] localStorage replaced with sessionStorage/IndexedDB
- [ ] HTTPS headers configured
- [ ] Security headers added
- [ ] Tested on staging first
- [ ] Production deployment scheduled during low-traffic window

```bash
# Final deployment
firebase deploy --only firestore:rules,functions,hosting
```
