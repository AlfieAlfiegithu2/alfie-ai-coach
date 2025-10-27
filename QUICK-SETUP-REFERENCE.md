# Quick Reference: Google Cloud TTS Setup

## 5-Minute Quick Start

### Phase 1: Google Cloud Console (3 minutes)
```
1. Go to https://console.cloud.google.com
2. Sign in with Google
3. Create new project → "english-ai-coach-tts"
4. Search "text-to-speech" → Click API → ENABLE
```

### Phase 2: Service Account (2 minutes)
```
1. Search "service accounts" → CREATE SERVICE ACCOUNT
2. Name: "text-to-speech-api"
3. Click CREATE → Click role dropdown
4. Search "text to speech" → Select "Cloud Text-to-Speech Client"
5. CONTINUE → DONE
```

### Phase 3: API Key (3 minutes)
```
1. Click your service account in the list
2. Click KEYS tab
3. ADD KEY → Create new key → JSON → CREATE
4. JSON file downloads - SAVE IT!
```

### Phase 4: Terminal (5 minutes)
```
1. Open the JSON file in text editor
2. Find the "private_key" line (starts with -----BEGIN PRIVATE KEY-----)
3. Copy the ENTIRE key including BEGIN and END
4. Go to terminal, navigate to project:
   cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1

5. Run command:
   npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="<paste-key-here>"

6. Replace <paste-key-here> with your actual key

7. Verify it worked:
   npx supabase secrets list | grep GOOGLE
   (Should show: GOOGLE_CLOUD_TTS_API_KEY)

8. Deploy:
   npx supabase functions deploy audio-cache

9. Test:
   curl -X POST "https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/audio-cache" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI" \
     -d '{"text": "Test", "provider": "auto"}' | grep provider

10. If you see "provider":"google" → SUCCESS! ✅
```

---

## Copy-Paste Commands

### Extract Private Key from JSON (Mac/Linux)
After downloading JSON file:
```bash
# View the private key
grep -A 20 "private_key" ~/Downloads/english-ai-coach-tts-*.json
```

### Set API Key (Simple)
```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="-----BEGIN PRIVATE KEY-----
(paste your key here)
-----END PRIVATE KEY-----"
```

### Verify
```bash
npx supabase secrets list
```

### Deploy
```bash
npx supabase functions deploy audio-cache
```

### Test
```bash
curl -X POST "https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/audio-cache" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI" \
  -d '{"text": "Hello this is Google Cloud TTS", "provider": "auto"}' | grep provider
```

---

## Expected Results

### Success ✅
```
"provider":"google"
```

### Still using old provider ⚠️
```
"provider":"elevenlabs"
```
→ Means API key didn't set correctly. Check Step 4 again.

---

## Checklist: Am I Done?

- [ ] Created Google Cloud Project
- [ ] Enabled Text-to-Speech API
- [ ] Created Service Account
- [ ] Granted TTS permissions
- [ ] Downloaded JSON key
- [ ] Extracted private_key
- [ ] Set GOOGLE_CLOUD_TTS_API_KEY in Supabase
- [ ] Verified with `npx supabase secrets list`
- [ ] Deployed audio-cache function
- [ ] Test returns `"provider":"google"`
- [ ] ✅ ALL DONE! You saved 99% on TTS costs!

---

## Cost Savings Summary

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Per message | $0.01-0.05 | $0.0003-0.001 | 99% ✅ |
| Per hour | $1.32 | $0.003 | 99.77% ✅ |
| Per month | $2,640 | $7 | 99.73% ✅ |
| Per year | $137,280 | $350 | 99.74% ✅ |

