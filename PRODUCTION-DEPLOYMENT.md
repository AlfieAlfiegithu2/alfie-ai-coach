# 🚀 Production Deployment Guide - Sentence Mastery

## Overview

This guide explains how to deploy the Sentence Mastery (Earthworm) integration to production.

## Pre-Deployment Checklist

### 1. **Update Domain Configuration**

Edit `apps/main/vite.config.ts` and update the production domains:

```typescript
const earthwormTarget = isProd ? 'https://YOUR_DOMAIN.com/sentence-mastery' : 'http://localhost:3000';
const earthwormApiTarget = isProd ? 'https://YOUR_DOMAIN.com/api' : 'http://localhost:3001';
```

### 2. **Environment Variables**

Create a `.env.production` file in `apps/main/`:

```env
VITE_SENTENCE_MASTERY_URL=https://YOUR_DOMAIN.com/sentence-mastery
VITE_SENTENCE_MASTERY_API_URL=https://YOUR_DOMAIN.com/api
VITE_API_URL=https://YOUR_DOMAIN.com/api
```

### 3. **Nginx Configuration**

Update your Nginx config to proxy both applications:

```nginx
# Main Application
upstream main_app {
    server localhost:5173;
}

# Sentence Mastery (Earthworm)
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

    # Sentence Mastery app
    location /sentence-mastery/ {
        proxy_pass http://sentence_mastery/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Sentence Mastery API
    location /earthworm-api/ {
        proxy_pass http://sentence_mastery/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. **SSL/TLS Certificate**

Enable HTTPS using Let's Encrypt:

```bash
sudo certbot certonly --standalone -d YOUR_DOMAIN.com
```

Update Nginx config to use SSL:

```nginx
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem;
```

## Deployment Steps

### 1. **Build Main Application**

```bash
cd apps/main
npm run build
```

### 2. **Build Sentence Mastery**

```bash
cd apps/earthworm
pnpm build:client
```

### 3. **Start Services with PM2**

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem config file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'main-app',
      script: 'npm run preview',
      cwd: '/path/to/apps/main',
      env: { NODE_ENV: 'production' },
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'sentence-mastery',
      script: 'npm run build && npm run start',
      cwd: '/path/to/apps/earthworm/apps/client',
      env: { NODE_ENV: 'production' },
      instances: 2,
      exec_mode: 'cluster',
    },
  ],
};
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. **Verify Deployment**

```bash
# Check service status
pm2 status

# Monitor logs
pm2 logs

# Test endpoints
curl https://YOUR_DOMAIN.com
curl https://YOUR_DOMAIN.com/sentence-mastery
```

## Troubleshooting

### White Screen in Production

**Issue**: Sentence Mastery loads but shows white screen

**Solutions**:
1. Check browser DevTools for CORS errors
2. Verify Nginx proxy configuration
3. Check Sentence Mastery logs: `pm2 logs sentence-mastery`
4. Verify SSL certificate is valid

### 404 Errors

**Issue**: Routes return 404

**Solutions**:
1. Verify Nginx location blocks match exactly
2. Check rewrite rules are correct
3. Verify both apps are running: `pm2 status`

### CORS Errors

**Issue**: Cross-origin requests blocked

**Solutions**:
Add CORS headers in Nginx:

```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
```

## Monitoring

### CPU & Memory Usage

```bash
pm2 monit
```

### Error Logs

```bash
pm2 logs --err
```

### Restart on Crash

```bash
pm2 restart main-app
pm2 restart sentence-mastery
```

## Rollback Procedure

If deployment fails:

```bash
# Stop services
pm2 stop all

# Revert to previous version (if using git)
git checkout previous-commit

# Rebuild and restart
npm run build
pm2 start ecosystem.config.js
```

## Production Checklist

- [ ] Update domain in vite.config.ts
- [ ] Create .env.production with correct URLs
- [ ] Update Nginx configuration
- [ ] Enable SSL/TLS
- [ ] Build both applications
- [ ] Start services with PM2
- [ ] Test all endpoints
- [ ] Monitor logs for errors
- [ ] Set up automated backups
- [ ] Enable security headers
- [ ] Configure CDN (optional)

---

**Need Help?** Check the logs with `pm2 logs`
