# 🔑 Complete Setup Guide - API Keys for AI Speaking Tutor

## 🎯 What You Need

The AI Speaking Tutor requires **2 API keys** to work fully:

| API | Purpose | Status | Cost |
|-----|---------|--------|------|
| **Google Cloud** | TTS (natural voice) + STT (speech recognition) | Required | ~$0.30/hour |
| **Gemini** | AI coaching responses + pronunciation analysis | Required | ~$0.05/hour |

---

## 📋 Current Issues

### ❌ Problem 1: TTS Voice is Robotic
**Fixed!** Changed from `Neural2-C` (basic) to `Neural2-F` (premium warm voice)
- More natural sounding
- Better intonation
- Slightly slower speaking rate (0.95) for clarity

### ❌ Problem 2: AI Doesn't Respond
**Cause:** `GEMINI_API_KEY` not configured in Supabase secrets
**Fix:** Follow steps below to set it up

---

## 🚀 Step-by-Step Setup

### STEP 1: Get Google Cloud API Key

#### 1a. Create Google Cloud Project
1. Go to: https://console.cloud.google.com/
2. Click project dropdown at top
3. Click "NEW PROJECT"
4. Name: "AI Speaking Tutor"
5. Click "CREATE"

#### 1b. Enable Required APIs
1. Go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Cloud Text-to-Speech API** ✅
   - **Cloud Speech-to-Text API** ✅
   - **Cloud Translation API** (optional)

#### 1c. Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the key (looks like: `AIza...`)
4. **SAVE THIS** - you'll need it in Step 3

---

### STEP 2: Get Gemini API Key

#### 2a. Get Free Gemini API Key
1. Go to: https://ai.google.dev/
2. Click "Get API Key" button
3. Choose or create Google Cloud project
4. API key will be generated
5. Copy the key (looks like: `AIza...`)
6. **SAVE THIS** - you'll need it in Step 3

**Note:** Free tier includes:
- 1,000 requests/month for free
- No billing required for testing
- Sufficient for development

---

### STEP 3: Add Keys to Supabase

#### 3a. Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: "alfie-ai-coach-1"
3. Navigate to: **Settings** → **Integrations** → **Edge Functions**

#### 3b. Add Secrets
1. Click "New Secret"
2. Add first secret:
   - **Name:** `GOOGLE_CLOUD_API_KEY`
   - **Value:** (paste key from Step 1c)
   - Click "Save"

3. Click "New Secret"
4. Add second secret:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** (paste key from Step 2a)
   - Click "Save"

**Result should look like:**
```
GOOGLE_CLOUD_API_KEY = AIza...
GEMINI_API_KEY = AIza...
```

---

### STEP 4: Restart Dev Server

#### Option A: Local Development
```bash
# Stop current server (Ctrl+C)
# Restart:
npm run dev
```

#### Option B: Supabase Functions Locally
```bash
npx supabase functions serve
```

---

### STEP 5: Test Everything

1. Go to: http://localhost:5173/ai-speaking
2. Click "Start Call"
3. Listen for greeting (should sound more natural now!)
4. After greeting, speak: *"hey I want to talk about how I can improve my English"*
5. Wait ~2-3 seconds for AI response
6. Check console for logs confirming:
   - ✅ GOOGLE_CLOUD_API_KEY found
   - ✅ GEMINI_API_KEY found
   - 🔄 Calling Gemini API for coaching response...
   - ✅ Coaching response received

---

## 🎤 What You'll Hear

### Before Setup (Current State)
- ❌ TTS voice sounds robotic
- ❌ AI doesn't respond (error: 500)

### After Setup
- ✅ Warm, natural female voice: "Hello! I'm English Tutora..."
- ✅ Real-time transcript of your speech
- ✅ AI responds with coaching: "Great! Work on your intonation..."
- ✅ Pronunciation score displayed

---

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY not configured"
**Solution:**
1. Verify key is added in Supabase Settings → Edge Functions → Secrets
2. Check spelling: exactly `GEMINI_API_KEY` (case-sensitive)
3. Restart dev server after adding secrets
4. Try again

### Issue: "Coach response failed: 500"
**Check:**
1. GEMINI_API_KEY is set in Supabase secrets ✅
2. API key is valid (starts with `AIza`) ✅
3. Dev server was restarted after setting secrets ✅
4. Check Supabase function logs for actual error

### Issue: Voice Still Sounds Robotic
**Solution:**
1. Verify file was updated to use `en-US-Neural2-F`
2. Restart dev server
3. Clear browser cache (Cmd+Shift+Delete)
4. Try again

### Issue: Speech Recognition Not Working
**Check:**
1. Microphone permission granted to browser
2. Try on Chrome/Edge first (best support)
3. Check browser console for errors
4. Speak clearly and not too quickly

---

## 💰 Cost Breakdown

### Actual Usage (Per Hour)
- **Google TTS:** ~$0.30/hour (based on ~12,000 chars/hour)
- **Gemini:** ~$0.05/hour (based on ~500 tokens/hour)
- **Web Speech API:** $0.00 (free, browser-based)
- **Total:** ~$0.35/hour

### Monthly Estimate (100 hours)
- Cost: ~$35/month
- Much cheaper than alternatives!

---

## 📊 Google Cloud Billing Setup (Optional)

If you want to avoid surprises, set up billing limits:

1. Go to "Billing" in Google Cloud console
2. Set monthly budget alert to $50
3. This ensures you don't overspend

**Free tier benefits:**
- $300 free credit (90 days)
- Good for development/testing
- Upgrade to pay-as-you-go when ready

---

## ✅ Verification Checklist

Before testing, make sure:

- [ ] Google Cloud project created
- [ ] Cloud Text-to-Speech API enabled
- [ ] Cloud Speech-to-Text API enabled
- [ ] Google Cloud API key generated
- [ ] Gemini API key generated
- [ ] Both keys added to Supabase secrets
- [ ] Dev server restarted
- [ ] Browser cache cleared
- [ ] Microphone permission granted

---

## 🎉 You're Ready!

Once all API keys are set up, you'll have a fully functional AI Speaking Tutor with:

✅ Natural sounding voice (Neural2-F)  
✅ Real-time speech recognition  
✅ AI coaching responses  
✅ Pronunciation analysis  
✅ Complete conversation flow  
✅ Cost-efficient (~$0.35/hour)  

---

## 📞 Support

**If something's not working:**
1. Check debug logs in the UI
2. Check browser console (F12)
3. Check Supabase function logs
4. Verify API keys are correctly added
5. Restart dev server and try again

---

**Good luck! Your AI Speaking Tutor is ready to help students practice IELTS Speaking! 🚀**

