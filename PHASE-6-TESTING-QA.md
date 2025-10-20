# Phase 6: Testing & Quality Assurance

## Overview

Phase 6 provides comprehensive testing procedures to verify the Earthworm integration works correctly across all components and environments.

## Testing Checklist

### Unit Tests

- [ ] `useEarthwormAuth` hook tests
  - Token generation
  - Session storage
  - Session retrieval
  - Session clearing

- [ ] `useAuth` hook integration
  - User detection
  - Logout flow

- [ ] Authentication middleware
  - Token validation
  - Fallback handling

### Integration Tests

- [ ] Cross-app navigation
  - [ ] Click "Sentence Builder" from main app
  - [ ] Redirect to `/earthworm` succeeds
  - [ ] Token in sessionStorage
  - [ ] Earthworm recognizes logged-in user

- [ ] Authentication flow
  - [ ] Logged-in user → seamless access
  - [ ] Anonymous user → login screen
  - [ ] Token expiry → redirect to login
  - [ ] Token refresh → works correctly

- [ ] Progress tracking
  - [ ] Main app records progress
  - [ ] Earthworm records progress
  - [ ] Supabase updates correctly
  - [ ] Stats accumulate properly

### End-to-End Tests

#### Test 1: User Registration & Access
```
1. Visit http://localhost:5173
2. Sign up with email/password
3. Verify logged in (user menu shows email)
4. Click "Sentence Builder"
5. Verify redirected to /earthworm
6. Verify no login screen
7. Verify can see lessons
✅ PASS: User accesses both systems without re-login
```

#### Test 2: Anonymous User Access
```
1. Visit http://localhost:5173 (DON'T log in)
2. Click "Sentence Builder"
3. Redirect to /earthworm
4. Verify login/signup form shown
5. Can create account or skip
✅ PASS: Anonymous users can still access Earthworm
```

#### Test 3: Logout & Security
```
1. Log in to main app
2. Complete Earthworm lesson
3. Log out from main app
4. Verify home redirect
5. Try accessing /earthworm directly
6. Verify login screen shown (sessionStorage cleared)
✅ PASS: Logout clears all sessions
```

#### Test 4: Language Switching
```
For each of 23 languages:
1. Log in
2. Select language from dropdown
3. Verify header translated
4. Click "Sentence Builder" 
   (translated as appropriate language)
5. Verify Earthworm loads
✅ PASS: All languages work seamlessly
```

#### Test 5: Mobile Responsiveness
```
Desktop:
1. Open DevTools (F12)
2. Toggle device toolbar
3. Select various devices:
   - iPhone 12
   - iPad
   - Galaxy Tab
4. Navigate to Earthworm
5. Verify responsive design
✅ PASS: Works on all devices
```

#### Test 6: Token Expiry
```
1. Log in
2. Check expiry in sessionStorage: ~1 hour
3. Wait for expiry (or manually clear sessionStorage)
4. Click "Sentence Builder"
5. Verify redirected to login
✅ PASS: Token expiry enforced
```

#### Test 7: Network Interruption
```
1. Log in and click "Sentence Builder"
2. While loading, disconnect network
3. Page should show error gracefully
4. Reconnect and retry
5. Should work normally
✅ PASS: Error handling works
```

#### Test 8: Database Integration
```
1. Log in and complete lesson in Earthworm
2. Check Supabase dashboard:
   - earthworm_user_progress table
   - earthworm_user_stats table
3. Verify progress recorded
4. Verify stats updated
✅ PASS: Database integration works
```

### Performance Tests

- [ ] Page load time
  - Main app: < 2s
  - Earthworm: < 2s
  - Navigation: < 500ms

- [ ] Bundle size
  - Main app: < 500KB
  - Earthworm: < 600KB
  - Shared auth: < 20KB

- [ ] Memory usage
  - Main app: < 50MB
  - Earthworm: < 60MB
  - sessionStorage: < 1MB

### Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Accessibility Tests

- [ ] Keyboard navigation
  - Tab through all buttons
  - Enter to submit
  - Escape to close modals

