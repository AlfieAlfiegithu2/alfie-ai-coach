# 🚀 Final Deployment Guide - AI Speaking Tutor

## ❌ Current Issues

1. **Voice hasn't changed to Orion:**
   - New `gemini-tts-speech` function created but NOT deployed
   - Returns 500 error
   
2. **AI doesn't respond:**
   - `gemini-ielts-coach` returns 500 error
   - GEMINI_API_KEY likely not in Supabase secrets
   - Even if set, dev server needs restart after adding secrets

---

## ✅ 3-Step Fix

### STEP 1: Deploy New Voice Function (2 minutes)

```bash
# In terminal, from project root:
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1

# Deploy the new Gemini TTS function
npx supabase functions deploy gemini-tts-speech
```

**What this does:**
- Deploys `apps/main/supabase/functions/gemini-tts-speech/index.ts` to Supabase
- Makes premium Orion voice available
- Function becomes accessible at `/functions/v1/gemini-tts-speech`

**Expected output:**
```
✓ Function deployed successfully
✓ gemini-tts-speech is live at v1
```

---

### STEP 2: Verify API Keys in Supabase (3 minutes)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project: "alfie-ai-coach-1"

2. **Navigate to Secrets:**
   - Settings → (scroll down) → Edge Functions → Secrets

3. **Verify these secrets exist:**
   - ✅ `GEMINI_API_KEY` = (your Google Gemini API key)
   - ✅ `GOOGLE_CLOUD_API_KEY` = (your Google Cloud API key)

4. **If either is missing:**
   - Click "New Secret"
   - Name: `GEMINI_API_KEY`
   - Value: (paste your Gemini API key)
   - Click Save
   
   - Repeat for `GOOGLE_CLOUD_API_KEY`

**Note:** Keys look like: `AIza...`

---

### STEP 3: Restart Dev Server (1 minute)

**In your terminal:**

```bash
# Stop current dev server
Ctrl+C

# Wait 2 seconds, then restart
npm run dev
```

**What happens:**
- Dev server restarts
- Picks up new environment variables from Supabase
- Connects to newly deployed `gemini-tts-speech` function
- Reconnects to `gemini-ielts-coach` with secrets

**Expected output:**
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 🧪 Test It

1. **Go to the app:**
   - http://localhost:5173/ai-speaking

2. **Click "Start Call"**

3. **Listen for the greeting:**
   - ✅ Should sound warm and natural (Orion voice)
   - ❌ If still robotic: Check function deployment
   
4. **Speak:** "hey can you hear me"

5. **Check console logs (bottom right):**
   - Should show:
   ```
   🔊 Playing greeting audio (Gemini 2.5 Pro TTS - Orion voice)...
   ✅ Final transcript: "hey can you hear me"
   🤔 Calling gemini-ielts-coach function...
   ✅ Coach response: "..."
   ```

---

## 🐛 Troubleshooting

### Issue: Still shows "Speech recognition error: no-speech"
**Solution:** 
- Check microphone is working in browser
- Try refreshing page
- Allow microphone permission again

### Issue: Still says "Coach response failed: 500"
**Solution:**
- Verify GEMINI_API_KEY is in Supabase secrets
- Make sure dev server was restarted AFTER adding secrets
- Check API key is valid (starts with `AIza`)

### Issue: Voice still sounds robotic
**Solution:**
- Verify `npx supabase functions deploy gemini-tts-speech` succeeded
- Check browser console (F12) for:
  ```
  🔊 Playing greeting audio (Gemini 2.5 Pro TTS - Orion voice)...
  ```
- If not showing, function deployment failed
- Try deploying again with: `npx supabase functions deploy gemini-tts-speech`

### Issue: Function deployment failed
**Solution:**
- Check you're in the right directory:
  ```bash
  cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1
  ```
- Check function file exists:
  ```bash
  ls apps/main/supabase/functions/gemini-tts-speech/index.ts
  ```
- If not found: The function wasn't created properly
- Check Supabase is linked:
  ```bash
  npx supabase status
  ```

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Ran `npx supabase functions deploy gemini-tts-speech`
- [ ] `GEMINI_API_KEY` is in Supabase secrets
- [ ] `GOOGLE_CLOUD_API_KEY` is in Supabase secrets
- [ ] Dev server was restarted after secrets were added
- [ ] Microphone permission is granted
- [ ] No console errors about 404 for `/functions/v1/gemini-tts-speech`

---

## 📊 Expected Results After Fix

### Greeting (should sound natural):
> *"Hello! I'm English Tutora, your IELTS Speaking coach. Let's practice together. What would you like to talk about today?"*
- ✨ Warm, welcoming tone (Orion voice)
- ✨ Natural intonation
- ✨ Professional but friendly

### Student input:
> "hey can you hear me"

### AI Response:
> "Great! I hear you clearly. Now, let's focus on your intonation. Try saying 'I really want to improve my English' - pay attention to the stress on each word."

### Pronunciation Score:
> 🎯 Pronunciation: "Clear delivery, work on word stress" (7/10)

---

## ✅ You're Done!

Once all steps complete, you'll have:
- ✅ Premium Orion voice (natural sounding)
- ✅ Functional AI coaching responses
- ✅ Real-time pronunciation feedback
- ✅ Simultaneous calling experience
- ✅ Full IELTS Speaking practice system

---

## 📞 If Still Having Issues

Check these files in browser console (F12):

1. **Network tab:**
   - Look for `/functions/v1/gemini-tts-speech` - should return 200
   - Look for `/functions/v1/gemini-ielts-coach` - should return 200

2. **Console tab:**
   - Search for "❌" errors
   - Should show clear error messages if something fails

3. **Debug logs in app:**
   - Bottom of AI Speaking Tutor page
   - Shows real-time status of each step

---

**Good luck! Your AI Speaking Tutor is almost there! 🚀**

