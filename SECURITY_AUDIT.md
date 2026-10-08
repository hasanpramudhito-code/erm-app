# 🔒 LAPORAN AUDIT KEAMANAN ERM-APP

**Tanggal Audit**: 12 Februari 2026  
**Status**: ⚠️ BUTUH PERBAIKAN SEGERA

---

## 📊 RINGKASAN KERENTANAN

| Tingkat | Jumlah | Status |
|---------|--------|---------|
| 🔴 KRITIS | 2 | Segera perbaiki |
| 🟠 TINGGI | 4 | Prioritas tinggi |
| 🟡 MENENGAH | 4 | Perlu diperbaiki |
| 🟢 RENDAH | 2 | Perhatian |

**Total Kerentanan**: 12

---

## 🔴 KERENTANAN KRITIS

### 1. **API Key Firebase Terbuka dalam `.env.production`**

**Lokasi**: `.env.production` (Line 1)  
**Tingkat Bahaya**: 🔴 KRITIS

```dotenv
REACT_APP_API_KEY=AIzaSyDpIt5UyfofJf6SKaJGQfZXGosqZ5kLc9s
```

**Risiko**:
- Penyerang dapat menggunakan API key ini untuk mengakses Firebase project Anda
- Dapat mengakses Firestore database secara tidak sah
- Dapat membuat authentic requests ke aplikasi Anda
- Biaya API yang tidak terkontrol (excessive charges)

**Rekomendasi**:
1. **SEGERA** regenerate API key di Firebase Console
2. Gunakan Firebase Security Rules yang ketat
3. Implementasi API key restrictions di Firebase Console:
   - HTTP Referrers: `*.yourdomain.com`
   - API restrictions: Hanya Firebase API yang diperlukan
4. Jangan simpan API key di `.env.production` - biarkan default dari Firebase

```bash
# Buat .env.production baru TANPA API key
REACT_APP_AUTH_DOMAIN=erm-system-2449b.firebaseapp.com
REACT_APP_PROJECT_ID=erm-system-2449b
REACT_APP_STORAGE_BUCKET=erm-system-2449b.appspot.com
REACT_APP_MESSAGING_SENDER_ID=72430044646
REACT_APP_APP_ID=1:72430044646:web:b70a4eba1cae2dd0e74227
```

---

### 2. **Hardcoded Secret Key dalam Cloud Function**

**Lokasi**: `functions/index.js` (Lines 78-81)  
**Tingkat Bahaya**: 🔴 KRITIS

```javascript
exports.setAdminClaims = functions.https.onRequest(async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'YOUR_SECRET_KEY') {  // ⚠️ HARDCODED!
    return res.status(403).send('Forbidden');
  }
```

**Risiko**:
- Secret key terbuka dalam source code
- Siapa saja yang membaca repo bisa mendapatkkan akses admin
- Tidak ada logging/monitoring attempt yang gagal
- Endpoint terbuka untuk brute force attacks

**Perbaikan WAJIB**:

