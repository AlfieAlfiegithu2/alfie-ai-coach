# TTS Provider Configuration Status

## Current Setup

### Environment Variables Configured
```
ELEVENLABS_API_KEY    ✅ Configured
GOOGLE_CLOUD_TTS_API_KEY  ✅ Now Configured
AZURE_TTS_API_KEY     ❌ Not configured
```

### Provider Priority (Current)
```
1. Google Cloud TTS (if key is valid)
2. Azure TTS (if key is valid)
3. ElevenLabs (fallback)
```

## Issue Discovered

The Google API key (`AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E`) is designed for **Gemini models** (conversation), not for **Google Cloud TTS**.

- ✅ Works for: `gemini-2.5-flash`, `gemini-chat` functions
- ❌ Does NOT work for: Google Cloud Text-to-Speech API

### Why It's Failing

Google AI Studio API keys are restricted to Gemini models only. They don't have permissions for other Google Cloud services like TTS.

## Solutions

### Option A: Get a Google Cloud TTS Key (Recommended) ⭐
You need a **Google Cloud Service Account** key with TTS permissions:

1. Go to https://console.cloud.google.com
2. Create a new Google Cloud project
3. Enable "Cloud Text-to-Speech API"
4. Create a Service Account
5. Create a JSON key for the service account
6. Extract the `private_key` or use the entire JSON as the key
7. Set: `npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="<key>"`

**Cost:** $4 per 1M characters (VERY cheap!)

### Option B: Keep Using ElevenLabs for Now ✅ 
ElevenLabs is already configured and working:

1. Remove the Google Cloud TTS key (or leave it - will just skip)
2. Continue using ElevenLabs which is already set up
3. Audio-cache will automatically fallback to ElevenLabs

**Downside:** ~$1.32/hour of voice generation (expensive)

### Option C: Try Azure TTS
If you have an Azure account, set up Azure Cognitive Services:

1. Get Azure Text-to-Speech key
2. Set: `npx supabase secrets set AZURE_TTS_API_KEY="<key>"`
3. Cost: Usually competitive with Google Cloud

## Recommended Action

**For now: Use ElevenLabs (already working)**

The system will automatically use ElevenLabs since the Google Cloud TTS key isn't valid for TTS.

```
Request arrives for voice
    ↓
Try Google Cloud TTS? NO - key not authorized for TTS
    ↓
Try Azure TTS? NO - not configured
    ↓
Use ElevenLabs? YES ✅ - working and configured
    ↓
Audio generates with ElevenLabs ✅
```

## Next Steps

If you want to reduce costs from ElevenLabs:

1. **Get a Google Cloud Project TTS key** (free to set up)
2. Enable Cloud Text-to-Speech API
3. Create Service Account with TTS permissions
4. Set the key: `npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="<service-account-key>"`
5. Redeploy: `npx supabase functions deploy audio-cache`

This will drop your TTS costs from **$1.32/hour to $0.001-0.003/hour**!

## Current Status Summary

- ✅ Voice generation: **WORKING** (using ElevenLabs)
- ✅ Conversation AI: **WORKING** (using Gemini)
- ⚠️ Google Cloud TTS: Not available yet (key format incorrect)
- 📊 Cost: Currently ~$1.32/hour for TTS (can reduce to $0.003/hour with GCP)

## API Key Type Reference

### Gemini Models (Your Current Key) ✅
- Format: API key from Google AI Studio
- Works for: `gemini-2.5-flash`, `gemini-2.5-pro`, etc.
- Permissions: Gemini models ONLY
- Your key: `AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E` ✅

### Google Cloud TTS ❌ (Need Different Key)
- Format: Service Account JSON or private key
- Works for: Text-to-Speech API
- Permissions: TTS, Speech-to-Text, etc.
- Where to get: https://console.cloud.google.com (requires GCP project)

## Should You Switch to Google Cloud TTS?

| Factor | ElevenLabs | Google Cloud TTS |
|--------|-----------|-----------------|
| Quality | ⭐⭐⭐⭐⭐ (Excellent) | ⭐⭐⭐⭐ (Great) |
| Cost | ❌ High ($1.32/hr) | ✅ Very Low ($0.003/hr) |
| Setup | ✅ Already done | 🔄 Needs GCP project |
| Emotions | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| IELTS Clarity | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Verdict:** Google Cloud TTS is better for IELTS (clearer, cheaper), but requires setup.

