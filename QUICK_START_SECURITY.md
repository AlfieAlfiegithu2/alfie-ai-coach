# ⚡ Quick Start Security

## 📋 What is JWT?

```
┌─────────────────────────────────────────┐
│          USER LOGS IN                   │
│     (email + password)                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     SERVER VERIFIES PASSWORD            │
│     "Yes, that's really Sarah!"         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     CREATE JWT TOKEN                    │
│  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ  │
│   9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFt  │
│   ZSI6IlNhcmFoIiwiaWF0IjoxNTE2MjM5MDI  │
│   yfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6  │
│   yJV_adQssw5c"                         │
│                                         │
│ This token = ID card for Sarah          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     SEND TO USER'S BROWSER              │
│     Browser stores it (like a ticket)   │
└─────────────────────────────────────────┘


┌─────────────────────────────────────────┐
│   USER CALLS API WITH TOKEN             │
│   Header: "Authorization: Bearer TOKEN" │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    API RECEIVES REQUEST                 │
│    "Who are you?"                       │
│    Shows JWT token                      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   API VERIFIES TOKEN                    │
│   ✓ Signature valid (not faked)         │
│   ✓ Not expired                         │
│   ✓ User ID matches                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   ✅ REQUEST ALLOWED!                   │
│   Process API call normally             │
└─────────────────────────────────────────┘


┌─────────────────────────────────────────┐
│   ATTACKER TRIES TO CALL API            │
│   No token sent                         │
│   (Or fake token)                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   API CHECKS TOKEN                      │
│   ❌ No token OR invalid                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   🛑 REQUEST BLOCKED!                   │
│   Response: 401 Unauthorized            │
│   "Who are you? I need a valid token"   │
└─────────────────────────────────────────┘
```

---

## 📊 Rate Limiting Explained

```
FREE USER (100 calls/day limit)
Day: Oct 23, 2025

Call 1  ✅ (99 remaining)
Call 2  ✅ (98 remaining)
Call 3  ✅ (97 remaining)
...
Call 97  ✅ (3 remaining)
Call 98  ✅ (2 remaining)
Call 99  ✅ (1 remaining)
Call 100 ✅ (0 remaining)
Call 101 🛑 "You've used your daily quota!"

Resets at: Oct 24, 2025 00:00 UTC


ATTACKER (trying to abuse)
Sends 10,000 requests in 30 seconds

Request 1    ✅ (99 remaining)
Request 2    ✅ (98 remaining)
...
Request 100  ✅ (0 remaining)
Request 101  🛑 BLOCKED
Request 102  🛑 BLOCKED
Request 103  🛑 BLOCKED
... (all remaining blocked)

Result: Attacker blocked after 2 seconds
Your cost: ~$0.01 instead of $50
```

---

## 🔧 How to Deploy

### Step 1: Create Database Table (5 min)
```
1. Open: https://supabase.com/dashboard
2. Click: SQL Editor
3. Click: New Query
4. Paste: (contents of supabase/migrations/20251024_add_api_quotas.sql)
5. Click: Run
6. See: ✓ Success
```

### Step 2: Update Your Domain (2 min)
```
Edit: supabase/functions/rate-limiter-utils.ts
Find: Line ~178 (const allowedOrigins)
Replace:
  "https://yourdomain.com"
  "https://www.yourdomain.com"
With YOUR actual domain
```

### Step 3: Deploy (Automatic)
- Supabase auto-deploys when you edit files
- No manual deploy needed
- Takes ~30 seconds

### Step 4: Test (5 min)
```bash
# Test 1: Should fail (no auth)
curl https://yourdomain.com/api/writing-feedback \
  -d '{"writing":"test"}'
# Response: 401 Unauthorized ✅

# Test 2: Should work (with auth)
curl https://yourdomain.com/api/writing-feedback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"writing":"This is a test essay for review."}'
# Response: 200 OK with feedback ✅
```

---

## 🛡️ What Each Layer Protects

