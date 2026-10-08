# 🛡️ QUICK REFERENCE - SECURITY CHECKLIST & TOOLS

## ⚡ CRITICAL ACTIONS (24 Hours)

```markdown
- [ ] Regenerate Firebase API Key
  ```bash
  # 1. Go to Firebase Console > Project Settings > API Keys
  # 2. Delete old key: AIzaSyDpIt5UyfofJf6SKaJGQfZXGosqZ5kLc9s
  # 3. Create new key and add HTTP referrer restrictions
  ```

- [ ] Remove hardcoded secrets from code
  ```bash
  # Search and replace in functions/index.js
  # 'YOUR_SECRET_KEY' → process.env.ADMIN_SECRET
  ```

- [ ] Deploy Firestore security rules
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] Commit security fixes to git
  ```bash
  git add *.md
  git commit -m "docs: add security audit and fixes"
  git push
  ```
```

---

## 🔍 Security Scanning Tools

### 1. Check NPM Vulnerabilities

```bash
# View all vulnerabilities
npm audit

# Auto-fix common issues
npm audit fix

# Generate report
npm audit --json > security-report.json
```

### 2. Detect Secrets in Code

```bash
# Install
npm install -g detect-secrets

# Scan
detect-secrets scan > .secrets.baseline

# Verify findings
detect-secrets audit .secrets.baseline
```

### 3. Check Dependency Versions

```bash
# Check outdated packages
npm outdated

# Update safely
npm update --save
```

### 4. Firebase Security Test

```bash
# Setup emulator
firebase setup:emulators:firestore

# Start local emulator
firebase emulators:start

# Test rules locally (create tests/)
# See below for sample test
```

### 5. OWASP Dependency Checker

```bash
# Install
npm install -g @dependency-check-tools/dependency-check
# or
pip install safety

# Scan
safety check
```

---

## 🧪 Sample Firestore Rules Test

### File: `firestore.rules.test.js`

```javascript
const firebase = require('@firebase/rules-unit-testing');
const fs = require('fs');

const PROJECT_ID = 'erm-system-2449b';

// Load rules
const rules = fs.readFileSync('firestore.rules', 'utf8');

describe('Firestore Security Rules', () => {
  
  let adminDb;
  let userDb;
  let staffDb;

  beforeEach(() => {
    adminDb = firebase.initializeAdminSdkApp({ projectId: PROJECT_ID }).firestore();
    
    userDb = firebase.initializeTestApp({
      projectId: PROJECT_ID,
      auth: { uid: 'user123', role: 'ADMIN' }
    }).firestore();

    staffDb = firebase.initializeTestApp({
      projectId: PROJECT_ID,
      auth: { uid: 'staff123', role: 'STAFF' }
    }).firestore();
  });

  afterEach(() => {
    firebase.clearFirestoreData({ projectId: PROJECT_ID });
  });

  describe('Risks Collection', () => {
    
    it('ADMIN can create risk', async () => {
      const ref = userDb.collection('risks').doc('risk1');
      await firebase.assertSucceeds(
        ref.set({
          title: 'Test Risk',
          description: 'Test',
          likelihood: 3,
          impact: 4,
          created_by: 'user123'
        })
      );
    });

    it('STAFF cannot create risk', async () => {
      const ref = staffDb.collection('risks').doc('risk1');
      await firebase.assertFails(
        ref.set({
          title: 'Test Risk',
          description: 'Test',
          likelihood: 3,
          impact: 4
        })
      );
    });

    it('All users can read risks', async () => {
      const ref = staffDb.collection('risks').doc('risk1');
      await firebase.assertSucceeds(ref.get());
    });
  });

  describe('Approval Requests Collection', () => {
    
    it('User can only see own approval requests', async () => {
      // Setup: create approval request
      await adminDb.collection('approvalRequests').doc('req1').set({
        requested_by: 'user123',
        approvers: ['admin123'],
        status: 'pending'
      });

      // STAFF user cannot see
      const ref = staffDb.collection('approvalRequests').doc('req1');
      await firebase.assertFails(ref.get());

      // User can see own
      const userRef = userDb.collection('approvalRequests').doc('req1');
      await firebase.assertSucceeds(userRef.get());
    });
  });

  describe('Audit Logs Collection', () => {
    
    it('Only ADMIN can read audit logs', async () => {
      await adminDb.collection('audit_logs').doc('log1').set({
        action: 'TEST',
        timestamp: new Date()
      });

      // ADMIN can read
      await firebase.assertSucceeds(
        adminDb.collection('audit_logs').doc('log1').get()
      );

      // STAFF cannot read
      await firebase.assertFails(
        staffDb.collection('audit_logs').doc('log1').get()
      );
    });

    it('Frontend users cannot write audit logs', async () => {
      const ref = userDb.collection('audit_logs').doc('log1');
      await firebase.assertFails(ref.set({ action: 'TEST' }));
    });
  });
});

// Run tests:
// npm test firestore.rules.test.js
```

