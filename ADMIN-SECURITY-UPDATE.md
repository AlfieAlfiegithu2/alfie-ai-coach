# Admin Security Improvements - December 25, 2025

## Summary of Changes

This update implements comprehensive security improvements for the admin access system.

## 🔒 Security Fixes Applied

### 1. Removed Hardcoded Passwords
- **BEFORE:** Admin password `myye65402086` was hardcoded in frontend code
- **AFTER:** Password is securely hashed using PBKDF2 (100,000 iterations) and stored in database

### 2. Secure Session Management
- **BEFORE:** Session stored as `localStorage.setItem('admin_session', 'true')`
- **AFTER:** 64-character cryptographic session token with database validation

### 3. Rate Limiting Added
- 5 failed login attempts triggers 30-minute lockout
- Per-email tracking in `admin_login_attempts` table

### 4. CORS Restrictions
- **BEFORE:** All origins allowed (`*`)
- **AFTER:** Only allowed domains:
  - `http://localhost:5173`
  - `http://localhost:3000`
  - `https://alfie-ai-coach.vercel.app`
  - `https://alfie.app`
  - `https://www.alfie.app`

### 5. Admin Role Enforcement
- Enabled admin role check in `vocab-admin-seed` function
- Only users with admin role can access admin-only functions

### 6. Audit Logging
- All login attempts (success/failure) are logged
- Admin actions recorded in `admin_audit_log` table

### 7. Server-Side Session Validation
- `admin-content` now validates session tokens via database RPC
- No more client-side only authentication

## 📁 Files Modified

| File | Changes |
|------|---------|
| `apps/main/src/hooks/useAdminAuth.ts` | Complete rewrite - secure session management |
| `apps/main/src/pages/AdminLogin.tsx` | Added email field, improved UI |
| `supabase/functions/admin-auth/index.ts` | Added rate limiting, CORS restrictions, audit logging |
| `supabase/functions/admin-content/index.ts` | Removed hardcoded password, session validation |
| `supabase/functions/vocab-admin-seed/index.ts` | Enabled admin role check |

## 📁 Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20251225_admin_security_tables.sql` | Database tables for security |
| `scripts/register-admin.mjs` | Admin registration script |

## 🔑 Admin Login Credentials

- **Email:** ryanbigbang15@gmail.com
- **Password:** myye65402086
- **Name:** Alfie

## 📊 Security Level Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Password Storage | Hardcoded in JS | PBKDF2 hashed in DB |
| Session Token | `'true'` string | 64-char crypto token |
| Session Expiry | Never | 8 hours |
| Rate Limiting | None | 5 attempts / 30 min |
| CORS | All origins | Whitelisted only |
| Audit Trail | None | Full logging |
| Role Verification | Disabled | Enabled |

## ✅ Deployed Edge Functions

- `admin-auth` - Deployed ✅
- `admin-content` - Deployed ✅
- `vocab-admin-seed` - Deployed ✅

## 🧪 Testing

To test the new admin login:
1. Go to `/admin/login`
2. Enter email: `ryanbigbang15@gmail.com`
3. Enter password: `myye65402086`
4. Click "Access Admin Panel"

## 🔧 Maintenance

### Clean up old login attempts (run weekly)
```sql
SELECT cleanup_old_login_attempts();
```

### Clean up expired sessions (run daily)
```sql
SELECT cleanup_expired_admin_sessions();
```

### View audit logs
```sql
SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 100;
```

## ⚠️ Important Notes

1. **First Login:** The admin user has been registered. Use the credentials above.
2. **Session Duration:** Sessions expire after 8 hours. You'll need to re-login.
3. **Rate Limiting:** After 5 failed attempts, wait 30 minutes before trying again.
4. **CORS:** If deploying to a new domain, add it to the allowed origins in the edge functions.