- [ ] Screen reader
  - All buttons labeled
  - Form inputs labeled
  - Error messages read correctly

- [ ] Color contrast
  - Minimum 4.5:1 ratio for text
  - WCAG AA compliance

## Automated Test Suite

### Run All Tests

```bash
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1

# Install dependencies
pnpm install

# Run unit tests
pnpm --filter main test

# Run integration tests
pnpm --filter earthworm test

# Run e2e tests
pnpm e2e:test

# Run all with coverage
pnpm test:coverage
```

### Test Coverage Targets

- Unit tests: > 80% coverage
- Integration tests: > 70% coverage
- E2E tests: Critical paths covered

## Manual Testing Procedures

### Daily Smoke Tests (5 min)

```bash
# 1. Start services
docker compose up -d

# 2. Start dev servers
pnpm dev

# 3. Test these scenarios:
# - Can log in
# - Can access Earthworm
# - Can complete lesson
# - Language switching works
```

### Weekly Regression Tests (30 min)

```
1. Full E2E flow for each language (5 min x 5)
2. Token expiry handling
3. Error scenarios
4. Database integrity
5. Performance metrics
```

### Pre-Release QA (2 hours)

```
1. Complete E2E flow as real user
2. Test all 23 languages
3. Test all device types
4. Load testing (50+ concurrent users)
5. Security audit
6. Accessibility audit
7. Performance profiling
8. Database backup/restore
```

## Bug Tracking

### Critical Issues (Fix immediately)

- [ ] User cannot log in
- [ ] Cannot access Earthworm
- [ ] Data loss
- [ ] Security vulnerability

### High Issues (Fix within 24h)

- [ ] Token validation fails
- [ ] Language switching breaks
- [ ] Mobile layout broken
- [ ] Performance degradation

### Medium Issues (Fix within 1 week)

- [ ] Minor UI bugs
- [ ] Translation inconsistencies
- [ ] Edge case errors
- [ ] Documentation gaps

### Low Issues (Fix in next sprint)

- [ ] UI polish
- [ ] Minor performance
- [ ] Code cleanup
- [ ] Refactoring

## Testing Results Template

```markdown
# Earthworm Integration - Test Results

## Date
October 20, 2025

## Environment
- Main App: Version X.Y.Z
- Earthworm: Version X.Y.Z
- Supabase: Production
- Browser: Chrome 119

## Test Results

### E2E Tests
- User Registration: ✅ PASS
- Anonymous Access: ✅ PASS
- Logout & Security: ✅ PASS
- Language Switching: ✅ PASS
- Mobile Responsiveness: ✅ PASS
- Token Expiry: ✅ PASS
- Error Handling: ✅ PASS
- Database Integration: ✅ PASS

### Performance
- Main App Load: 1.2s ✅
- Earthworm Load: 1.5s ✅
- Navigation: 300ms ✅
- Bundle Sizes: Within limits ✅

### Compatibility
- Chrome: ✅
- Firefox: ✅
- Safari: ✅
- Mobile: ✅

### Accessibility
- Keyboard Nav: ✅
- Screen Reader: ✅
- Color Contrast: ✅

## Issues Found
None

## Approval
- [ ] QA Lead
- [ ] Product Manager
- [ ] Tech Lead

## Ready for Production
✅ YES
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Earthworm Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test
      
      - name: Run integration tests
        run: pnpm test:integration
      
      - name: Build both apps
        run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Monitoring in Production

### Key Metrics to Track

- [ ] Error rate < 0.1%
- [ ] API response time < 500ms
- [ ] User session duration
- [ ] Feature adoption rate
- [ ] Crash reports
- [ ] User feedback

### Alerting

- Alert if error rate > 1%
- Alert if response time > 1s
- Alert if database connection fails
- Alert on security incidents

## Post-Launch Support

### First Week
- Daily monitoring
- Quick bug fixes
- User feedback collection
- Performance optimization

### First Month
- Weekly reviews
- User feature requests
- Performance tuning
- Security updates

---

**Phase 6 Status**: ✅ TESTING PROCEDURES COMPLETE
**Next Phase**: Phase 7 - Production Deployment
