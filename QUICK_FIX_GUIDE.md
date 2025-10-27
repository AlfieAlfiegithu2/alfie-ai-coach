# ⚡ Quick Fix Guide - 2 Issues Resolved

## Issue 1: Robotic Voice ✅ FIXED

**Changed:** `Neural2-C` → `Neural2-F` (Premium warm voice)
- More natural sounding
- Same price as before!
- Slightly slower speaking rate (0.95 for clarity)

File: `apps/main/supabase/functions/google-tts-speech/index.ts`

---

## Issue 2: AI Doesn't Respond ✅ NEEDS API KEY

**Reason:** `GEMINI_API_KEY` not in Supabase secrets

**Fix:** Add these 2 keys to Supabase:

1. **GOOGLE_CLOUD_API_KEY**
   - Get from: https://console.cloud.google.com/
   - Enable: Text-to-Speech API, Speech-to-Text API
   - Create: API Key

2. **GEMINI_API_KEY**
   - Get from: https://ai.google.dev/
   - Click: "Get API Key"
   - Free: 1,000 requests/month

**How to add to Supabase:**
```
1. Go to Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. New Secret: GOOGLE_CLOUD_API_KEY = (paste key)
4. New Secret: GEMINI_API_KEY = (paste key)
5. Restart dev server (Ctrl+C, then npm run dev)
```

---

## Testing

```
1. Go to: http://localhost:5173/ai-speaking
2. Click "Start Call"
3. Hear warm natural greeting!
4. Speak: "I want to improve my English"
5. Get coaching response in 2-3 seconds
6. Pronunciation score displayed
```

---

**Need help?** See `SETUP_API_KEYS.md` for detailed instructions.