```javascript
// ✅ CARA YANG BENAR
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setAdminClaims = functions.https.onRequest(async (req, res) => {
  // 1. Cek authentication user terlebih dahulu
  const idToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Verifikasi token dan cek apakah sudah admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

    // 3. Ambil secret dari environment variable (bukan source code)
    const secret = req.query.secret;
    const validSecret = process.env.ADMIN_SECRET || 'default-secure-key';
    
    if (secret !== validSecret) {
      // Log attempt yang gagal untuk security audit
      console.warn(`Failed admin claim attempt from ${decodedToken.uid}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const uid = req.query.uid;
    
    if (!uid) {
      return res.status(400).json({ error: 'UID required' });
    }

    // 4. Set claims
    await admin.auth().setCustomUserClaims(uid, {
      role: 'ADMIN',
      admin: true,
      accessLevel: 10
    });

    await admin.firestore().collection('users').doc(uid).update({
      role: 'ADMIN',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Log tindakan admin
    await admin.firestore().collection('audit_logs').add({
      action: 'SET_ADMIN_CLAIMS',
      performedBy: decodedToken.uid,
      targetUser: uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Admin claims set successfully' });

  } catch (error) {
    console.error('Error setting admin claims:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Langkah Implementasi**:
1. Simpan secret di Firebase Functions environment variables:
   ```bash
   firebase functions:config:set secret.admin_key="GENERATE_STRONG_RANDOM_KEY"
   ```

2. Akses di code:
   ```javascript
   const validSecret = functions.config().secret?.admin_key;
   ```

---

## 🟠 KERENTANAN TINGGI

### 3. **Firestore Rules Terlalu Permissif**

**Lokasi**: `firestore.rules`  
**Tingkat Bahaya**: 🟠 TINGGI

**Masalah**:
```codex-rules
match /risks/{riskId} {
  allow read: if request.auth != null;  // Semua user authenticated bisa baca
  allow write: if request.auth != null; // Semua user authenticated bisa edit
}
```

User dengan role STAFF dapat membaca/menulis SEMUA data risks, meski seharusnya restricted.

**Perbaikan - Implementasi RBAC**:

```codex-rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Fungsi helper untuk check role
    function hasRole(role) {
      return request.auth.token.role == role;
    }
    
    function isAdmin() {
      return hasRole('ADMIN');
    }
    
    function isCreator() {
      return resource.data.created_by == request.auth.uid;
    }
    
    // Risks: Admin full access, STAFF hanya bisa baca
    match /risks/{riskId} {
      allow read: if request.auth != null;
      allow create: if isAdmin() || hasRole('RISK_MANAGER');
      allow update: if isAdmin() || 
                       (hasRole('RISK_MANAGER') && isCreator());
      allow delete: if isAdmin();
    }
    
    // Treatment Plans
    match /treatment_plans/{planId} {
      allow read: if request.auth != null;
      allow create: if hasRole('RISK_MANAGER') || isAdmin();
      allow update: if isAdmin() || 
                       (hasRole('RISK_MANAGER') && isCreator());
      allow delete: if isAdmin();
    }
    
    // Incidents: Ketat
    match /incidents/{incidentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if isAdmin() || 
                       isCreator() ||
                       hasRole('COMPLIANCE_OFFICER');
      allow delete: if isAdmin();
    }
    
    // Approval Requests: Paling ketat
    match /approvalRequests/{requestId} {
      allow read: if request.auth != null && 
                     (isAdmin() || 
                      resource.data.approvers contains request.auth.uid ||
                      resource.data.requested_by == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if isAdmin() || 
                       (resource.data.approvers contains request.auth.uid);
      allow delete: if isAdmin();
    }
    
    // User Profiles
    match /users/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || isAdmin());
      allow write: if request.auth.uid == userId || isAdmin();
    }
    
    // Audit Logs: Hanya read by ADMIN
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow write: if false;  // Hanya server yang bisa write
    }
  }
}
```

---

### 4. **Kredensial API Disimpan di Firestore Tanpa Enkripsi**

**Lokasi**: `src/services/apiIntegrationService.js` (Lines 289-292)  
**Tingkat Bahaya**: 🟠 TINGGI

```javascript
buildHeaders(connection) {
  const headers = {};
  
  if (connection.auth_type === 'basic') {
    const credentials = btoa(`${connection.username}:${connection.password}`);
    headers['Authorization'] = `Basic ${credentials}`; // ⚠️ Password clear!
  } else if (connection.auth_type === 'api_key') {
    headers[connection.api_key_header || 'X-API-Key'] = connection.api_key; // ⚠️ API Key clear!
  }
```

**Risiko**:
- Credentials tersimpan plaintext di Firestore
- Dapat dibaca oleh unauthorized users jika Firestore rules lemah
- Tidak ada enkripsi end-to-end

**Perbaikan**:

```javascript
// 1. Install encryption library
// npm install crypto-js

import CryptoJS from 'crypto-js';

class APIIntegrationService {
  // Encryption key (simpan di environment atau backend)
  ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

  // ✅ Encrypt credentials sebelum disimpan
  async createConnection(connectionData) {
    const encryptedData = {
      ...connectionData,
      // Encrypt sensitive fields
      username: connectionData.username ? 
        CryptoJS.AES.encrypt(connectionData.username, this.ENCRYPTION_KEY).toString() : null,
      password: connectionData.password ? 
        CryptoJS.AES.encrypt(connectionData.password, this.ENCRYPTION_KEY).toString() : null,
      api_key: connectionData.api_key ? 
        CryptoJS.AES.encrypt(connectionData.api_key, this.ENCRYPTION_KEY).toString() : null,
      auth_token: connectionData.auth_token ? 
        CryptoJS.AES.encrypt(connectionData.auth_token, this.ENCRYPTION_KEY).toString() : null,
      // Metadata
      status: 'inactive',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'api_connections'), encryptedData);
    return { id: docRef.id, ...encryptedData };
  }

  // ✅ Decrypt credentials saat digunakan
  buildHeaders(connection) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'ERM-System/1.0'
    };

    try {
      if (connection.auth_type === 'bearer') {
        const token = CryptoJS.AES.decrypt(connection.auth_token, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        headers['Authorization'] = `Bearer ${token}`;
        
      } else if (connection.auth_type === 'basic') {
        const username = CryptoJS.AES.decrypt(connection.username, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        const password = CryptoJS.AES.decrypt(connection.password, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        const credentials = btoa(`${username}:${password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        
      } else if (connection.auth_type === 'api_key') {
        const apiKey = CryptoJS.AES.decrypt(connection.api_key, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        headers[connection.api_key_header || 'X-API-Key'] = apiKey;
      }

      return headers;
    } catch (error) {
      console.error('Error building headers:', error);
      throw new Error('Failed to decrypt credentials');
    }
  }

  // ✅ BETTER: Gunakan Cloud Functions untuk handle sensitive operations
  // Jangan ever decrypt credentials di frontend
  async makeAPICall(connection, payload) {
    // Panggil Cloud Function daripada direct API call
    const response = await axios.post(
      '/api/makeAPICall',
      {
        connectionId: connection.id,
        payload: payload
      },
      {
        headers: {
          'Authorization': `Bearer ${await getIdToken()}`
        }
      }
    );
    return response.data;
  }
}
```

**Solusi Terbaik: Gunakan Cloud Functions**

```javascript
// functions/apiIntegration.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const CryptoJS = require('crypto-js');

// Simpan ENCRYPTION_KEY di Secret Manager, jangan di env variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

exports.makeAPICall = functions.https.onCall(async (data, context) => {
  // 1. Verifikasi authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { connectionId, payload } = data;

  try {
    // 2. Fetch connection dari Firestore (backend access)
    const connDoc = await admin.firestore().collection('api_connections').doc(connectionId).get();
    
    if (!connDoc.exists()) {
      throw new Error('Connection not found');
    }

    const connection = connDoc.data();

    // 3. Decrypt credentials (happen on secure backend only)
    const decrypted = {
      username: connection.username ? 
        CryptoJS.AES.decrypt(connection.username, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) : null,
      password: connection.password ? 
        CryptoJS.AES.decrypt(connection.password, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) : null,
      api_key: connection.api_key ? 
        CryptoJS.AES.decrypt(connection.api_key, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) : null,
    };

    // 4. Build headers on backend
    const headers = {};
    if (connection.auth_type === 'basic') {
      const credentials = Buffer.from(`${decrypted.username}:${decrypted.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (connection.auth_type === 'api_key') {
      headers[connection.api_key_header || 'X-API-Key'] = decrypted.api_key;
    }

    // 5. Make API call from backend (encrypted communication)
    const response = await axios({
      method: payload.method,
      url: payload.url,
      headers: headers,
      data: payload.body,
      timeout: payload.timeout || 30000
    });

    // 6. Log action untuk audit
    await admin.firestore().collection('audit_logs').add({
      action: 'API_CALL',
      connectionId: connectionId,
      performedBy: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('API call failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

### 5. **Hardcoded UID di Cloud Function**

**Lokasi**: `functions/index.js` (Line 87)  
**Tingkat Bahaya**: 🟠 TINGGI

```javascript
const uid = req.query.uid || 'jkAff3bfO2ZnbznEkCDXBZM6DJq1'; // ⚠️ Hardcoded!
```

**Risiko**:
- UID khusus terbuka dalam source code
- Orang lain bisa mendapat akses ke user account tertentu

**Perbaikan**:
```javascript
const uid = req.query.uid;
if (!uid) {
  return res.status(400).json({ error: 'UID is required' });
}
```

---

### 6. **Missing CORS Configuration dalam Cloud Functions**

**Lokasi**: `functions/index.js`  
**Tingkat Bahaya**: 🟠 TINGGI

**Masalah**: Function `setAdminClaims` menggunakan `onRequest` tanpa CORS headers

**Perbaikan**:

```javascript
// Install library
// npm install cors

const cors = require('cors')({ origin: true });

exports.setAdminClaims = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // ... rest of function
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Atau lebih ketat:
const cors = require('cors')({
  origin: [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
    'http://localhost:3000' // Development only
  ]
});
```

---

## 🟡 KERENTANAN MENENGAH

### 7. **localStorage Digunakan untuk Sensitif Data**

**Lokasi**: `src/pages/ControlTesting/TestResults.js`, `TestingSchedule.js`  
**Tingkat Bahaya**: 🟡 MENENGAH

```javascript
const savedResults = JSON.parse(localStorage.getItem('testResults') || '[]');
localStorage.setItem('testResults', JSON.stringify(updatedResults));
```

**Risiko**:
- localStorage mudah diakses oleh XSS attacks
- Data tidak encrypted
- Data persisten dan bisa di-scrape

**Perbaikan**:

```javascript
// Gunakan sessionStorage untuk data temporary
// atau IndexedDB untuk Encrypted storage

// Opsi 1: sessionStorage (terhapus saat browser ditutup)
const savedResults = JSON.parse(sessionStorage.getItem('testResults') || '[]');
sessionStorage.setItem('testResults', JSON.stringify(updatedResults));

// Opsi 2: IndexedDB dengan encryption (Terbaik)
import Dexie from 'dexie';
import CryptoJS from 'crypto-js';

const db = new Dexie('ERMDatabase');
db.version(1).stores({
  testResults: '++id'
});

// Save encrypted
async function saveResults(data) {
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(data), 
    process.env.REACT_APP_DB_KEY
  ).toString();
  
  await db.testResults.add({ 
    data: encrypted, 
    timestamp: new Date() 
  });
}

// Retrieve decrypted
async function getResults() {
  const record = await db.testResults.toArray();
  return record.map(r => {
    const decrypted = CryptoJS.AES.decrypt(
      r.data, 
      process.env.REACT_APP_DB_KEY
    ).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  });
}
```

---

### 8. **Tidak Ada Rate Limiting pada Cloud Functions**

**Lokasi**: `functions/index.js`  
**Tingkat Bahaya**: 🟡 MENENGAH

**Risiko**:
- API endpoints vulnerable terhadap brute force attacks
- DDoS attacks tidak terjaga
- Excessive function invocations = biaya tinggi

**Perbaikan**:

```javascript
// npm install cloud-functions-rate-limiter

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Rate limiting middleware
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Atau impor dari npm package specialized untuk Firebase
const FirestoreStore = require('rate-limit-firestore');

const setAdminClaimsLimiter = rateLimit({
  store: new FirestoreStore({
    key: 'setAdminClaims',
    db: admin.firestore(),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 attempts per hour
  skipSuccessfulRequests: true // Dont count successful requests
});

exports.setAdminClaims = functions.https.onRequest(
  setAdminClaimsLimiter,
  async (req, res) => {
    // ... function code
  }
);

// Cloud Armor untuk lebih advanced protection
// Setup di GCP Console > Cloud Armor
```

---

### 9. **Missing Input Validation pada Cloud Functions**

**Lokasi**: `functions/index.js` (updateUserRole function)  
**Tingkat Bahaya**: 🟡 MENENGAH

**Masalah**: Tidak ada validasi input yang lengkap

**Perbaikan**:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const joi = require('joi'); // npm install joi

// Define validation schemas
const updateRoleSchema = joi.object({
  uid: joi.string().required().min(20), // Firebase UID format
  role: joi.string()
    .required()
    .valid('ADMIN', 'RISK_MANAGER', 'STAFF', 'COMPLIANCE_OFFICER')
});

exports.updateUserRole = functions.https.onCall(async (data, context) => {
  // 1. Validate input
  const { error, value } = updateRoleSchema.validate(data);
  if (error) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid input: ${error.details[0].message}`
    );
  }

  const { uid, role } = value;

  // 2. Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // 3. Validate authorization
  if (context.auth.token.role !== 'ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can update roles'
    );
  }

  // 4. Prevent privilege escalation
  if (role === 'ADMIN' && context.auth.token.role !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super admins can create admins'
    );
  }

  try {
    // ... rest of function
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

### 10. **Missing Audit Logging**

**Lokasi**: Seluruh aplikasi  
**Tingkat Bahaya**: 🟡 MENENGAH

**Perbaikan**: Implementasi audit logging untuk semua critical actions

```javascript
// src/services/auditService.js
import { db } from '../config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export class AuditService {
  static async logAction(action, details = {}) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: action,
        timestamp: Timestamp.now(),
        details: details,
        userAgent: navigator.userAgent,
        ipAddress: await this.getUserIP() // Optional, perlu backend
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  static async logLogin(email, success) {
    await this.logAction('LOGIN', {
      email: email,
      success: success,
      timestamp: new Date().toISOString()
    });
  }

  static async logDataAccess(collectionName, documentId) {
    await this.logAction('DATA_ACCESS', {
      collection: collectionName,
      documentId: documentId
    });
  }

  static async logDataModification(action, collectionName, documentId, changes) {
    await this.logAction(`DATA_${action}`, {
      collection: collectionName,
      documentId: documentId,
      changes: changes
    });
  }
}

// Usage di component
import { AuditService } from '../services/auditService';

// Dalam login process
try {
  await login(email, password);
  AuditService.logLogin(email, true);
} catch (error) {
  AuditService.logLogin(email, false);
  throw error;
}
```

---

## 🟢 KERENTANAN RENDAH

### 11. **Missing HTTPS Enforcement**

**Tingkat Bahaya**: 🟢 RENDAH (Firebase hosting auto HTTPS)

**Tetap pastikan di firebase.json**:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ]
  }
}
```

---

### 12. **Missing Content Security Policy (CSP)**

**Tingkat Bahaya**: 🟢 RENDAH

**Tambah ke index.html**:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.firebase.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
">
```

---

## ✅ CHECKLIST PERBAIKAN

### Priority 1: KRITIS (Dalam 24 jam)
- [ ] Regenerate Firebase API Key
- [ ] Replace hardcoded 'YOUR_SECRET_KEY' dengan environment variable
- [ ] Implementasi RBAC di Firestore Rules
- [ ] Encrypt credentials di Firestore

### Priority 2: TINGGI (Minggu ini)
- [ ] Implement CORS configuration
- [ ] Remove hardcoded UID
- [ ] Move sensitive API calls ke Cloud Functions backend
- [ ] Implement audit logging

### Priority 3: MENENGAH (Bulan ini)
- [ ] Replace localStorage dengan IndexedDB/sessionStorage
- [ ] Implement rate limiting
- [ ] Add comprehensive input validation
- [ ] Add security headers

### Priority 4: RENDAH (Ongoing)
- [ ] Maintain HTTPS enforcement
- [ ] Review CSP policy
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## 🛠️ PERINTAH IMPLEMENTASI CEPAT

```bash
# 1. Install security packages
npm install crypto-js dexie joi cors rate-limit-firestore

# 2. Update dependencies (cek vulnerabilities)
npm audit
npm audit fix

# 3. Setup environment variables
cp .env.production .env.production.local
# Edit .env.production.local dan remove API_KEY

# 4. Deploy dengan security improvements
firebase deploy
```

---

## 📚 RESOURCES

- [Firebase Security Best Practices](https://firebase.google.com/docs/firestore/solutions/authorize)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloud Armor](https://cloud.google.com/armor)
- [Google Cloud Security Command Center](https://cloud.google.com/security-command-center)

---

**Laporan dibuat oleh**: GitHub Copilot Security Audit  
**Status**: Perlu immediate action untuk kerentanan kritis
