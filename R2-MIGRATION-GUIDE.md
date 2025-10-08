# 🚀 Complete R2 Migration Guide

## 🚨 IMMEDIATE ACTIONS (Do These First!)

### 1. Stop Egress Immediately
```sql
-- Run this in Supabase SQL Editor RIGHT NOW
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('audio-files', 'listening-audio', 'avatars');
```

### 2. Set Up Cloudflare R2
1. **Create R2 Bucket**: `alfie-ai-audio`
2. **Enable Public Access**
3. **Set up Custom Domain** (optional but recommended)
4. **Get R2 Credentials**:
   - Account ID
   - Access Key ID  
   - Secret Access Key

### 3. Configure Environment Variables
Add to your Supabase project settings:
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET=alfie-ai-audio
CLOUDFLARE_R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

## 📋 Migration Steps

### Step 1: Deploy R2 Functions
```bash
# Deploy the R2 functions to Supabase
supabase functions deploy r2-upload
supabase functions deploy r2-delete  
supabase functions deploy r2-list
supabase functions deploy migrate-to-r2
```

### Step 2: Test R2 Upload
```javascript
// Test the R2 upload function
const response = await fetch('/api/r2-upload', {
  method: 'POST',
  body: formData
});
```

### Step 3: Migrate Existing Files
```bash
# Run migration for each bucket
curl -X POST https://your-project.supabase.co/functions/v1/migrate-to-r2 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"bucketName": "audio-files", "dryRun": true}'

# When ready, run actual migration
curl -X POST https://your-project.supabase.co/functions/v1/migrate-to-r2 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"bucketName": "audio-files", "dryRun": false}'
```

### Step 4: Update Database URLs
After migration, update all database records to use R2 URLs:

```sql
-- Update listening audio URLs
UPDATE skill_practice_questions 
SET audio_url = 'https://your-bucket.your-domain.com/listening-audio/' || audio_url
WHERE audio_url IS NOT NULL AND audio_url NOT LIKE 'http%';

-- Update pronunciation URLs  
UPDATE pronunciation_practice_items
SET audio_url = 'https://your-bucket.your-domain.com/audio-files/' || audio_url
WHERE audio_url IS NOT NULL AND audio_url NOT LIKE 'http%';

-- Update speaking test URLs
UPDATE ielts_speaking_results
SET audio_url = 'https://your-bucket.your-domain.com/audio-files/' || audio_url
WHERE audio_url IS NOT NULL AND audio_url NOT LIKE 'http%';
```

### Step 5: Update Code References
Replace all hardcoded URLs in the code:

```typescript
// Replace this pattern everywhere:
`https://your-bucket.your-domain.com/${audio_url}`

// With your actual R2 domain:
`https://your-actual-r2-domain.com/${audio_url}`
```

### Step 6: Remove Supabase Storage
After successful migration:

```sql
-- Delete storage buckets (this will remove all files!)
DELETE FROM storage.buckets WHERE id IN ('audio-files', 'listening-audio', 'avatars');
```

## 🔧 Code Updates Made

### Files Updated:
- ✅ `src/pages/ListeningQuiz.tsx` - Audio URL generation
- ✅ `src/components/ListeningQuizPreview.tsx` - Audio source
- ✅ `src/pages/AdminListeningForDetailsTestDetail.tsx` - Upload/delete/list
- ✅ `src/components/PronunciationPracticeItem.tsx` - Upload
- ✅ `src/pages/IELTSSpeakingTest.tsx` - Upload
- ✅ `src/hooks/useAdminContent.ts` - Upload

### Files Created:
- ✅ `src/lib/cloudflare-r2.ts` - R2 utilities
- ✅ `supabase/functions/r2-upload/index.ts` - Upload function
- ✅ `supabase/functions/r2-delete/index.ts` - Delete function  
- ✅ `supabase/functions/r2-list/index.ts` - List function
- ✅ `supabase/functions/migrate-to-r2/index.ts` - Migration function

## 📊 Expected Results

### Before Migration:
- **Egress**: 37GB+ (744% over limit)
- **Cost**: $100s per month
- **Status**: ❌ Exceeded quota

### After Migration:
- **Egress**: ~0GB from storage
- **Cost**: $0 for storage egress
- **Status**: ✅ Within limits

## 🚨 Emergency Rollback

If something goes wrong:

```sql
-- Re-enable public access to Supabase buckets
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('audio-files', 'listening-audio', 'avatars');
```

## ✅ Verification Checklist

- [ ] R2 bucket created and configured
- [ ] Environment variables set in Supabase
- [ ] R2 functions deployed successfully
- [ ] Test upload works
- [ ] Existing files migrated
- [ ] Database URLs updated
- [ ] Code references updated
- [ ] Supabase storage disabled
- [ ] Egress reduced to near zero
- [ ] All audio functionality works

## 🎯 Next Steps

1. **Immediate**: Run the emergency SQL to stop egress
2. **Today**: Set up R2 and deploy functions
3. **This week**: Migrate files and update code
4. **Next week**: Remove Supabase storage entirely

This migration will save you $100s per month and eliminate the egress quota issues!
