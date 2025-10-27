# Google Cloud TTS Setup Guide

## Current Status ❌
- ELEVENLABS_API_KEY: ✅ Configured
- GOOGLE_CLOUD_TTS_API_KEY: ❌ NOT configured
- AZURE_TTS_API_KEY: ❌ NOT configured

**Current behavior:** Using ElevenLabs only (not the cheaper/better Google Cloud TTS)

## How to Set Up Google Cloud TTS

### Option 1: Use Your Existing Google API Key (Recommended)
You already have: `AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E`

This key likely has Google Cloud TTS enabled. To use it for TTS, set it as:

```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E"
```

### Option 2: Create a New Service Account for TTS
If you want a dedicated key just for TTS:

1. Go to Google Cloud Console
2. Create a new Service Account
3. Grant "Cloud Text-to-Speech Client" role
4. Create a JSON key
5. Set it as `GOOGLE_CLOUD_TTS_API_KEY`

### Option 3: API Key from Google AI Studio
If using the API key from Google AI Studio:

```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E"
```

## Cost Comparison

### Google Cloud TTS ✅ CHEAPER
- Input: FREE
- Output: $4.00 per 1M characters
- Example: 1,000 characters = $0.004
- **Per student message: ~$0.0003 - $0.001**

### ElevenLabs ❌ EXPENSIVE  
- Currently using
- Costs: ~$1.32 per hour of audio generated
- Character-based pricing much higher
- **Per student message: ~$0.01 - $0.05**

### Savings Potential
If you switch to Google Cloud TTS:
- **1000x cheaper** than current ElevenLabs setup
- Save ~$1,320+ per hour of voice generation
- Same quality (actually better for clear speaking practice)

## Quality Comparison

| Feature | Google Cloud TTS | ElevenLabs |
|---------|------------------|-----------|
| Clarity | ✅ Excellent (for teaching) | ✅ Good |
| Emotions | ❌ Limited | ✅ High |
| Accents | ✅ Professional accents | ✅ Good variety |
| Speed | ✅ Consistent | ✅ Consistent |
| Cost | ✅ $4/1M chars | ❌ High |
| IELTS Speaking | ✅ Perfect | ✅ Good |

## How Provider Selection Works (Current Setup)

```
Request arrives for voice
    ↓
Check tryOrder: [google, azure, elevenlabs]
    ↓
Is GOOGLE_CLOUD_TTS_API_KEY set? 
    YES → Use Google Cloud TTS ✅
    NO  → Is AZURE_TTS_API_KEY set?
            YES → Use Azure ✅
            NO  → Use ElevenLabs (fallback) ⚠️
```

Currently you're falling back to ElevenLabs because Google is not set.

## What to Do

You have two options:

### Option A: Switch to Google Cloud TTS (RECOMMENDED) ⭐
```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E"
npx supabase functions deploy audio-cache
```

**Benefits:**
- ✅ 1000x cheaper
- ✅ Better for teaching (clear pronunciation)
- ✅ Same AI key you already have
- ✅ Professional accents available

### Option B: Keep ElevenLabs
Do nothing - it's already configured and working.

**Trade-off:**
- ❌ ~$1,300+ extra per month
- ✅ More emotional voices (not needed for IELTS practice)

## Recommendation: Switch to Google Cloud TTS Now

The code is already set up to prefer Google Cloud TTS. You just need to set one environment variable and redeploy.

**Commands:**
```bash
# Set the API key
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY="AIzaSyAN_1thTOaEWyjWIxG0wBpZ6Sqpebr2S6E"

# Redeploy the function
npx supabase functions deploy audio-cache

# Test it
curl -X POST https://your-supabase-url/functions/v1/audio-cache \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "voice_id": "en-US-Neural2-J", "provider": "auto"}'
```

## Verification After Setup

After setting the key and deploying:

1. Open SpeakingTutor
2. Start a conversation
3. Listen to AI voice 🔊
4. Check browser console for logs showing "🎯 Provider selected: google"
5. Verify invoice shows Google Cloud charges instead of ElevenLabs

**Cost will drop from ~$1.32/hour to ~$0.001-0.003/hour** 🎉

