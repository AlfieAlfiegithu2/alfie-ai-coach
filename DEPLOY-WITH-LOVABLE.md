# 🚀 Production Deployment Guide - Using Lovable

## Quick Start

Since you're using Lovable, here's how to deploy everything to production:

## Local Testing

### 1. **Build Both Applications**

```bash
# From root directory
pnpm run build:all
```

This will:
- Build the main English AIdol app
- Build Sentence Mastery (Earthworm)

### 2. **Test Production Build Locally**

```bash
# Terminal 1: Start main app preview
pnpm run preview

# Terminal 2: Start Sentence Mastery preview  
pnpm run preview:earthworm
```

Then open `http://localhost:5173` and test Sentence Mastery feature.

---

## Production Deployment

### Option 1: Manual Deployment (Recommended for Lovable)

#### Step 1: Update Configuration

Edit `/apps/main/vite.config.ts`:
```typescript
const earthwormTarget = isProd 
  ? 'https://YOUR_DOMAIN.com/sentence-mastery' 
  : 'http://localhost:3000';
```

#### Step 2: Build for Production

```bash
cd apps/main
npm run build
```

This creates `/apps/main/dist/` with your static site.

#### Step 3: Deploy Main App

**Option A: Vercel** (Recommended for Lovable users)
```bash
vercel deploy --prod
```

**Option B: Netlify**
```bash
netlify deploy --prod --dir=apps/main/dist
```

**Option C: Your Server**
```bash
# Copy dist to your server
scp -r apps/main/dist your_server:/var/www/english-aidol
```

#### Step 4: Deploy Sentence Mastery

```bash
cd apps/earthworm
pnpm run build:client
```

Then deploy `/apps/earthworm/apps/client/.output/` using similar method.

---

### Option 2: Using PM2 (For VPS/Dedicated Server)

#### Step 1: Install PM2

```bash
npm install -g pm2
```

#### Step 2: Update ecosystem.config.js

Edit the file and replace paths:
```javascript
cwd: '/absolute/path/to/alfie-ai-coach-1',
```

#### Step 3: Start Services

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx/Apache Reverse Proxy

**Nginx Config:**
```nginx
upstream main_app {
    server localhost:5173;
}

upstream sentence_mastery {
    server localhost:3000;
}

server {
    listen 80;
    server_name YOUR_DOMAIN.com;

    # Main app
    location / {
        proxy_pass http://main_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Sentence Mastery
    location /sentence-mastery/ {
        proxy_pass http://sentence_mastery/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Option 3: Docker Deployment (Advanced)

```bash
# Start all services with Docker Compose
docker compose up -d

# Services available at:
# Main app: localhost:5173
# Sentence Mastery: localhost:3000
```

---

## Environment Variables (Production)

Create `apps/main/.env.production`:
```env
VITE_API_URL=https://YOUR_DOMAIN.com
VITE_SUPABASE_URL=https://your-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SENTENCE_MASTERY_URL=https://YOUR_DOMAIN.com/sentence-mastery
VITE_SENTENCE_MASTERY_API_URL=https://YOUR_DOMAIN.com/api
```

---

## Deployment Checklist

- [ ] Update vite.config.ts with production domains
- [ ] Build both applications: `pnpm run build:all`
- [ ] Test production build locally: `pnpm run preview`
- [ ] Choose deployment platform (Vercel, Netlify, VPS)
- [ ] Deploy main app to your chosen platform
- [ ] Deploy Sentence Mastery separately
- [ ] Configure reverse proxy (if using VPS)
- [ ] Enable SSL/TLS with Let's Encrypt
- [ ] Test all features in production
- [ ] Monitor logs and performance

---

## Troubleshooting

### White Screen on Sentence Mastery

1. Check browser console for CORS errors
2. Verify proxy configuration
3. Check if Sentence Mastery app is running
4. Hard refresh browser (Cmd+Shift+R on Mac)

### 404 Errors

1. Verify proxy paths match exactly
2. Ensure both apps are running
3. Check Nginx/Apache configuration

### Build Failures

```bash
# Clear build cache and try again
rm -rf apps/main/dist
rm -rf apps/earthworm/apps/client/.output
pnpm run build:all
```

---

## Monitoring

### Check Service Status
```bash
pm2 status
pm2 logs
pm2 logs --err
```

### Restart Services
```bash
pm2 restart english-aidol-main
pm2 restart sentence-mastery
```

### View Real-time Monitoring
```bash
pm2 monit
```

---

## Support

- **Main App Issues**: Check Lovable documentation
- **Sentence Mastery Issues**: See EARTHWORM-SETUP-GUIDE.md
- **Deployment Issues**: See PRODUCTION-DEPLOYMENT.md

---

**Ready to deploy?** Start with `pnpm run build:all` and choose your deployment method above! 🚀
