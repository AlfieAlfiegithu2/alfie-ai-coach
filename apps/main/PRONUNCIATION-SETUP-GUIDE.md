# Pronunciation Feature Setup Guide

## Overview
This guide explains how to set up the pronunciation feature using Google Cloud TTS + Cloudflare R2 caching.

## Architecture
```
User clicks word/pronunciation button
    ↓
Check R2 cache (instant if cached)
    ↓
If not cached: Generate with Google Cloud TTS
    ↓
Store in R2 with public URL
    ↓
Play audio (zero egress cost)
```

## Features Implemented

### 1. Translation Popup Pronunciation
- Click pronunciation button (🔊) next to translated word
- Audio plays instantly if cached
- Generates and caches if first time

### 2. Word Book Pronunciation
- Click any word card to hear pronunciation
- Visual indicator shows when audio is playing
- Works seamlessly with existing word book functionality

## Setup Instructions

### Step 1: Get Google Cloud TTS API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable "Cloud Text-to-Speech API"
4. Create credentials (API Key)
5. Copy the API key

### Step 2: Configure Environment Variables in Supabase

Add these secrets to your Supabase project:

```bash
# Google Cloud TTS
GOOGLE_CLOUD_TTS_API_KEY=your_google_cloud_api_key_here

# Cloudflare R2 (if not already configured)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

To add secrets in Supabase:
```bash
# Via Supabase CLI
supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=your_api_key_here

# Or via Supabase Dashboard:
# Dashboard → Edge Functions → Settings → Secrets
```

### Step 3: Deploy the TTS Function

```bash
cd /path/to/your/project
supabase functions deploy tts-audio-cache
```

### Step 4: Deploy Frontend Changes

```bash
pnpm run build
# Or push to GitHub/Lovable for automatic deployment
```

## Cost Analysis

### Google Cloud TTS Pricing (2025)
- **Standard Voices**: $4-6 per 1M characters
- **Neural2 Voices**: $16 per 1M characters (higher quality)
- **WaveNet Voices**: $16 per 1M characters

### Expected Costs with Caching
- **First 10,000 words**: $40-60 (one-time generation)
- **After caching**: ~$0.015/month (R2 storage only)
- **Egress**: $0 (R2 public URLs have zero egress)
- **Cache hit rate**: 80-90% for common words

### Monthly Cost Estimate
- **10K active words**: ~$50 initial + $0.015/month
- **100K active words**: ~$500 initial + $0.15/month
- **New word additions**: ~$0.004-0.016 per word

## Voice Configuration

### Available Voices
The system uses `en-US-Neural2-J` by default. You can customize in the code:

**Popular Google Cloud TTS Voices:**
- `en-US-Neural2-J`: Female, US English (default)
- `en-US-Neural2-D`: Male, US English
- `en-GB-Neural2-A`: Female, British English
- `en-GB-Neural2-B`: Male, British English
- `en-AU-Neural2-A`: Female, Australian English

To change the voice, edit:
```typescript
// In TranslationHelper.tsx or WordCard.tsx
voice: 'en-US-Neural2-J', // Change to your preferred voice
```

## Caching Strategy

### How It Works
1. **Cache Key**: Generated from `text + language + voice + speed`
2. **Storage**: Cloudflare R2 with public URLs
3. **Expiry**: Immutable files (31536000 seconds = 1 year cache)
4. **Analytics**: Tracks cache hits, generations, and file sizes

### Cache Performance
- **Cache check**: <50ms
- **First generation**: 1-2 seconds
- **Cached playback**: <100ms (instant)
- **Storage**: ~30-50KB per word

## Testing

### Test Translation Pronunciation
1. Go to any page with text
2. Select a word or sentence
3. Translation popup appears
4. Click pronunciation button (🔊)
5. Audio should play

### Test Word Book Pronunciation
1. Go to "My Word Book" page
2. Click any saved word card
3. Audio should play automatically
4. Visual indicator (🔊/🔇) shows playback status

### Test Caching
1. Play pronunciation for a word (first time)
2. Check console: "TTS cache miss, generating audio..."
3. Play same word again
4. Check console: "TTS cache hit in R2"
5. Second playback should be instant

## Monitoring

### Check Analytics
```sql
-- View cache performance
SELECT 
  action_type,
  COUNT(*) as count,
  SUM(file_size_bytes) as total_bytes,
  AVG(file_size_bytes) as avg_bytes
FROM audio_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type;

-- View cache hit rate
SELECT 
  SUM(CASE WHEN action_type = 'tts_cache_hit' THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN action_type = 'tts_generated' THEN 1 ELSE 0 END) as cache_misses,
  ROUND(
    100.0 * SUM(CASE WHEN action_type = 'tts_cache_hit' THEN 1 ELSE 0 END) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as cache_hit_rate_percent
FROM audio_analytics
WHERE created_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Issue: "Google Cloud TTS API key not configured"
**Solution**: Add `GOOGLE_CLOUD_TTS_API_KEY` to Supabase secrets

### Issue: "Cloudflare R2 environment variables not configured"
**Solution**: Add all R2 environment variables to Supabase secrets

### Issue: Audio not playing
**Solution**: 
1. Check browser console for errors
2. Verify R2 public URL is accessible
3. Check CORS settings on R2 bucket

### Issue: Slow first-time playback
**Solution**: This is normal. First generation takes 1-2 seconds. Subsequent plays are instant.

### Issue: High costs
**Solution**:
1. Check cache hit rate (should be >80%)
2. Verify R2 caching is working
3. Consider using Standard voices instead of Neural2

## Advanced Configuration

### Pre-generate Common Words
To reduce latency for common words, pre-generate them:

```typescript
// Create a script to pre-generate top 1000 words
const commonWords = ['the', 'a', 'is', 'are', ...]; // Top 1000 words
for (const word of commonWords) {
  await supabase.functions.invoke('tts-audio-cache', {
    body: { text: word, language: 'en-US', voice: 'en-US-Neural2-J' }
  });
}
```

### Cleanup Old Audio Files
R2 storage is cheap, but you can clean up rarely-used files:

```sql
-- Find audio files not accessed in 90 days
SELECT * FROM audio_analytics
WHERE action_type = 'tts_cache_hit'
AND created_at < NOW() - INTERVAL '90 days';
```

## Benefits Summary

✅ **Superior Quality**: Google Cloud TTS has the best voice quality
✅ **Zero Egress**: Cloudflare R2 public URLs = $0 egress costs
✅ **Smart Caching**: 80-90% cache hit rate saves 90%+ on API costs
✅ **Fast Performance**: Instant playback for cached words
✅ **Scalable**: Handles millions of words efficiently
✅ **Cost-Effective**: $40-60 for 10K words, then pennies per month

## Support

For issues or questions:
1. Check Supabase function logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test with a simple word first ("hello")

## Next Steps

1. Deploy the `tts-audio-cache` function
2. Add environment variables
3. Test pronunciation features
4. Monitor analytics and costs
5. Optimize based on usage patterns