```
┌────────────────────────────────────────────────────────────┐
│                    ATTACKER TYPES                          │
├────────────────────────────────────────────────────────────┤
│ ❌ No Authentication Block:                                │
│    ↓                                                       │
│    Anonymous attacker → ✅ Passes through                 │
│    (Should be blocked)                                     │
└──────────────┬───────────────────────────────────────────┘
               │
    ✅ ADD JWT VERIFICATION
               │
┌──────────────▼───────────────────────────────────────────┐
│ ✅ JWT Verification Layer:                                │
│    ↓                                                       │
│    No token? → 🛑 BLOCKED (401)                           │
│    Fake token? → 🛑 BLOCKED (401)                         │
│    Expired token? → 🛑 BLOCKED (401)                      │
│    Valid token? → ✅ Continue                             │
└──────────────┬───────────────────────────────────────────┘
               │
    ✅ ADD RATE LIMITING
               │
┌──────────────▼───────────────────────────────────────────┐
│ ✅ Rate Limiting Layer:                                   │
│    ↓                                                       │
│    < 100 calls/day? → ✅ Continue                         │
│    ≥ 100 calls/day? → 🛑 BLOCKED (429)                   │
│    < 20 calls/hour? → ✅ Continue                         │
│    ≥ 20 calls/hour? → 🛑 BLOCKED (429)                   │
└──────────────┬───────────────────────────────────────────┘
               │
    ✅ ADD INPUT VALIDATION
               │
┌──────────────▼───────────────────────────────────────────┐
│ ✅ Input Validation Layer:                                │
│    ↓                                                       │
│    < 50KB payload? → ✅ Continue                          │
│    ≥ 50KB payload? → 🛑 BLOCKED (400)                    │
└──────────────┬───────────────────────────────────────────┘
               │
    ✅ ADD CORS CHECK
               │
┌──────────────▼───────────────────────────────────────────┐
│ ✅ CORS Security Layer:                                   │
│    ↓                                                       │
│    From yourdomain.com? → ✅ Allow                        │
│    From evil.com? → 🛑 BLOCKED                           │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
            ✅ ALLOWED TO PROCESS
```

---

## 💰 Cost Comparison

### Scenario: Attacker tries 10,000 calls/day

**WITHOUT SECURITY** ❌
```
10,000 calls/day × $0.005/call = $50/day
$50/day × 30 days = $1,500/month

Your bill: 😭😭😭
```

**WITH SECURITY** ✅
```
Attacker hits rate limit after 100 calls
100 calls × $0.005/call = $0.50/day
$0.50/day × 30 days = $15/month

Your bill: 😊 (normal)
Savings: $1,485/month
```

---

## ✅ Deployment Checklist

```
PHASE 1: CRITICAL (Do today)
☐ Read this guide
☐ Run database migration
☐ Verify table was created
  → SELECT * FROM user_api_quotas LIMIT 1;
    Should see: (empty table, no error)

PHASE 2: ESSENTIAL (This week)
☐ Update CORS allowed origins
☐ Deploy updated rate-limiter-utils.ts
☐ Test: curl without auth → 401 Unauthorized
☐ Test: curl with auth → works normally

PHASE 3: RECOMMENDED (Within 2 weeks)
☐ Apply security to ielts-writing-examiner
☐ Apply security to translation-service
☐ Apply security to enhanced-speech-analysis
☐ Test all 3 endpoints

PHASE 4: OPTIONAL (Within 1 month)
☐ Sign up for Cloudflare
☐ Setup WAF rules
☐ Enable rate limiting at edge
☐ Setup monitoring alerts
```

---

## 🚨 Common Mistakes to Avoid

```
❌ DON'T
- Hardcode JWT tokens in frontend code
  → Anyone can see your code, they'll get your token

- Skip input validation
  → Attacker sends 1GB file = server crash

- Allow CORS from all origins (*)
  → Evil.com can now call your API!

- Trust client-side validation alone
  → Hackers bypass client-side checks


✅ DO
- Use Supabase auth system (handles tokens)
  → Automatic, secure, battle-tested

- Validate on server (both size + content)
  → Attackers can't bypass server-side checks

- Whitelist specific origins
  → Only your domains allowed

- Always verify on backend
  → Server is the source of truth
```

---

## 📞 Quick Support

**Q: Is my app still vulnerable?**
- A: For `writing-feedback`: NO ✅
- A: For other endpoints: YES ❌ (fix others this week)

**Q: Will existing users get kicked out?**
- A: NO ✅ They have valid JWT tokens

**Q: Can I test without deploying?**
- A: YES - test in dev mode with localhost

**Q: How do I know it's working?**
- A: Run test commands above, should see 401 for no auth

**Q: What if I need to change the 100 limit?**
- A: Edit `FREE_USER_CONFIG` in rate-limiter-utils.ts

---

## 🎯 You're Ready!

1. ✅ Understand JWT (digital ID cards for users)
2. ✅ Understand rate limiting (quota system)
3. ✅ Have code ready to deploy
4. ✅ Have documentation
5. ✅ Have templates for other endpoints

**Next:** Follow SECURITY_DEPLOYMENT_STEPS.md and you're done! 🚀

