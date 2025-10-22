# 🚀 Vercel Deployment Guide

## Overview

This project is a monorepo with two applications that need separate Vercel deployments:

1. **Main App** (`apps/main/`) - React/Vite application
2. **Earthworm App** (`apps/earthworm/apps/client/`) - Nuxt.js/Vue application

## Step 1: Environment Setup

### Create Environment Variables

**For Main App** (create `.env` file in `apps/main/`):
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
VITE_API_URL=https://your-main-app.vercel.app

# Earthworm/Sentence Mastery Integration
VITE_SENTENCE_MASTERY_URL=https://your-earthworm-app.vercel.app
VITE_SENTENCE_MASTERY_API_URL=https://your-earthworm-app.vercel.app/api

# Logto Authentication
VITE_LOGTO_ENDPOINT=https://your-logto-endpoint.logto.app
VITE_LOGTO_APP_ID=your_logto_app_id

# Stripe (if using payments)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Production Environment
NODE_ENV=production
```

**For Earthworm App** (create `.env` file in `apps/earthworm/apps/client/`):
```env
# API Configuration
API_BASE=https://your-earthworm-app.vercel.app/api
BACKEND_ENDPOINT=https://your-earthworm-app.vercel.app/api

# Logto Authentication
LOGTO_ENDPOINT=https://your-logto-endpoint.logto.app
LOGTO_APP_ID=your_logto_app_id
LOGTO_SIGN_IN_REDIRECT_URI=https://your-earthworm-app.vercel.app/callback
LOGTO_SIGN_OUT_REDIRECT_URI=https://your-earthworm-app.vercel.app

# Microsoft Clarity (Analytics)
CLARITY=your_clarity_project_id

# Help Documentation
HELP_DOCS_URL=https://your-docs-url.com

# Production Environment
NODE_ENV=production
```

## Step 2: Deploy Main App

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy Main App**:
   ```bash
   cd apps/main
   vercel deploy --prod
   ```

3. **Set up environment variables** in Vercel dashboard:
   - Go to your main app project in Vercel
   - Navigate to Settings → Environment Variables
   - Add all the variables from your `.env` file

## Step 3: Deploy Earthworm App

1. **Deploy Earthworm App**:
   ```bash
   cd apps/earthworm/apps/client
   vercel deploy --prod
   ```

2. **Set up environment variables** in Vercel dashboard:
   - Go to your earthworm app project in Vercel
   - Navigate to Settings → Environment Variables
   - Add all the variables from your `.env` file

## Step 4: Update Configuration

After deployment, update the domain references:

1. **Update Main App Configuration** (`apps/main/vite.config.ts`):
   ```typescript
   const earthwormTarget = isProd
     ? 'https://your-earthworm-app.vercel.app'
     : 'http://localhost:3002';
   const earthwormApiTarget = isProd
     ? 'https://your-earthworm-app.vercel.app/api'
     : 'http://localhost:3001';
   ```

2. **Redeploy Main App** to apply the new configuration:
   ```bash
   cd apps/main
   vercel deploy --prod
   ```

## Step 5: Testing

1. **Test Main App**: Visit your main app URL
2. **Test Integration**: Click on "Sentence Mastery" button to verify integration
3. **Test Earthworm App**: Visit the earthworm app URL directly

## Vercel Configuration Files Created

### Main App (`apps/main/vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "env": {
    "NODE_ENV": "production"
  },
  "rewrites": [
    {
      "source": "/earthworm/(.*)",
      "destination": "https://your-earthworm-app.vercel.app/$1"
    }
  ]
}
```

### Earthworm App (`apps/earthworm/apps/client/vercel.json`)
```json
{
  "buildCommand": "pnpm run generate",
  "outputDirectory": ".output/public",
  "framework": "nuxt",
  "installCommand": "pnpm install",
  "env": {
    "NODE_ENV": "production",
    "NITRO_PRESET": "vercel"
  }
}
```

## Important Notes

1. **Replace all placeholder URLs** with your actual Vercel deployment URLs
2. **Set up environment variables** in both Vercel projects
3. **The main app proxies** requests to the earthworm app via the `/earthworm/` route
4. **Both apps need separate Vercel projects** since they use different frameworks (Vite vs Nuxt)

## Troubleshooting

### Main App Issues
- Check Vercel function logs
- Verify environment variables are set correctly
- Check proxy configuration in `vite.config.ts`

### Earthworm App Issues
- Check Nuxt build logs
- Verify `.output/public` directory is generated
- Check API endpoints are accessible

### Integration Issues
- Verify proxy configuration in main app
- Check CORS settings if needed
- Test both apps independently first

## Next Steps

1. **Set up custom domains** (optional)
2. **Configure SSL certificates** (Vercel handles this automatically)
3. **Set up monitoring** in Vercel dashboard
4. **Configure redirects** if needed

---

**Need help?** Check the deployment logs in your Vercel dashboard or refer to the main deployment documentation in `DEPLOYMENT-CHECKLIST.md`.

