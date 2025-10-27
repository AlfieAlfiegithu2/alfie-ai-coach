# Fix Cloudflare R2 Audio Access - Complete Guide

## Why Keep R2?
✅ **Cost Savings**: 10GB free/month + $0.015/GB after (vs Supabase $0.12/GB)
✅ **Your Choice**: You selected R2 for bandwidth efficiency
✅ **Scalable**: Better for high-volume audio serving

---

## Problems to Fix

### 1. Account ID Mismatch ❌
**Database has wrong account IDs:**
- Old/Wrong: `9c1c9b4e737b4f39253c796e831c5f0a`
- Current: `9c1c9b4e737b4f39253c796e831e8382`

### 2. CORS Not Configured ❌
**R2 bucket blocks browser access**
- Browsers get 403 Forbidden or timeout
- Need to enable CORS in Cloudflare settings

### 3. Public Domain Not Set Up ❌
**r2.dev domain not working**
- Files uploaded but can't access via public URL
- Need Cloudflare custom domain or proper r2.dev configuration

---

## Step-by-Step Fix

### STEP 1: Fix Database URLs
Update all old URLs from wrong account ID to correct one:

```sql
-- Replace old account ID with new one
UPDATE speaking_prompts
SET audio_url = REPLACE(
  audio_url,
  'alfie-ai-audio.9c1c9b4e737b4f39253c796e831c5f0a.r2.dev',
  'alfie-ai-audio.9c1c9b4e737b4f39253c796e831e8382.r2.dev'
)
WHERE audio_url LIKE '%9c1c9b4e737b4f39253c796e831c5f0a%';

-- Also fix placeholder URLs
UPDATE speaking_prompts
SET audio_url = REPLACE(
  audio_url,
  'https://your-bucket.your-domain.com/',
  'https://alfie-ai-audio.9c1c9b4e737b4f39253c796e831e8382.r2.dev/'
)
WHERE audio_url LIKE '%your-bucket.your-domain.com%';
```

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Run it

---

### STEP 2: Configure CORS in Cloudflare

**In Cloudflare Dashboard:**

1. Navigate to **R2 → alfie-ai-audio bucket**
2. Click **Settings**
3. Find **CORS Rules** section
4. Add new CORS rule:

```json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://englishaidol.com",
    "https://*.englishaidol.com"
  ],
  "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag", "x-amz-version-id"],
  "MaxAgeSeconds": 3000
}
```

5. Click **Save**

---

### STEP 3: Ensure Public Access

**Option A: Use Public R2.dev Domain (Easiest)**

1. Cloudflare Dashboard → R2 → Settings
2. Look for **Public R2.dev URL**
3. Should be: `https://alfie-ai-audio.9c1c9b4e737b4f39253c796e831e8382.r2.dev`
4. Verify `r2-upload` function uses this domain in responses

**Option B: Custom Domain (Better)**

1. In Cloudflare Dashboard → R2 → Settings
2. Add custom domain: `assets.englishaidol.com` (or similar)
3. Update environment variable `CLOUDFLARE_R2_PUBLIC_URL`
4. Redeploy `r2-upload` function

---

### STEP 4: Verify Environment Variables

Check that Supabase has correct values:

```bash
# Run this to verify
npx supabase secrets list | grep CLOUDFLARE
```

Should show:
```
CLOUDFLARE_ACCOUNT_ID           ✓ Set
CLOUDFLARE_R2_ACCESS_KEY_ID     ✓ Set
CLOUDFLARE_R2_SECRET_ACCESS_KEY ✓ Set
CLOUDFLARE_R2_BUCKET_NAME       ✓ Set (alfie-ai-audio)
CLOUDFLARE_R2_PUBLIC_URL        ✓ Set (https://alfie-ai-audio.9c1c9b4e737b4f39253c796e831e8382.r2.dev)
```

If any are missing or wrong, update them:
```bash
npx supabase secrets set CLOUDFLARE_R2_PUBLIC_URL https://alfie-ai-audio.9c1c9b4e737b4f39253c796e831e8382.r2.dev
npx supabase functions deploy r2-upload
```

---

### STEP 5: Test Upload

1. **Clear browser cache** (Important!)
   - DevTools → Application → Clear site data
   - Or use incognito window

2. **Upload new audio** in admin speaking section

3. **Check browser console:**
   - Should see: `✅ Audio uploaded successfully: https://alfie-ai-audio.9c1c9b4e737b4f39253c796e831e8382.r2.dev/admin/speaking/...`

4. **Click play button:**
   - Should play with NO errors
   - No 403/404/timeout errors

5. **Verify in database:**
   ```sql
   SELECT audio_url FROM speaking_prompts 
   WHERE id = '<recent-id>' 
   LIMIT 1;
   ```
   Should show correct URL format with right account ID

---

## Testing Checklist

```
[ ] Run SQL to fix old URLs (Step 1)
[ ] Configure CORS in Cloudflare (Step 2)
[ ] Verify environment variables are set (Step 4)
[ ] Clear browser cache
[ ] Upload new test audio file
[ ] Console shows success with correct URL domain
[ ] Click play - audio plays without errors
[ ] Refresh page - URL still works
[ ] Check database - URL has correct account ID (9c1c9b4e737b4f39253c796e831e8382)
```

---

## Troubleshooting

### Issue: "HTTP 403" or "Access Denied"
**Solution:** CORS not configured in Cloudflare
- Go back to Step 2
- Verify CORS rule is saved
- Redeploy r2-upload function

### Issue: "404 Not Found"
**Solution:** Files don't exist or wrong path
- Check R2 bucket → admin/speaking/ folder
- Verify account ID is correct (should be 9c1c9b4e737b4f39253c796e831e8382)
- Check that old URL was updated in database

### Issue: Timeout (Request takes forever)
**Solution:** Public domain not configured
- Verify `CLOUDFLARE_R2_PUBLIC_URL` is set correctly
- Test URL directly in browser to confirm it's accessible
- May need to wait 5-10 minutes after CORS change propagates

### Issue: Works locally but not on production
**Solution:** Different origin domain
- Add production domain to CORS allowed origins in Cloudflare
- Example: `https://englishaidol.com`

---

## Cost Comparison

After this fix, your R2 costs:
- **Egress:** ~$0.015/GB (after free 10GB/month)
- **For 1GB/month:** $0 (within free tier)
- **For 100GB/month:** ~$1.35/month

vs Supabase:
- **For 100GB/month:** ~$12/month

**R2 Savings:** ~90% lower bandwidth costs ✅

---

## Files Not Changed
- ✅ `useAdminContent.ts` - Stays on R2 (reverted)
- ✅ `r2-upload` function - No code changes needed
- ⚠️ `speaking_prompts` table - URLs need to be fixed (SQL script above)
- ⚠️ Cloudflare settings - Need manual CORS configuration

---

**Status: Ready for Cloudflare Configuration** 🚀
