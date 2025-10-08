# Cloudflare R2 Migration Plan

## Current Egress Sources (37GB+)
1. **audio-files bucket** - Pronunciation, speaking, admin uploads
2. **listening-audio bucket** - Listening test audio files  
3. **avatars bucket** - Profile photos

## Migration Steps

### 1. Set up Cloudflare R2
- Create R2 bucket for audio files
- Configure CORS for web access
- Set up public access

### 2. Update Code References
Replace all `supabase.storage.from('bucket-name')` calls with Cloudflare R2 URLs:

**Files to update:**
- `src/pages/ListeningQuiz.tsx`
- `src/pages/AdminListeningForDetailsTestDetail.tsx` 
- `src/components/ListeningQuizPreview.tsx`
- `src/pages/IELTSSpeakingTest.tsx`
- `src/components/PronunciationPracticeItem.tsx`
- `src/pages/AdminPronunciationTestDetail.tsx`
- `src/hooks/useAdminContent.ts`
- `src/pages/AdminListening.tsx`
- `src/pages/AdminIELTSWritingTest.tsx`

### 3. Upload Existing Files
- Migrate existing audio files from Supabase to R2
- Update database URLs to point to R2
- Test all audio functionality

### 4. Remove Supabase Storage
- Delete storage buckets after migration
- Remove storage policies
- Clean up unused code

## Expected Savings
- **Current egress**: 37GB+ (744% over limit)
- **After migration**: ~0GB egress from storage
- **Cost savings**: $100s per month
