# Complete Guide: Google Cloud TTS Setup (Step-by-Step)

## Overview
- **Goal:** Switch from ElevenLabs to Google Cloud TTS
- **Cost Savings:** 99% reduction ($1.32/hr → $0.003/hr)
- **Time Required:** ~30 minutes total
- **Difficulty:** Easy (just follow these steps)

---

# PART 1: Create Google Cloud Project (10 minutes)

## Step 1: Go to Google Cloud Console
1. Open https://console.cloud.google.com
2. Sign in with your Google account (can be same as Gmail)
3. You'll see the Google Cloud Dashboard

## Step 2: Create a New Project
1. At the top, click the project dropdown (currently says "Select a Project")
2. Click "NEW PROJECT" button
3. Fill in:
   - **Project name:** `english-ai-coach-tts` (or any name)
   - Leave other fields as default
4. Click "CREATE"
5. Wait ~30 seconds for project creation

## Step 3: Enable the Text-to-Speech API
1. In the search bar at the top, type: `text-to-speech`
2. Click "Cloud Text-to-Speech API" from results
3. Click the blue "ENABLE" button
4. Wait for it to process (page will refresh)
5. You should see "API enabled"

---

# PART 2: Create a Service Account (10 minutes)

## Step 4: Go to Service Accounts
1. In the search bar, type: `service accounts`
2. Click "Service Accounts" from results
3. You'll see a list (probably empty)

## Step 5: Create Service Account
1. Click "CREATE SERVICE ACCOUNT" button at the top
2. Fill in the form:
   - **Service account name:** `text-to-speech-api` (or similar)
   - **Service account ID:** Will auto-fill
   - **Description:** `For English AI Coach TTS` (optional)
3. Click "CREATE AND CONTINUE"

## Step 6: Grant TTS Permissions
1. On "Grant this service account access to project" page:
2. Click on "Select a role" dropdown
3. Search for: `text to speech`
4. Select: "Cloud Text-to-Speech Client"
5. Click "CONTINUE"
6. Click "DONE"
7. You're back at Service Accounts list

---

# PART 3: Create API Key (10 minutes)

## Step 7: Find Your Service Account
1. You should see your new service account in the list
2. Click on it (the name you created)
3. You'll see the service account details page

## Step 8: Create JSON Key
1. Click the "KEYS" tab at the top
2. Click "ADD KEY" dropdown
3. Select "Create new key"
4. Choose format: **JSON** (should be default)
5. Click "CREATE"
6. A JSON file will download to your computer
   - **SAVE THIS FILE - YOU NEED IT!**
   - Filename looks like: `english-ai-coach-tts-[random].json`

## Step 9: View the Private Key
The JSON file contains your private key. You need the `private_key` field.

### Option A: Extract from JSON file (RECOMMENDED)
1. Open the downloaded JSON file in a text editor
2. Find the line starting with: `"private_key": "-----BEGIN PRIVATE KEY-----`
3. The key looks like:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
(many lines of text)
-----END PRIVATE KEY-----
```
4. **Copy the ENTIRE key including BEGIN and END lines**
5. Keep this open - you'll paste it in the next step

### Option B: Use the entire JSON file
You can also use the entire JSON file contents as the API key.

---

# PART 4: Add to Supabase (5 minutes)

## Step 10: Set Environment Variable in Supabase
1. Open terminal/command prompt
2. Navigate to your project:
```bash
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1
```

3. Run this command to set the API key:

### If using the private_key from JSON:
```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
(paste the entire key)
-----END PRIVATE KEY-----"
```

### If using the entire JSON file:
```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="$(cat /path/to/downloaded/json/file.json | tr '\n' ' ')"
```

**EASIER OPTION (Recommended):**
Just copy-paste the private_key value between the quotes. Replace everything between the quotes with your key.

## Step 11: Verify It Was Set
```bash
npx supabase secrets list | grep GOOGLE
```
You should see: `GOOGLE_CLOUD_TTS_API_KEY` listed with a hash value

---

# PART 5: Deploy & Test (5 minutes)

## Step 12: Redeploy the audio-cache Function
```bash
npx supabase functions deploy audio-cache
```

Wait for it to complete. You should see:
```
Deployed Functions on project [project-id]: audio-cache
```

## Step 13: Test Google Cloud TTS
Run this test command:

```bash
curl -X POST "https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/audio-cache" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI" \
  -d '{
    "text": "Hello this is Google Cloud Text to Speech. It is much cheaper than ElevenLabs.",
    "provider": "auto"
  }' | grep provider
