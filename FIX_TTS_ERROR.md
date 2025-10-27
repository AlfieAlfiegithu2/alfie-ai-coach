# TTS 500 Error - Root Cause & Fix

## 🔴 The Error

```
POST /functions-v1/functions-net/ERR_ABORTED 500 (Internal Server Error)
TTS failed, starting listening anyway
```

## 🔍 Root Cause Analysis

The error occurs when calling the `google-tts-speech` edge function. The function is failing with a 500 error because:

**PRIMARY CAUSE:** `GOOGLE_CLOUD_API_KEY` is not configured in Supabase Edge Function secrets.

The function checks for this key:
```typescript
const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
if (!GOOGLE_CLOUD_API_KEY) {
  return { error: "GOOGLE_CLOUD_API_KEY not configured" };
}
```

## ✅ Solutions

### Option 1: Set Environment Variable in Supabase (RECOMMENDED)

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add these secrets:
   ```
   GOOGLE_CLOUD_API_KEY = (your Google Cloud API key)
   GEMINI_API_KEY = (your Gemini API key)
   ```
4. Restart your dev server or redeploy functions

### Option 2: Test API Keys Locally

```bash
# Set env vars locally
export GOOGLE_CLOUD_API_KEY="your-key-here"
export GEMINI_API_KEY="your-key-here"

# Run locally
npx supabase functions serve
```

### Option 3: Verify Google Cloud Setup

1. Go to **Google Cloud Console**
2. Enable these APIs:
   - ✅ Text-to-Speech API
   - ✅ Speech-to-Text API
3. Create API key with these permissions
4. Copy key and add to Supabase secrets

## 📋 Environment Variables Needed

```
GOOGLE_CLOUD_API_KEY    # For TTS and Speech-to-Text
GEMINI_API_KEY          # For coaching and pronunciation analysis
SUPABASE_URL            # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  # For logging sessions
```

## 🧪 How to Verify

1. After setting secrets, go to `/ai-speaking`
2. Click "Start Call"
3. Check debug logs for:
   ```
   ✅ GOOGLE_CLOUD_API_KEY found
   📝 Converting text to speech...
   📡 Google TTS API response: 200
   ✅ Audio generated successfully
   ```

## 🚀 Alternative: Use Browser Speech API Only (Fallback)

If you don't have Google Cloud setup yet, you can modify `AISpeakingCall.tsx` to:
1. Skip the TTS greeting (use Web Speech API text-to-speech instead)
2. Still capture student speech with Web Speech API
3. Use Gemini for coaching analysis
4. Add TTS later when Google Cloud is configured

This would reduce features but the core calling would still work.

## 📊 API Key Locations

**Google Cloud API Key:**
- Go to: https://console.cloud.google.com/
- APIs & Services → Credentials
- Create new API key
- Enable Text-to-Speech and Speech-to-Text APIs

**Gemini API Key:**
- Go to: https://ai.google.dev/
- Get API Key from dashboard
- No billing needed for free tier

## 💡 Quick Checklist

- [ ] I have a Google Cloud API key
- [ ] I have a Gemini API key
- [ ] Both keys are added to Supabase Edge Function Secrets
- [ ] I restarted my dev server
- [ ] Debug logs show "✅ GOOGLE_CLOUD_API_KEY found"
- [ ] TTS greeting plays successfully
- [ ] AI responds after I speak

---

**Status:** Once secrets are set, the TTS error will be fixed! 🎉
