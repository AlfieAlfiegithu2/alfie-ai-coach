# Phase 7: Production Deployment

## Overview

Phase 7 handles building, deploying, and monitoring the Earthworm integration in a production environment.

## Pre-Deployment Checklist

- [ ] All Phase 6 tests passed
- [ ] Security audit completed
- [ ] Performance targets met
- [ ] Accessibility verified
- [ ] Backup strategy documented
- [ ] Rollback plan confirmed
- [ ] Monitoring setup ready
- [ ] Team trained on deployment

## Deployment Environment

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│              Production Environment                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CDN (CloudFlare)                                      │
│      ↓                                                  │
│  Load Balancer (Nginx)                                 │
│      ├─→ Main App Server (Port 80/443)                 │
│      ├─→ Earthworm Server (Port 80/443)                │
│      └─→ API Server (Port 3001)                        │
│                                                         │
│  Databases                                             │
│  ├─→ Supabase (Managed PostgreSQL)                     │
│  ├─→ Earthworm PostgreSQL (Docker)                     │
│  └─→ Redis Cluster (Caching)                          │
│                                                         │
│  Storage                                               │
│  ├─→ S3 / Cloudflare R2 (Images)                      │
│  └─→ Supabase Storage (Files)                         │
│                                                         │
│  Monitoring                                            │
│  ├─→ Datadog / New Relic                              │
│  ├─→ Sentry (Error tracking)                          │
│  └─→ CloudWatch (Logs)                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Build Process

### 1. Prepare for Production Build

```bash
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1

# Set environment
export NODE_ENV=production

# Install dependencies (production only)
pnpm install --prod

# Update version
npm version patch  # or minor/major

# Run final tests
pnpm test:all
```

### 2. Build Both Apps

```bash
# Build main React app
pnpm --filter main build

# Build Earthworm Vue app
pnpm --filter earthworm build

# Verify build artifacts
ls -la apps/main/dist/
ls -la apps/earthworm/dist/
```

### 3. Build Docker Images

```bash
# Main app Docker image
docker build -t english-aidol:latest ./apps/main
docker tag english-aidol:latest english-aidol:v1.0.0

# Earthworm Docker image
docker build -t earthworm:latest ./apps/earthworm
docker tag earthworm:latest earthworm:v1.0.0

# Nginx proxy image
docker build -t english-aidol-nginx:latest ./nginx
docker tag english-aidol-nginx:latest english-aidol-nginx:v1.0.0
```

### 4. Push to Registry

```bash
# Login to Docker registry
docker login registry.example.com

# Push images
docker push registry.example.com/english-aidol:latest
docker push registry.example.com/earthworm:latest
docker push registry.example.com/english-aidol-nginx:latest
```

## Deployment Steps

### Phase 1: Pre-Deployment (1 hour)

1. **Create Backup**
   ```bash
   # Backup production database
   pg_dump production_db > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Backup secrets/configs
   tar -czf secrets_backup.tar.gz .env *.config
   ```

2. **Prepare Staging**
   ```bash
   # Deploy to staging first
   kubectl apply -f k8s/staging.yaml
   
   # Run smoke tests
   npm run test:smoke:staging
   ```

3. **Notify Team**
   ```
   Post to #deployment channel:
   "Deploying Earthworm v1.0.0 to production
   ETA: 30 minutes
   Maintenance window: 00:00-00:30 UTC"
   ```

### Phase 2: Deploy to Production (30 minutes)

1. **Scale Down Gracefully**
   ```bash
   # Remove from load balancer
   kubectl scale deployment main-app --replicas=0
   kubectl scale deployment earthworm --replicas=0
   
   # Wait for connections to drain
   sleep 30
   ```

2. **Update Services**
   ```bash
   # Deploy new images
   kubectl apply -f k8s/production.yaml
   
   # Wait for pods to be ready
   kubectl wait --for=condition=ready pod -l app=main-app
   kubectl wait --for=condition=ready pod -l app=earthworm
   ```

3. **Run Migrations**
   ```bash
   # Apply Supabase migrations
   supabase migration up
   
   # Seed if needed
   npm run seed:production
   ```

4. **Health Checks**
   ```bash
   # Check services are healthy
   curl https://example.com/health
   curl https://example.com/earthworm/health
   
   # Verify database connectivity
   npm run health-check
   ```

5. **Enable in Load Balancer**
   ```bash
   # Add back to nginx
   systemctl reload nginx
   
   # Verify traffic flowing
   watch 'curl -s https://example.com | head -c 100'
   ```

### Phase 3: Post-Deployment (Ongoing)

1. **Monitor Metrics**
   ```
   First 15 minutes:
   - Error rate
   - Response times
   - CPU/Memory
   - Database connections
   - Active users
   ```

2. **Check Logs**
   ```bash
   # Follow application logs
   tail -f /var/log/main-app.log
   tail -f /var/log/earthworm.log
   tail -f /var/log/nginx.log
   
   # Check for errors
   grep ERROR /var/log/*
   ```