```

### Expected output:
```
"provider":"google"
```

✅ **If you see `"provider":"google"` - IT WORKS!**

---

# COMPLETE CHECKLIST

## Before Starting
- [ ] Google account available
- [ ] Internet connection
- [ ] Text editor to view JSON file
- [ ] Terminal/command prompt access

## Steps 1-3: Google Cloud Project
- [ ] Created Google Cloud account/project
- [ ] Created new project named "english-ai-coach-tts"
- [ ] Enabled Cloud Text-to-Speech API
- [ ] API shows as "Enabled"

## Steps 4-6: Service Account
- [ ] Created service account "text-to-speech-api"
- [ ] Granted "Cloud Text-to-Speech Client" role
- [ ] Service account visible in service accounts list

## Steps 7-9: API Key
- [ ] Downloaded JSON key file
- [ ] Saved JSON file to safe location
- [ ] Extracted private_key from JSON
- [ ] Copied entire private key including BEGIN/END

## Steps 10-11: Supabase
- [ ] Ran `npx supabase secrets set` command
- [ ] Pasted private key correctly
- [ ] Verified with `npx supabase secrets list`
- [ ] GOOGLE_CLOUD_TTS_API_KEY appears in list

## Steps 12-13: Deploy & Test
- [ ] Ran `npx supabase functions deploy audio-cache`
- [ ] Deployment completed successfully
- [ ] Tested with curl command
- [ ] Got `"provider":"google"` in response
- [ ] ✅ **SUCCESS!**

---

# What Happens After Setup

## Automatic Provider Selection
```
Request for voice audio
    ↓
Is GOOGLE_CLOUD_TTS_API_KEY set? YES ✅
    ↓
Use Google Cloud TTS
    ↓
Generate audio using Google API
    ↓
Cost: $4 per 1M characters (~$0.0003 per message)
    ↓
Return audio to frontend
```

## Old vs New Costs

### Before (ElevenLabs)
- Per message: ~$0.01-0.05
- Per hour: ~$1.32
- Annual (100 students, 5 hrs/week): ~$137,280

### After (Google Cloud TTS)
- Per message: ~$0.0003-0.001
- Per hour: ~$0.003
- Annual (100 students, 5 hrs/week): ~$350

**SAVINGS: ~$137,000 per year** 💰

---

# Troubleshooting

## "Command not found: npx"
- Make sure you're in the correct directory
- Try: `which npx`
- If not found, install Node.js from nodejs.org

## "permission denied" on JSON file
- The JSON file needs to be readable
- Try: `chmod 644 /path/to/file.json`

## Test returns "provider":"elevenlabs"
- Google Cloud key didn't set correctly
- Run: `npx supabase secrets list` and verify it's there
- Check that you copied the entire key with BEGIN/END lines

## Test returns "Internal Server Error"
- Check your private key has proper formatting
- Make sure no extra quotes or characters
- Try deploying again: `npx supabase functions deploy audio-cache`

## Still getting errors?
- Verify the JSON file downloaded correctly
- Re-read Step 9 carefully
- Make sure you're using the private_key value (not the whole JSON)
- Contact support with the error message

---

# After Complete Setup

## Verify in Production
1. Open SpeakingTutor in your browser
2. Start a conversation
3. Listen to the AI voice
4. It will use Google Cloud TTS
5. Quality remains excellent
6. Cost drops 99%

## Monitor Costs
1. Go to Google Cloud Console
2. Navigate to "Billing"
3. You can see daily/monthly costs
4. Expected: $0.001-0.003 per day for typical usage

## Keep ElevenLabs as Backup
- ELEVENLABS_API_KEY is still configured
- If Google Cloud fails, system automatically uses ElevenLabs
- You have automatic fallback protection

---

# Summary

| Step | Task | Time | Status |
|------|------|------|--------|
| 1-3 | Create Google Cloud Project | 10 min | ⏳ |
| 4-6 | Create Service Account | 10 min | ⏳ |
| 7-9 | Get API Key | 10 min | ⏳ |
| 10-11 | Add to Supabase | 5 min | ⏳ |
| 12-13 | Deploy & Test | 5 min | ⏳ |
| **Total** | **Complete Setup** | **~40 min** | ⏳ |

---

# Next Steps After Completing

1. ✅ Production usage with Google Cloud TTS
2. ✅ Monitor costs on Google Cloud Console
3. ✅ All voice features working
4. ✅ 99% cost reduction achieved

**You're done!** 🎉

