# ✅ Production Deployment Checklist

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] Local testing complete: `pnpm run dev`
- [ ] Production build tested: `pnpm run build:all && pnpm run preview`
- [ ] Sentence Mastery loads on `/sentence-mastery` route
- [ ] All 23 languages working correctly

## Configuration Update

- [ ] Update `apps/main/vite.config.ts` with your production domain
- [ ] Replace `yourdomain.com` with actual domain
- [ ] Update `apps/main/.env.production` with all environment variables
- [ ] Update `ecosystem.config.js` with correct paths
- [ ] Update `DEPLOY-WITH-LOVABLE.md` with your domain

## Building for Production

```bash
# From root directory
pnpm run build:all

# Outputs:
# - apps/main/dist/           (main app)
# - apps/earthworm/.output/   (Sentence Mastery)
```

## Deployment Options

### ✨ Option 1: Vercel (Recommended for Lovable)

```bash
# Install Vercel CLI
npm install -g vercel

# From apps/main/
cd apps/main
vercel deploy --prod

# Sentence Mastery:
# Deploy apps/earthworm/apps/client/.output/ as separate app
```

**Vercel Configuration:**
- Set NODE_ENV = production
- Build Command: `pnpm run build:all`
- Output Directory: `dist`

### 🌐 Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy main app
cd apps/main
netlify deploy --prod --dir=dist

# Deploy Sentence Mastery separately
cd apps/earthworm/apps/client
netlify deploy --prod --dir=.output/public
```

### 🖥️ Option 3: VPS/Dedicated Server

```bash
# 1. SSH into your server
ssh user@your_server.com

# 2. Clone repository
git clone https://github.com/yourusername/alfie-ai-coach-1.git
cd alfie-ai-coach-1

# 3. Build everything
pnpm install
pnpm run build:all

# 4. Install PM2 globally
npm install -g pm2

# 5. Update ecosystem.config.js paths, then start
pm2 start ecosystem.config.js

# 6. Save and enable restart on reboot
pm2 save
pm2 startup
```

### 🐳 Option 4: Docker

```bash
docker compose up -d
```

## Post-Deployment Testing

- [ ] Main app loads at `https://yourdomain.com`
- [ ] Header navigation works
- [ ] Language selection works
- [ ] Click "Sentence Mastery" button → loads feature
- [ ] Sentence Mastery exercises load
- [ ] Can interact with exercises
- [ ] No console errors in DevTools
- [ ] Performance is acceptable (< 3s load time)

## Reverse Proxy Setup (VPS)

If using VPS, update Nginx:

```nginx
# /etc/nginx/sites-available/english-aidol

upstream main_app {
    server localhost:5173;
}

upstream sentence_mastery {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

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

Then enable:
```bash
sudo ln -s /etc/nginx/sites-available/english-aidol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/TLS Certificate (VPS)

```bash
# Install Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renewal (already setup with certbot)
sudo systemctl enable certbot.timer
```

## Monitoring

### Check Services

```bash
pm2 status
pm2 logs
pm2 logs english-aidol-main
pm2 logs sentence-mastery
```

### View Resources

```bash
pm2 monit
```

### Restart if Needed

```bash
pm2 restart english-aidol-main
pm2 restart sentence-mastery
pm2 restart all
```

## Troubleshooting

### White Screen on Sentence Mastery

1. Check browser console for CORS errors
2. Verify both apps are running: `pm2 status`
3. Check logs: `pm2 logs sentence-mastery`
4. Hard refresh browser (Cmd+Shift+R)

### 404 Errors

1. Verify Nginx location paths match exactly
2. Check both apps built successfully
3. Verify ports are correct

### Build Failures

```bash
# Clear cache and rebuild
rm -rf apps/main/dist
rm -rf apps/earthworm/apps/client/.output
pnpm run build:all
```

## Rollback

If something goes wrong:

```bash
# Stop services
pm2 stop all

# Revert to previous git commit
git checkout [previous-commit-hash]

# Rebuild
pnpm run build:all

# Restart
pm2 start ecosystem.config.js
```

## Performance Optimization

1. **Enable GZIP** in Nginx:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Cache Control** in Nginx:
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
       expires 365d;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Monitor uptime**:
   ```bash
   pm2 web  # Open http://localhost:9615 to view dashboard
   ```

## Critical Files to Backup

- `package.json` (root and apps/)
- `vite.config.ts`
- `ecosystem.config.js`
- Database backups (Supabase)
- `.env.production` (keep secure)

## Support

- **Issues?** Check `DEPLOY-WITH-LOVABLE.md`
- **Local Dev?** Check `EARTHWORM-SETUP-GUIDE.md`
- **Detailed Guide?** Check `PRODUCTION-DEPLOYMENT.md`

---

**Good luck with your deployment! 🚀**

Once deployed, you'll have:
- ✅ Main English AIdol app running
- ✅ Sentence Mastery fully integrated
- ✅ 23 languages supported
- ✅ All features working in production
