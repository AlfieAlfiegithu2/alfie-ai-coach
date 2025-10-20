# 🏗️ Monorepo Setup Guide - English AIdol + Sentence Mastery

## 📋 Overview

This is a **pnpm monorepo** with two applications:
- `apps/main` - React + Vite + Supabase
- `apps/earthworm` - Vue 3 + Nuxt 3

**CRITICAL**: Commands MUST be run from the project ROOT, not from individual apps!

---

## ⚡ Quick Start

### Option 1: Use the Startup Script (Recommended)

```bash
./START-DEV-SERVERS.sh
```

This automatically:
1. Kills old processes
2. Installs dependencies
3. Starts both dev servers
4. Shows you the URLs

### Option 2: Manual Startup

```bash
# From project root (DO NOT cd into apps/main or apps/earthworm)

# Terminal 1: Start Earthworm
pnpm --filter earthworm dev:client

# Terminal 2: Start Main App  
pnpm --filter main dev
```

### Option 3: Run Both in Parallel

```bash
pnpm dev
```

---

## 🌐 Access Your Apps

Once running:

| App | URL | Details |
|-----|-----|---------|
| **Main App** | http://localhost:5173 | English AIdol |
| **Earthworm** | http://localhost:3000 | Sentence Mastery (direct) |
| **Proxy** | http://localhost:5173/earthworm | Sentence Mastery via proxy |

---

## 📝 Available Commands

### Development

```bash
# Start both apps
pnpm dev

# Start specific app
pnpm --filter main dev
pnpm --filter earthworm dev:client

# Install dependencies
pnpm install

# Check for updates
pnpm outdated
```

### Building

```bash
# Build all apps
pnpm run build:all

# Build specific app
pnpm --filter main build
pnpm --filter earthworm build:client

# Preview production build
pnpm run preview
pnpm run preview:earthworm
```

### Testing

```bash
# Lint all apps
pnpm lint

# Type check
pnpm type-check
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: "vite: command not found"

**Problem**: Running from `apps/main` directory

**Solution**:
```bash
# ❌ WRONG
cd apps/main && npm run dev

# ✅ CORRECT
cd /path/to/project/root && pnpm --filter main dev
```

### Issue 2: White Screen on localhost:5173

**Problem**: Old Vite process still running

**Solution**:
```bash
# Kill all dev processes
killall -9 vite nuxt node

# Restart using the startup script
./START-DEV-SERVERS.sh
```

### Issue 3: "localhost:3000 refused connection"

**Problem**: Earthworm not running

**Solution**:
```bash
# Start Earthworm in a separate terminal
pnpm --filter earthworm dev:client

# Wait 5 seconds for it to start, then check
curl http://localhost:3000/
```

### Issue 4: Sentence Mastery shows blank page after clicking

**Problem**: Could be multiple causes:
1. Earthworm not running
2. Proxy not configured correctly
3. Browser cache

**Solution**:
```bash
# 1. Check both servers are running
ps aux | grep -E "vite|nuxt" | grep -v grep

# 2. Test the proxy directly
curl http://localhost:5173/earthworm/

# 3. Hard refresh browser
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + F5
```

### Issue 5: "ECONNREFUSED" proxy errors

**Problem**: Vite can't connect to Earthworm on port 3000

**Solution**:
```bash
# Verify Earthworm is running
curl http://localhost:3000/

# If not, start it
pnpm --filter earthworm dev:client

