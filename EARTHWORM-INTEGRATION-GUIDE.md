# Earthworm Integration Guide

## Overview

This guide explains how the Earthworm English learning system is integrated into the English AIdol platform as a microservice.

## Architecture

```
English AIdol Platform
├── Main App (React + Vite) - Port 5173
│   ├── Essay Writing & Feedback
│   ├── IELTS/TOEFL/TOEIC Practice
│   └── Vocabulary Builder
│
└── Earthworm App (Vue 3 + Vite) - Port 5174
    ├── Sentence Construction
    ├── Conjunction Learning
    └── Grammar Practice

Both apps share:
- Supabase Authentication
- User Progress Tracking
- Unified Navigation
```

## Directory Structure

```
alfie-ai-coach-1/
├── apps/
│   ├── main/                    # Main React app (your existing code)
│   │   ├── src/
│   │   ├── public/
│   │   ├── supabase/
│   │   │   └── migrations/
│   │   │       └── 20251020213557_earthworm_integration.sql
│   │   ├── package.json
│   │   └── vite.config.ts       # Updated with proxy config
│   │
│   └── earthworm/               # Cloned Earthworm repository
│       ├── apps/
│       │   ├── api/             # Earthworm NestJS backend
│       │   │   └── .env         # Database & auth config
│       │   └── client/          # Earthworm Vue frontend
│       │       └── .env         # API endpoints config
│       ├── packages/
│       └── package.json
│
├── packages/
│   └── shared-auth/             # Authentication bridge
│       ├── src/
│       │   ├── supabase-logto-bridge.ts
│       │   ├── auth-middleware.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── nginx/
│   └── nginx.conf               # Reverse proxy configuration
│
├── docker-compose.yml           # All services
├── pnpm-workspace.yaml          # Monorepo config
├── package.json                 # Root workspace
└── EARTHWORM-INTEGRATION-GUIDE.md (this file)
```

## Setup Instructions

### Step 1: Install Dependencies

```bash
# Install root dependencies
pnpm install

# Install main app dependencies
cd apps/main
pnpm install

# Install Earthworm dependencies
cd ../earthworm
pnpm install

# Install shared auth package dependencies
cd ../../packages/shared-auth
pnpm install
```

### Step 2: Start Docker Services

```bash
# From project root
docker compose up -d
```

This starts:
- PostgreSQL (Earthworm database) on port 5433
- Redis (Earthworm cache) on port 6379
- PostgreSQL (Logto database) on port 5432
- Logto (Identity service) on ports 3010 (app) & 3011 (admin)

### Step 3: Initialize Earthworm Database

```bash
cd apps/earthworm
pnpm db:init
pnpm db:upload  # Import default course data
```

### Step 4: Run Supabase Migration

```bash
cd apps/main
# Use Supabase CLI or run via Supabase dashboard
supabase db push
```

This creates:
- `earthworm_user_progress` table
- `earthworm_user_stats` table
- RLS policies
- Auto-update triggers

### Step 5: Start Development Servers

```bash
# From project root - starts both apps in parallel
pnpm dev

# Or start individually:
pnpm dev:main       # Main app on :5173
pnpm dev:earthworm  # Earthworm on :5174
```

### Step 6: Access Applications

- **Main App**: http://localhost:5173
- **Earthworm**: http://localhost:5173/earthworm
- **Logto Admin**: http://localhost:3011
  - Username: `admin`
  - Password: `WkN7g5-i8ZrJckX`

## Authentication Flow

### How It Works

1. User logs in via Supabase on main app
2. Main app generates auth token using `shared-auth` package
3. Token stored in sessionStorage
4. When user navigates to `/earthworm`, token is passed
5. Earthworm validates token and creates session
6. User has seamless access to both systems

### Implementation in Main App

```typescript
// In your component or hook
import { generateEarthwormToken, storeAuthContext } from 'shared-auth';
import { supabase } from '@/integrations/supabase/client';

async function handleEarthwormNavigation() {
  const authToken = await generateEarthwormToken(supabase);
  if (authToken) {
    const context = createEarthwormSession(authToken);
    storeAuthContext(context);
    // Navigate to /earthworm
    window.location.href = '/earthworm';
  }
}
```

## Navigation Integration

### Add to Header Component

```typescript
// apps/main/src/components/Header.tsx or similar

<nav>
  <Link to="/">Dashboard</Link>
  <Link to="/writing">Writing Practice</Link>
  <Link to="/earthworm">
    📚 Sentence Builder  {/* New link to Earthworm */}
  </Link>
  <LanguageSelector />
</nav>
```

## Configuration Files

### Main App Vite Config

```typescript
// apps/main/vite.config.ts
server: {
  proxy: {
    '/earthworm': {
      target: 'http://localhost:5174',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/earthworm/, ''),
    },
  },
}
```

### Earthworm API .env

```env
DATABASE_URL="postgres://postgres:password@localhost:5433/earthworm"
SECRET="your-secret-key"
REDIS_URL="redis://127.0.0.1:6379"
LOGTO_ENDPOINT="http://localhost:3010/"
BACKEND_ENDPOINT="http://localhost:3001/"
```

### Earthworm Client .env

