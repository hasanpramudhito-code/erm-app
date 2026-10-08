# ⏱️ RATE LIMITING IMPLEMENTATION

## ✅ Rate Limiting Ditambahkan

Rate limiting telah diimplementasikan untuk mencegah abuse dan attack:
- Brute force attacks
- DDoS attacks
- Excessive API calls
- Spam requests

---

## 📊 Rate Limit Configuration

| Function | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `updateUserRole` | 50 requests | Per hour | Prevent role manipulation spam |
| `setAdminClaims` | 10 requests | Per hour | Prevent unauthorized admin grants |
| `deleteUser` | 20 requests | Per hour | Prevent mass deletion |
| `getAuditLogs` | 300 requests | Per hour | Allow safe audit log queries |

---

## 🔧 How It Works

### Storage: Firestore `_rate_limits` Collection
```
Collection: _rate_limits
Document ID: rate_limit_{functionName}_{userId}
Fields:
  - count: number of requests in current window
  - resetTime: when the window expires
  - requests: array of request timestamps
  - lastRequest: timestamp of last request
```

### Algorithm:
1. Check if user has a rate limit record
2. If record expired, reset counter
3. Filter requests older than window expiry
4. If recent requests >= max limit → reject
5. Otherwise → increment counter & allow

### Cleanup:
- Automatic cleanup runs daily at 03:00 UTC
- Removes rate limit records older than 7 days
- Prevents Firestore collection from growing indefinitely

---

## 📝 Code Example

### Before (No Rate Limiting):
```javascript
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw error;
  if (context.auth.token.role !== 'ADMIN') throw error;
  // ... process request
});
```

### After (With Rate Limiting):
```javascript
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw error;
  if (context.auth.token.role !== 'ADMIN') throw error;
  
  // ✅ NEW: Rate limiting check
  const rateLimitCheck = await checkRateLimit(context.auth.uid, 'updateUserRole');
  if (!rateLimitCheck.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Please try again in ${rateLimitCheck.retryAfter} seconds`,
      { retryAfter: rateLimitCheck.retryAfter }
    );
  }
  
  // ... process request
});
```

---

## 🚨 Rate Limit Response

### When Exceeded:
```json
{
  "code": "resource-exhausted",
  "message": "Rate limit exceeded. Please try again in 3600 seconds",
  "details": {
    "retryAfter": 3600
  }
}
```

HTTP Status: **429 Too Many Requests**

---

## 🔍 Monitoring

### Check Rate Limits in Firebase Console

```
Firestore > _rate_limits collection
```

You'll see documents like:
```
rate_limit_updateUserRole_jkAff3bfO2ZnbznEkCDXBZM6DJq1
rate_limit_setAdminClaims_admin123xyz
rate_limit_deleteUser_superadmin456
```

---

## 🛡️ Security Benefits

✅ **Brute Force Protection**
- Can't hammer login or auth endpoints

✅ **DDoS Mitigation**
- Prevents rapid-fire requests from single user

✅ **Spam Prevention**
- Limits role changes, user deletions, etc

✅ **Resource Protection**
- Limits Firestore database load

✅ **Cost Control**
- Prevents unexpected billing spikes

---

## 🔧 Customization

To adjust limits, edit `RATE_LIMITS` object in `functions/index.js`:

```javascript
const RATE_LIMITS = {
  updateUserRole: { max: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  setAdminClaims: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  deleteUser: { max: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  getAuditLogs: { max: 300, windowMs: 60 * 60 * 1000 }, // 300 per hour
};
```

**windowMs constants:**
- `60 * 1000` = 1 minute
- `60 * 60 * 1000` = 1 hour
- `24 * 60 * 60 * 1000` = 1 day

---

## ⚙️ Additional Layers (Optional - For Future)

### Layer 2: Cloud Armor (Hardware Level)
- IP-based rate limiting
- GeoIP blocking
- Bot detection

### Layer 3: Firebase App Check
- Verify app authenticity
- Device-level attestation

### Layer 4: Custom Middleware
- API key rotation
- Advanced anomaly detection

---

## 📞 Troubleshooting

### Q: User gets "Rate limit exceeded" message
**A**: They've exceeded the limit for that function. They need to wait until the window resets.

### Q: How to reset a user's rate limit?
**A**: Delete the document from `_rate_limits` collection:
```
Delete: rate_limit_{functionName}_{userId}
```

### Q: Can I temporary disable rate limiting?
**A**: Comment out the `checkRateLimit` call:
```javascript
// const rateLimitCheck = await checkRateLimit(...);
// if (!rateLimitCheck.allowed) throw error;
```

---

**Status**: ✅ Rate Limiting Added & Deployed

---

Last Updated: 12 Februari 2026