Run tests:
```bash
npm install --save-dev @firebase/rules-unit-testing

# Run jest tests
npm test firestore.rules.test.js
```

---

## 🔐 Environment Variables Setup

### `.env.local` (Development only)

```bash
REACT_APP_AUTH_DOMAIN=erm-system-2449b.firebaseapp.com
REACT_APP_PROJECT_ID=erm-system-2449b
REACT_APP_STORAGE_BUCKET=erm-system-2449b.appspot.com
REACT_APP_MESSAGING_SENDER_ID=72430044646
REACT_APP_APP_ID=1:72430044646:web:b70a4eba1cae2dd0e74227
REACT_APP_ENCRYPTION_KEY=development-key-only
```

### `.env.production` (NO secrets)

```bash
REACT_APP_AUTH_DOMAIN=erm-system-2449b.firebaseapp.com
REACT_APP_PROJECT_ID=erm-system-2449b
REACT_APP_STORAGE_BUCKET=erm-system-2449b.appspot.com
REACT_APP_MESSAGING_SENDER_ID=72430044646
REACT_APP_APP_ID=1:72430044646:web:b70a4eba1cae2dd0e74227
```

### Cloud Functions - Set secrets

```bash
# Set environment variables for functions
firebase functions:config:set \
  admin.secret="your-secure-random-secret" \
  encryption.key="your-encryption-key"

# Verify
firebase functions:config:get

# Use in functions/index.js
const { admin, encryption } = functions.config();
const adminSecret = admin.secret;
const encryptionKey = encryption.key;
```

---

## 📊 Security Headers Configuration

### File: `firebase.json` (Updated)

```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=63072000; includeSubDomains; preload"
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
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.firebase.com; style-src 'self' 'unsafe-inline'"
          },
          {
            "key": "Permissions-Policy",
            "value": "geolocation=(), microphone=(), camera=()"
          }
        ]
      },
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "private, no-cache, no-store, must-revalidate"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}
```

---

## 🚀 Deployment Guide

### Step 1: Pre-deployment Security Check

```bash
#!/bin/bash
# security-check.sh

echo "🔍 Running pre-deployment security checks..."

# 1. Check for secrets
echo "Checking for exposed secrets..."
detect-secrets scan . 2>/dev/null | grep -q "No secrets found" && echo "✅ No secrets found" || echo "❌ Secrets detected!"

# 2. Audit npm
echo "Auditing npm packages..."
npm audit --json | jq '.metadata.vulnerabilities' && echo "✅ NPM audit passed" || echo "⚠️ Check npm audit"

# 3. Check keys in env files
echo "Checking environment files..."
grep -l "API_KEY\|secret\|password" .env.production && echo "❌ Remove secrets from .env.production" || echo "✅ No secrets in .env.production"

# 4. Verify firebase.json
echo "Checking firebase.json..."
[ -f "firebase.json" ] && echo "✅ firebase.json exists" || echo "❌ firebase.json not found"

echo "✅ Pre-deployment check complete!"
```

Run it:
```bash
chmod +x security-check.sh
./security-check.sh
```

### Step 2: Staging Deployment

```bash
# Deploy to staging first
firebase deploy --project=erm-system-2449b-staging --only firestore:rules,functions

# Test on staging
curl -X POST https://staging-erm.web.app/api/test

# Check logs
firebase functions:log --project=erm-system-2449b-staging
```

### Step 3: Production Deployment

```bash
# Backup current version
firebase deploy --project=erm-system-2449b --only firestore:rules

# Deploy functions
firebase deploy --project=erm-system-2449b --only functions

# Deploy hosting
firebase deploy --project=erm-system-2449b --only hosting

# Verify deployment
curl -I https://erm-system-2449b.web.app | grep Strict-Transport-Security
```

---

## 📱 Post-Deployment Monitoring