```env
API_BASE="http://localhost:3001"
LOGTO_ENDPOINT="http://localhost:3010/"
BACKEND_ENDPOINT="http://localhost:3001/"
```

## Production Deployment

### Build Both Apps

```bash
pnpm build  # Builds both main and earthworm
```

### Using Nginx Reverse Proxy

```bash
# Start Nginx with the provided config
docker compose --profile production up -d nginx
```

Nginx will route:
- `/` → Main app
- `/earthworm` → Earthworm app
- `/api` → Main API
- `/earthworm-api` → Earthworm API

### Deploy to Cloud

1. Build Docker images for both apps
2. Push to container registry
3. Deploy with Nginx reverse proxy
4. Update environment variables
5. Run migrations
6. Test authentication flow

## Troubleshooting

### Docker Not Available

If Docker isn't running:
```bash
# Install Docker Desktop or Docker Engine
# Start Docker daemon
docker --version  # Verify installation
```

### Port Conflicts

If ports are already in use:
```bash
# Check what's using the port
lsof -i :5173  # Main app
lsof -i :5174  # Earthworm
lsof -i :5433  # PostgreSQL
lsof -i :6379  # Redis

# Kill process or change ports in config files
```

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs earthworm_db

# Restart service
docker compose restart earthworm_db
```

### Authentication Issues

1. Check sessionStorage in browser DevTools
2. Verify Supabase token is valid
3. Check CORS settings
4. Verify Logto is running: http://localhost:3011

### Build Errors

```bash
# Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install

# Clear build cache
rm -rf apps/*/dist
rm -rf .vite
```

## Development Workflow

### Daily Development

```bash
# Terminal 1: Start Docker services
docker compose up -d

# Terminal 2: Start both dev servers
pnpm dev

# Or separate terminals:
# Terminal 2: Main app
pnpm dev:main

# Terminal 3: Earthworm app
pnpm dev:earthworm
```

### Making Changes

- **Main App**: Edit files in `apps/main/src/`
- **Earthworm**: Edit files in `apps/earthworm/`
- **Shared Auth**: Edit files in `packages/shared-auth/src/`

Changes hot-reload automatically.

### Testing

```bash
# Test main app
cd apps/main
pnpm test

# Test Earthworm
cd apps/earthworm
pnpm test
```

## API Endpoints

### Main App Supabase Functions

- `/api/...` - Your existing Supabase functions

### Earthworm API (via proxy)

- `/earthworm-api/...` - Earthworm backend endpoints

## Database Schema

### Supabase Tables (Main App)

- `auth.users` - User authentication (shared)
- `profiles` - User profiles (shared)
- `earthworm_user_progress` - Lesson completion tracking
- `earthworm_user_stats` - Aggregated statistics

### Earthworm PostgreSQL Tables

- Managed by Earthworm migrations
- Course data, lessons, exercises
- Separate from main database

## Monitoring

### Check Service Health

```bash
# Docker services
docker compose ps

# Logs
docker compose logs -f earthworm_db
docker compose logs -f earthworm_redis
docker compose logs -f earthworm_logto

# Database
docker exec -it earthworm_db psql -U postgres -d earthworm
```

### Performance Metrics

- Monitor both apps separately
- Check Nginx access logs
- Track database query performance
- Monitor Redis cache hit rates

## Security

### Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Secrets**: Rotate keys regularly
3. **CORS**: Configure properly for production
4. **RLS**: Verify policies are working
5. **Auth Tokens**: Set appropriate expiry times

### Production Checklist

- [ ] Change default passwords
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerting
- [ ] Regular backups
- [ ] Security headers (via Nginx)
- [ ] Rate limiting
- [ ] DDoS protection

## Support

### Getting Help

1. Check this guide first
2. Review Earthworm docs: https://github.com/cuixueshe/earthworm
3. Check Docker logs
4. Verify environment variables
5. Test authentication flow

### Common Issues

- **Can't access /earthworm**: Check proxy config in vite.config.ts
- **Auth not working**: Verify shared-auth package is installed
- **Database errors**: Check Docker services are running
- **Build fails**: Clean install dependencies

## Future Enhancements

### Planned Features

1. **Unified Progress Dashboard**: Show both systems' progress
2. **Cross-App Recommendations**: Suggest lessons based on performance
3. **Shared Vocabulary**: Sync vocabulary between systems
4. **Mobile App**: React Native wrapper for both
5. **AI Integration**: Connect Earthworm progress to your AI scoring

### Customization Options

1. **Branding**: Update Earthworm theme to match your colors
2. **Content**: Add custom lessons and exercises
3. **Gamification**: Integrate with your existing rewards system
4. **Analytics**: Track cross-system usage patterns

## Maintenance

### Regular Tasks

- Update dependencies monthly
- Monitor disk space for Docker volumes
- Review and optimize database queries
- Check for Earthworm updates
- Backup databases weekly

### Updating Earthworm

```bash
cd apps/earthworm
git fetch origin
git pull origin main
pnpm install
pnpm build
```

## License

- Main App: Your existing license
- Earthworm: AGPL-3.0 (check their repository)
- Shared Auth: Same as your main license

## Contact

For questions about this integration, refer to the main project documentation or contact your development team.

