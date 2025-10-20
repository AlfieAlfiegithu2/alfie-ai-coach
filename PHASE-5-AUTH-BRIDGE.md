# Phase 5: Authentication Bridge Implementation

## Overview

Phase 5 implements seamless single sign-on (SSO) between the main English AIdol app and Earthworm. Users authenticate once and gain access to both systems without re-entering credentials.

## Implementation Details

### 1. New Hook: `useEarthwormAuth`

**Location**: `apps/main/src/hooks/useEarthwormAuth.ts`

Provides three main functions:

```typescript
// Generate token and navigate to Earthworm
navigateToEarthworm(): Promise<void>

// Check if user has valid session
hasEarthwormSession(): boolean

// Clear session when logging out
clearEarthwormSession(): void
```

**How it works**:
1. User clicks "Sentence Builder" in header
2. `navigateToEarthworm()` is called
3. If logged in, generates Supabase JWT token
4. Creates Earthworm session context
5. Stores token in sessionStorage (secure browser storage)
6. Redirects to `/earthworm`
7. Earthworm reads token from sessionStorage
8. Earthworm validates token via Edge Function
9. User gains access without re-login

### 2. Supabase Edge Function: `earthworm-auth-validate`

**Location**: `apps/main/supabase/functions/earthworm-auth-validate/index.ts`

**Purpose**: Validate Earthworm authentication tokens

**Endpoint**: `POST /functions/v1/earthworm-auth-validate`

**Request**:
```json
{
  "token": "eyJhbGc...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**:
```json
{
  "valid": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "expiresAt": 1697817600000
}
```

### 3. Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│            English AIdol Main App                       │
│                                                         │
│  User clicks "Sentence Builder"                         │
│              ↓                                           │
│  useEarthwormAuth.navigateToEarthworm()                │
│              ↓                                           │
│  Check if user logged in                               │
│              ├─ NO  → Redirect to /earthworm            │
│              └─ YES → Continue                          │
│              ↓                                           │
│  Generate Supabase JWT token                           │
│              ↓                                           │
│  Create Earthworm session context                      │
│  { userId, email, token }                             │
│              ↓                                           │
│  Store in sessionStorage                               │
│              ↓                                           │
│  Redirect to /earthworm                                │
└─────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│            Earthworm App                                │
│                                                         │
│  App loads at /earthworm                               │
│              ↓                                           │
│  Read token from sessionStorage                        │
│              ↓                                           │
│  POST to /functions/v1/earthworm-auth-validate        │
│  { token, userId }                                     │
│              ↓                                           │
│  Supabase validates user exists                        │
│              ↓                                           │
│  Return user info & expiry                             │
│              ↓                                           │
│  Create session in Earthworm                           │
│              ↓                                           │
│  User gains full access                                │
│  Progress tracked in Supabase                          │
└─────────────────────────────────────────────────────────┘
```

### 4. Security Considerations

**Token Storage**:
- Uses `sessionStorage` (cleared when browser tab closes)
- Not stored in localStorage (more secure)
- Only passed via `window.location.href` redirect

**Token Validation**:
- Earthworm validates via Supabase Edge Function
- Supabase uses service role to verify user exists
- Token includes expiry (1 hour)
- CORS headers configured

**Error Handling**:
- Missing token → Redirect to Earthworm login
- Invalid token → Earthworm shows login
- Fallback redirect if error → User can manually login

### 5. Integration in Header Component

**Already Implemented** in `apps/main/src/components/Header.tsx`:

```typescript
const handleEarthwormNavigation = () => {
  window.location.href = '/earthworm';  // ✅ Already done
};

// In button:
<Button 
  variant="outline" 
  onClick={handleEarthwormNavigation}
  className="gap-2"
>
  <BookOpen className="w-4 h-4" />
  {t('navigation.sentenceBuilder', { defaultValue: 'Sentence Builder' })}
</Button>
```

**To Use New Hook** (Optional Enhancement):

```typescript
import { useEarthwormAuth } from '@/hooks/useEarthwormAuth';

const Header = () => {
  const { navigateToEarthworm } = useEarthwormAuth();
  
  // In button:
  <Button onClick={navigateToEarthworm}>
    📚 Sentence Builder
  </Button>
};
```

### 6. Environment Variables Required

**In `apps/earthworm/.env`**:

```env
# Supabase configuration for token validation
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# Earthworm configuration
DATABASE_URL=postgres://user:password@localhost:5433/earthworm
REDIS_URL=redis://127.0.0.1:6379
API_BASE_URL=http://localhost:3001
```

**In `apps/main/.env`**:

```env
# Already configured in existing app
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Testing the Auth Bridge

### 1. Local Testing

```bash
# Terminal 1: Start Docker services
docker compose up -d

# Terminal 2: Install and run main app
cd apps/main
pnpm install
pnpm dev

# Terminal 3: Install and run Earthworm
cd apps/earthworm
pnpm install
pnpm dev

# Browser: Navigate to http://localhost:5173
```

### 2. Test Scenarios

**Scenario 1: Logged-in User**
1. Visit http://localhost:5173
2. Click "Sign Up" and create account
3. Verify logged in
4. Click "Sentence Builder"
5. Should redirect to /earthworm WITHOUT login screen
6. Verify user can see Earthworm content

**Scenario 2: Anonymous User**
1. Visit http://localhost:5173
2. DON'T log in
3. Click "Sentence Builder"
4. Should redirect to /earthworm WITH login screen
5. Can create Earthworm-specific account OR use Supabase login

**Scenario 3: Token Expiry**
1. Log in to main app
2. Wait 1+ hour
3. Click "Sentence Builder"
4. Token should be invalid
5. Should redirect to Earthworm login

### 3. Debugging

**Check sessionStorage**:
```javascript
// In browser console at /earthworm
console.log(sessionStorage.getItem('earthworm_auth'));
```

**Check token validation**:
```javascript
// Manual test in Supabase dashboard
// Call earthworm-auth-validate function with test token
```

## Deployment Checklist

- [ ] Supabase Edge Function deployed
- [ ] Environment variables configured
- [ ] Main app rebuilt with new hook
- [ ] Earthworm configured with Supabase URL
- [ ] CORS headers verified
- [ ] Token validation tested
- [ ] Fallback login works
- [ ] sessionStorage clearing on logout
- [ ] Production domain configured

## Troubleshooting

### "Token not found in sessionStorage"
- Check if redirect happened (check browser history)
- Verify token generation in useEarthwormAuth hook
- Check browser console for errors

### "Invalid user" error
- Verify Supabase service role key is correct
- Check user exists in Supabase
- Verify Edge Function has correct permissions

### Redirect loops
- Check if token validation is failing
- Verify Earthworm has CORS enabled
- Check if sessionStorage is being cleared

### Cross-origin errors
- Verify proxy configuration in vite.config.ts
- Check CORS headers in Edge Function
- Verify nginx.conf has correct headers

## Files Created/Modified

**Created**:
- `apps/main/src/hooks/useEarthwormAuth.ts` - New auth hook
- `apps/main/supabase/functions/earthworm-auth-validate/index.ts` - Edge Function

**Modified**:
- `apps/main/src/components/Header.tsx` - Already has button (just use hook)
- `apps/main/public/locales/*.json` - Already updated with translations

## Next Steps

1. **Phase 6**: Comprehensive testing and QA
2. **Phase 7**: Production deployment and monitoring

---

**Phase 5 Status**: ✅ IMPLEMENTATION PROVIDED
**Ready to Test**: Yes, with Docker
**Code Changes**: Minimal (new files, no breaking changes)