# Check vite config has correct proxy settings
cat apps/main/vite.config.ts | grep -A5 "'/earthworm'"
```

### Issue 6: Dependencies not installing properly

**Problem**: pnpm lockfile out of sync

**Solution**:
```bash
# Clean everything
rm -rf node_modules apps/*/node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install
```

---

## 🔍 Debugging Tips

### Check Server Status

```bash
# See what's running on ports 3000 and 5173
lsof -i :3000
lsof -i :5173
```

### View Logs

```bash
# Main app logs
tail -f /tmp/vite.log

# Earthworm logs
tail -f /tmp/earthworm.log
```

### Test Proxy Configuration

```bash
# Direct connection to main app
curl -I http://localhost:5173/

# Direct connection to Earthworm
curl -I http://localhost:3000/

# Proxy test (should return same as Earthworm)
curl -I http://localhost:5173/earthworm/
```

### Browser Developer Tools

Open DevTools (F12) and check:
1. **Console** - Any JavaScript errors?
2. **Network** - Are requests being proxied correctly?
3. **Application > Cookies/Storage** - Check session storage

---

## 🚀 Deployment

### Building for Production

```bash
# Build both apps
pnpm run build:all

# Outputs:
# - apps/main/dist/ (main app)
# - apps/earthworm/apps/client/.output/ (Earthworm)
```

### Testing Production Build Locally

```bash
# Preview production build
pnpm run preview

# In another terminal
pnpm run preview:earthworm
```

See `DEPLOY-WITH-LOVABLE.md` for full deployment instructions.

---

## 📚 Project Structure

```
.
├── apps/
│   ├── main/                    # React + Vite app
│   │   ├── src/
│   │   ├── vite.config.ts       # Includes proxy config
│   │   └── package.json
│   │
│   └── earthworm/               # Nuxt 3 app (Sentence Mastery)
│       ├── apps/client/
│       ├── nuxt.config.ts
│       └── package.json
│
├── pnpm-workspace.yaml          # Monorepo configuration
├── package.json                 # Root package.json with scripts
├── START-DEV-SERVERS.sh         # Startup script
├── ecosystem.config.js          # PM2 production config
├── MONOREPO-SETUP.md            # This file
└── DEPLOY-WITH-LOVABLE.md       # Deployment guide
```

---

## 🔧 pnpm Workspace Configuration

The `pnpm-workspace.yaml` defines:

```yaml
packages:
  - 'apps/*'      # All apps in apps/ are workspaces
```

This means:
- Shared dependencies are hoisted to root `node_modules`
- Each app can have its own dependencies
- Commands use `pnpm --filter <app-name>` syntax

---

## 📦 Managing Dependencies

### Add to specific app

```bash
pnpm --filter main add react-router-dom
pnpm --filter earthworm add vue-composition-api
```

### Add to root (all apps)

```bash
pnpm add -w typescript
```

### Update lockfile

```bash
pnpm install --frozen-lockfile  # Strict mode
pnpm install                     # Allow updates
```

---

## ✅ Verification Checklist

After starting servers, verify:

- [ ] Main app loads at http://localhost:5173
- [ ] Earthworm loads at http://localhost:3000
- [ ] Proxy works: http://localhost:5173/earthworm/ (200 OK)
- [ ] Sentence Mastery button in header is clickable
- [ ] Clicking button redirects to `/earthworm/`
- [ ] Earthworm interface loads without errors
- [ ] Browser console has no errors
- [ ] Network tab shows no 404s or CORS errors

---

## 🎯 First Time Setup

If this is your first time:

```bash
# 1. Clone and navigate
git clone <repo>
cd alfie-ai-coach-1

# 2. Install pnpm (if needed)
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Start servers
./START-DEV-SERVERS.sh

# 5. Open browser
# Main: http://localhost:5173
# Earthworm: http://localhost:3000
```

---

## 🆘 Still Having Issues?

Check these files for more help:

- `DEPLOY-WITH-LOVABLE.md` - Production deployment
- `PRODUCTION-DEPLOYMENT.md` - Detailed deployment strategies
- `EARTHWORM-SETUP-GUIDE.md` - Earthworm-specific setup
- `SENTENCE-MASTERY-REBRAND.md` - Integration details

Or check logs:
```bash
tail -100 /tmp/vite.log
tail -100 /tmp/earthworm.log
```

---

**Remember**: Always run commands from PROJECT ROOT, not from app directories!

Last Updated: October 20, 2025
