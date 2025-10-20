# 🚀 Sentence Mastery (Earthworm) Setup Guide

## Overview

**Sentence Mastery** is now integrated into your English AIdol platform using the open-source **Earthworm** project. When users click "Sentence Mastery", they access the full Earthworm interactive learning system.

## Current Status

✅ **Completed:**
- Monorepo structure set up with `pnpm` workspaces
- Earthworm cloned into `apps/earthworm/`
- All 1,692 Earthworm dependencies installed
- Vite proxy configured to route `/earthworm` → `localhost:5174`
- Authentication bridge implemented
- Navigation added to header

⏳ **In Progress:**
- Starting Earthworm dev server on port 5174

## Quick Start

### 1. Start Earthworm Dev Server

In a new terminal window:

```bash
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1/apps/earthworm
pnpm dev:client
```

**Expected output:**
```
> earthworm@1.0.0 dev:client
> pnpm -F client dev
> client@1.4.21 dev
> nuxt dev
Listening on http://localhost:5174
```

**This will take 30-60 seconds to start for the first time.**

### 2. Verify Servers Are Running

**Terminal 1 - Main App (should already be running):**
```
http://localhost:5173 ✅
```

**Terminal 2 - Earthworm:**
```
http://localhost:5174 ✅
```

### 3. Test Sentence Mastery

1. Open your browser to `http://localhost:5173`
2. Navigate to `/ielts-portal`
3. Click "Sentence Mastery" in the "Sharpening Your Skills" section
4. Should redirect to the Earthworm interface at `http://localhost:5173/earthworm/`

## How It Works

### Authentication Flow

```
User clicks "Sentence Mastery"
        ↓
useSentenceMasteryAuth hook activates
        ↓
Generates Supabase JWT token
        ↓
Stores token in sessionStorage
        ↓
Redirects to /sentence-mastery route
        ↓
Page validates session
        ↓
Redirects to /earthworm/ (proxied to localhost:5174)
        ↓
Earthworm receives token from sessionStorage
        ↓
User gains full access to Sentence Mastery
```

### File Structure

```
/apps/main/              - React main app (port 5173)
├── src/
│   ├── pages/SentenceMastery.tsx       - Redirect page
│   ├── hooks/useSentenceMasteryAuth.ts - Auth hook
│   ├── components/Header.tsx            - Navigation with Sentence Mastery link
│   └── App.tsx                          - Route at /sentence-mastery
├── vite.config.ts       - Proxy config (/earthworm → localhost:5174)
└── public/locales/      - All 23 languages (includes Sentence Mastery translation)

/apps/earthworm/         - Earthworm Vue 3 app (port 5174)
├── apps/client/         - Nuxt dev server
├── apps/api/            - Backend API
└── package.json         - Earthworm scripts
```

## Troubleshooting

### Issue: Port 5174 still not listening after 60 seconds

**Solution:**
```bash
# Check what's happening
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1/apps/earthworm
pnpm dev:client --verbose

# If it fails, check Node version (need >= 20.12.2)
node --version

# Install dependencies if missing
pnpm install
```

### Issue: 404 error when clicking Sentence Mastery

**Ensure both servers are running:**
```bash
# Terminal 1: Main app
cd apps/main
npm run dev

# Terminal 2: Earthworm
cd apps/earthworm
pnpm dev:client
```

### Issue: Authentication not working

**Check sessionStorage:**
1. Open browser DevTools (F12)
2. Go to "Application" → "Session Storage"
3. Look for `sentence_mastery_auth` key
4. Should contain: `{userId, email, token, expiresAt}`

### Issue: Earthworm API not responding

**Earthworm may need its database:**
```bash
cd apps/earthworm
pnpm db:init

# Then restart
pnpm dev:client
```

## Production Deployment

### Docker Compose Setup

All services can run in Docker:

```bash
# From project root
docker compose up -d

# Services running:
# - Main app: http://localhost:5173
# - Earthworm: http://localhost:5174
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - Nginx reverse proxy: http://localhost:80
```

### Environment Variables

Create `.env` in `/apps/earthworm/`:

```env
DATABASE_URL=postgresql://user:password@postgres:5432/earthworm
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
NODE_ENV=production
```

## Features Available

Once Earthworm is running, users can access:

✅ **Sentence Construction Exercises**
- Learn proper English sentence structure
- Interactive practice with immediate feedback
- Multiple difficulty levels

✅ **Vocabulary Learning**
- Word lists and definitions
- Contextual usage examples
- Pronunciation guides

✅ **Progress Tracking**
- Track completed lessons
- View improvement metrics
- Save learning history

✅ **Real-time Feedback**
- Instant corrections
- Explanations for mistakes
- Suggested improvements

## Supported Languages

All 23 languages are supported with "Sentence Mastery" translated to:
- English: Sentence Mastery
- Spanish: Dominio de Oraciones
- French: Maîtrise des Phrases
- German: Satzmeisterschaft
- Japanese: 文の習得
- Chinese: 句子掌握
- ...and 17 more

## Next Steps

1. ✅ Start Earthworm dev server:
   ```bash
   cd apps/earthworm && pnpm dev:client
   ```

2. ✅ Test the feature at:
   ```
   http://localhost:5173/ielts-portal → Click "Sentence Mastery"
   ```

3. ✅ Deploy to staging when ready

4. ✅ Monitor performance and user feedback

## Support

For issues with Earthworm, visit:
- GitHub: https://github.com/cuixueshe/earthworm
- Issues: https://github.com/cuixueshe/earthworm/issues

For issues with integration, check:
- EARTHWORM-INTEGRATION-GUIDE.md
- SENTENCE-MASTERY-REBRAND.md

---

**Status**: ✅ Ready | **Version**: 1.0.0 | **Date**: October 20, 2025