### 1. Monitor Audit Logs

```javascript
// Create Firestore Admin Dashboard Component
// src/components/AuditLogDashboard.js

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export function AuditLogDashboard() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchLogs = async () => {
      const logsRef = collection(db, 'audit_logs');
      const q = query(
        logsRef,
        where('timestamp', '>', Timestamp.fromDate(new Date(Date.now() - 24*60*60*1000))),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(data);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Security Audit Logs (Last 24 Hours)</h2>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>User</th>
            <th>Timestamp</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.action}</td>
              <td>{log.email}</td>
              <td>{new Date(log.timestamp.toDate()).toLocaleString()}</td>
              <td>{JSON.stringify(log.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 2. Setup Cloud Monitoring Alerts

```javascript
// Setup in Cloud Console > Monitoring > Alerts

// Alert 1: Multiple failed login attempts
// Condition: audit_logs where action='USER_LOGIN' AND success=false
// Threshold: > 5 in 10 minutes

// Alert 2: Unauthorized API calls
// Condition: audit_logs where action='SECURITY_EVENT'
// Threshold: > 3 in 5 minutes

// Alert 3: Data modification by non-admin
// Condition: audit_logs where action='DATA_DELETE' AND role!='ADMIN'
// Threshold: >= 1
```

### 3. Weekly Security Report

```bash
#!/bin/bash
# security-report.sh

echo "📊 ERM Security Report - $(date)"

# 1. Failed login attempts
firebase firestore:query collections/audit_logs \
  --filter 'action==USER_LOGIN && success==false' \
  --limit 100 | wc -l

# 2. Role changes
firebase firestore:query collections/audit_logs \
  --filter 'action==ROLE_CHANGE' \
  --limit 100

# 3. Data deletions
firebase firestore:query collections/audit_logs \
  --filter 'action==DATA_DELETE' \
  --limit 100

# 4. Security events
firebase firestore:query collections/audit_logs \
  --filter 'action==SECURITY_EVENT' \
  --limit 100
```

---

## 📚 Resource Links

| Resource | Link |
|----------|------|
| Firebase Security | https://firebase.google.com/docs/firestore/solutions/authorize |
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ |
| Cloud Armor | https://cloud.google.com/armor |
| Node.js Security | https://nodejs.org/en/docs/guides/nodejs-security/ |
| React Security | https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml |
| Security Headers | https://securityheaders.com |
| NPM Audit | https://docs.npmjs.com/cli/v8/commands/npm-audit |

---

## ✅ Verification Checklist After Fix

```bash
# 1. ✅ API Key properly restricted
curl -i https://console.firebase.google.com/project/erm-system-2449b/settings/apikeys

# 2. ✅ Firestore rules deployed
firebase firestore:rules:describe

# 3. ✅ No secrets in source code
git grep -E "REACT_APP_API_KEY|YOUR_SECRET_KEY|password|api_key" | wc -l
# Should be 0

# 4. ✅ Cloud Functions working
firebase functions:list

# 5. ✅ Audit logs being created
firebase firestore:query collections/audit_logs --limit 1

# 6. ✅ Security headers present
curl -I https://your-domain.firebaseapp.com | grep -E "Strict-Transport|X-Content-Type|X-Frame"
```

---

## 🆘 Incident Response

### If API Key Exposed:

1. **IMMEDIATELY**:
   ```bash
   # Revoke exposed key in Firebase Console
   # All affected API calls will start failing
   ```

2. **Within 1 hour**:
   ```bash
   # Generate new API key
   # Update firebase.json reference
   # Deploy to all environments
   firebase deploy --only hosting,firestore:rules
   ```

3. **Within 24 hours**:
   ```bash
   # Review audit logs for suspicious activity
   # Check Cloud Billing for unexpected charges
   # Send notification to admins/users
   ```

### If Security Rules Breached:

1. **Immediate**:
   ```bash
   # Deploy restrictive rules to block access
   # Revert to previous known-good state
   firebase deploy --only firestore:rules
   ```

2. **Investigation**:
   ```bash
   # Check audit logs
   # Review all modifications in past 24 hours
   # Identify compromised accounts
   ```

3. **Remediation**:
   ```bash
   # Reset compromised user credentials
   # Force re-authentication
   # Review and fix root cause
   ```

---

**Last Updated**: February 12, 2026  
**Next Review**: February 19, 2026 (after fixes implemented)