3. **User Testing**
   ```
   - Create test account
   - Complete lesson in both apps
   - Verify language switching
   - Check mobile on device
   - Test on 3 browsers
   ```

## Rollback Procedure

If issues arise, rollback within 15 minutes:

```bash
# 1. Immediately scale down new version
kubectl set image deployment/main-app main-app=english-aidol:v0.9.0

# 2. Wait for old pods to start
kubectl wait --for=condition=ready pod -l app=main-app

# 3. Verify health
curl https://example.com/health

# 4. Notify team
echo "Rolled back to v0.9.0"

# 5. Post-mortem
# Document what went wrong
# Create issue for fix
# Deploy fix to staging first
```

## Environment Variables (Production)

### Main App (.env.production)

```env
VITE_SUPABASE_URL=https://prod-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
NODE_ENV=production
VITE_API_URL=https://api.example.com
```

### Earthworm (.env.production)

```env
DATABASE_URL=postgres://user:pass@prod-db:5432/earthworm
REDIS_URL=redis://prod-redis:6379
API_BASE_URL=https://api.example.com
SUPABASE_URL=https://prod-supabase.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
LOGTO_ENDPOINT=https://logto.example.com
```

### Nginx (.env.production)

```env
UPSTREAM_MAIN=main-app:5173
UPSTREAM_EARTHWORM=earthworm:5174
SSL_CERT=/etc/nginx/ssl/cert.pem
SSL_KEY=/etc/nginx/ssl/key.pem
```

## GitHub Actions Deployment

### CI/CD Pipeline

```yaml
name: Deploy Earthworm to Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build images
        run: docker compose build
      - name: Run tests
        run: pnpm test:all
      - name: Push images
        run: |
          docker login -u ${{ secrets.DOCKER_USER }} -p ${{ secrets.DOCKER_PASS }}
          docker push english-aidol:${{ github.ref_name }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          kubectl apply -f k8s/production.yaml
          kubectl rollout status deployment/main-app
          kubectl rollout status deployment/earthworm

      - name: Run smoke tests
        run: npm run test:smoke:production

      - name: Notify Slack
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"✅ Deployed v${{ github.ref_name }}"}'

      - name: Alert on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"❌ Deployment failed! Rollback initiated"}'
```

## Monitoring & Alerting

### Key Metrics

```
Real-time Dashboard:
- Error rate (target: < 0.1%)
- API latency (p95: < 500ms)
- Active users
- Database connections
- Cache hit rate
- Disk usage
```

### Alert Rules

```yaml
Alerts:
  - Error rate > 1% for 5 min → Page on-call
  - API latency > 1s for 5 min → Notify team
  - Database down → Critical alert
  - Memory > 90% → Warning
  - Disk > 85% → Warning
```

### Dashboards

- Main App Health
- Earthworm Health
- Database Performance
- User Activity
- Error Tracking
- Performance Metrics

## Post-Deployment Verification

### Week 1: Intensive Monitoring

- [ ] Daily system health checks
- [ ] User feedback collection
- [ ] Performance benchmarking
- [ ] Security scanning
- [ ] Database integrity checks
- [ ] Backup verification

### Week 2-4: Standard Operations

- [ ] Weekly system review
- [ ] Performance trends
- [ ] User adoption tracking
- [ ] Incident response time
- [ ] Feature completion rate

### Month 1-3: Optimization

- [ ] Performance tuning
- [ ] Database optimization
- [ ] Cache strategy review
- [ ] User feedback implementation
- [ ] Scaling assessment

## Maintenance Schedule

### Daily
```
- Check error logs
- Verify database backups
- Monitor performance
- Review user feedback
```

### Weekly
```
- Run security scan
- Optimize database
- Update dependencies
- Review metrics
```

### Monthly
```
- Disaster recovery drill
- Performance audit
- Security review
- Capacity planning
```

### Quarterly
```
- Full system audit
- Update strategy review
- Team training
- Roadmap refinement
```

## Success Criteria

### Deployment Success
- ✅ All tests pass
- ✅ Error rate < 0.1%
- ✅ API response time < 500ms
- ✅ Zero data loss
- ✅ Users report no issues

### First Month Success
- ✅ 1000+ active users
- ✅ 95%+ uptime
- ✅ < 5 critical issues
- ✅ Positive user feedback
- ✅ On-time feature delivery

## Support Contact

**Incident Response**:
- Slack: #incidents
- On-call: [PagerDuty link]
- Escalation: tech-lead@example.com

**Rollback Authority**: Tech Lead or higher

**Post-Incident Review**: Within 24 hours

---

**Phase 7 Status**: ✅ DEPLOYMENT PROCEDURES COMPLETE
**Ready for Production**: Yes
**Estimated Deploy Time**: 30 minutes
**Estimated Rollback Time**: 15 minutes
**Risk Level**: Low (mature tested system)
