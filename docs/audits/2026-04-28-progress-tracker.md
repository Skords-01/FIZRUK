# Sergeant - Трекер Прогресу Покращень

> **Створено:** 2026-04-28
> **Останнє оновлення:** 2026-04-28
> **Статус:** Ready to start

---

## Quick Status

| Sprint | Статус | Прогрес | ETA |
|--------|--------|---------|-----|
| Sprint 1 | Not Started | 0/4 tasks | Week 1-2 |
| Sprint 2 | Not Started | 0/4 tasks | Week 3-4 |
| Sprint 3 | Not Started | 0/4 tasks | Week 5-6 |
| Sprint 4+ | Not Started | 0/5 tasks | Ongoing |

**Overall Progress:** 0/17 tasks (0%)

---

## Sprint 1: Stabilization

### Task 1.1: TypeScript Strict Phase 2-3
- **Status:** Not Started
- **Priority:** P0-1 (Critical)
- **Estimated Effort:** 8-10 days

**Checklist:**
- [ ] Phase 2: Enable strictNullChecks for core/lib
  - [ ] Run initial typecheck, document error count
  - [ ] Fix core/lib errors (~16)
  - [ ] Fix core/hub errors (~45)
  - [ ] Fix core/settings errors (~30)
- [ ] Phase 3: Enable noImplicitAny
  - [ ] Fix fizruk module (~85 errors)
  - [ ] Fix finyk module (~70 errors)
  - [ ] Fix nutrition module (~95 errors)
  - [ ] Fix routine module (~55 errors)
- [ ] Final: Enable full strict: true
  - [ ] Update tsconfig.json
  - [ ] Verify CI passes
  - [ ] Update strict-coverage metric to 100%

**Notes:**
```
Initial error count: TBD
Final error count: 0
PR: TBD
```

---

### Task 1.2: localStorage Migration (Batch 1)
- **Status:** Not Started
- **Priority:** P0-2 (Critical)
- **Estimated Effort:** 2-3 days

**Files to migrate (10):**
- [ ] `useOfflineQueue.ts`
- [ ] `useCloudSync.ts`
- [ ] `useTypedStore.ts`
- [ ] `SettingsPage.tsx`
- [ ] `OnboardingWizard.tsx`
- [ ] `HubDashboard.tsx`
- [ ] `useFinykCategories.ts`
- [ ] `useRoutineReminders.ts`
- [ ] `useFizrukProgress.ts`
- [ ] `useNutritionHistory.ts`

**Metrics:**
```
ESLint allowlist before: 52
ESLint allowlist after: TBD (target: 42)
PR: TBD
```

---

### Task 1.3: Fix Mobile Flaky Tests
- **Status:** Not Started
- **Priority:** P0-3 (Critical)
- **Estimated Effort:** 1 day

**Tests to fix:**
- [ ] `WeeklyDigestFooter.test.tsx`
- [ ] `HubSettingsPage.test.tsx`

**Root Cause:** AccessibilityInfo.isReduceMotionEnabled mock missing mockResolvedValue

**Metrics:**
```
Flaky tests before: 2
Flaky tests after: 0 (target)
PR: TBD
```

---

### Task 1.4: Decompose ProfilePage.tsx
- **Status:** Not Started
- **Priority:** P1-1 (High)
- **Estimated Effort:** 2-3 days

**New file structure:**
- [ ] Create `apps/web/src/core/profile/` directory
- [ ] Extract `ProfileHeader.tsx`
- [ ] Extract `ProfileStats.tsx`
- [ ] Extract `ProfileSettings.tsx`
- [ ] Extract `ProfileDangerZone.tsx`
- [ ] Extract `useProfileData.ts`
- [ ] Extract `profile.types.ts`
- [ ] Update imports in ProfilePage.tsx
- [ ] Verify all tests pass

**Metrics:**
```
LOC before: 1060
LOC after: TBD (target: <200 in container)
PR: TBD
```

---

## Sprint 2: Tech Debt Reduction

### Task 2.1: localStorage Migration (Batch 2)
- **Status:** Not Started
- **Priority:** P0-2 (Critical)
- **Estimated Effort:** 3-4 days

**Batches:**
- [ ] Batch 2a: 5 finyk files
- [ ] Batch 2b: 5 fizruk files
- [ ] Batch 2c: 5 nutrition files
- [ ] Batch 2d: 5 routine files

**Metrics:**
```
ESLint allowlist before: 42
ESLint allowlist after: TBD (target: 22)
PR: TBD
```

---

### Task 2.2: Decompose HubDashboard.tsx
- **Status:** Not Started
- **Priority:** P1-1 (High)
- **Estimated Effort:** 2-3 days

**New file structure:**
- [ ] Create components directory structure
- [ ] Extract `HubHeader.tsx`
- [ ] Extract `TodayFocusCard.tsx`
- [ ] Extract `ModuleQuickActions.tsx`
- [ ] Extract `WeeklyProgressChart.tsx`
- [ ] Extract `RecentActivityFeed.tsx`
- [ ] Extract `useHubAggregation.ts`
- [ ] Extract `hub.types.ts`
- [ ] Update container component
- [ ] Verify all tests pass

**Metrics:**
```
LOC before: 902
LOC after: TBD (target: <150 in container)
PR: TBD
```

---

### Task 2.3: Tests for HubReports.tsx
- **Status:** Not Started
- **Priority:** P1-1 (High)
- **Estimated Effort:** 2-3 days

**Test suites to create:**
- [ ] Data Aggregation tests (5 tests)
- [ ] Date Range Filtering tests (3 tests)
- [ ] Export Functionality tests (2 tests)
- [ ] Edge Cases tests (3 tests)

**Metrics:**
```
Coverage before: 0%
Coverage after: TBD (target: 80%)
PR: TBD
```

---

### Task 2.4: Mobile-shell Boundary Tests
- **Status:** Not Started
- **Priority:** P1-3 (High)
- **Estimated Effort:** 2-3 days

**Test suites to create:**
- [ ] Web Compatibility tests (3 tests)
- [ ] Native Bridge tests (3 tests)
- [ ] Deep Links tests (2 tests)

**Metrics:**
```
Tests before: 0
Tests after: TBD (target: 10+)
PR: TBD
```

---

## Sprint 3: Optimization

### Task 3.1: localStorage Migration (Final)
- **Status:** Not Started
- **Priority:** P0-2 (Critical)
- **Estimated Effort:** 3-4 days

**Remaining files:** 22

**Metrics:**
```
ESLint allowlist before: 22
ESLint allowlist after: 0 (target)
Rule enforcement: warn → error
PR: TBD
```

---

### Task 3.2: Remove Backend Code Duplication
- **Status:** Not Started
- **Priority:** P2-1 (Medium)
- **Estimated Effort:** 1-2 days

**Patterns to extract:**
- [ ] `elapsedMs(start)` → `lib/timing.ts`
- [ ] `pantry → prompt` logic → `lib/prompt-builders.ts`
- [ ] FNV-1a hashing → `lib/hash.ts`

**Notes:**
```
OFF/USDA normalizers: Already done (PR #882)
PR: TBD
```

---

### Task 3.3: Migrate `as unknown as X` Patterns
- **Status:** Not Started
- **Priority:** P2-4 (Medium)
- **Estimated Effort:** 2-3 days

**Files to fix:**
- [ ] `useFinykPersonalization.ts` (6 instances)
- [ ] `App.tsx` (3 instances)
- [ ] `VoiceMicButton.tsx` (2 instances)
- [ ] `hubChatUtils.ts` (2 instances)
- [ ] Server files (5 files, 1 each)

**Metrics:**
```
Allowlist before: 9 files
Allowlist after: 0 (target)
PR: TBD
```

---

### Task 3.4: Decompose Large Files (Batch 2)
- **Status:** Not Started
- **Priority:** P1-1 (High)
- **Estimated Effort:** 5-7 days

**Files:**
- [ ] `ActiveWorkoutPanel.tsx` (949 LOC)
- [ ] `HubChat.tsx` (~800 LOC)
- [ ] `Overview.tsx` (~750 LOC)
- [ ] `Workouts.tsx` (894 LOC)
- [ ] `DesignShowcase.tsx` (1064 LOC)

**Metrics:**
```
Large files (>600 LOC) before: 25
Large files (>600 LOC) after: TBD (target: 15)
PR: TBD
```

---

## Sprint 4+: Continuous Improvement

### Task 4.1: Enable Prompt Cache
- **Status:** Not Started
- **Priority:** P1-4 (High)
- **Estimated Effort:** 0.5 days

**Implementation:**
- [ ] Add cacheControl to SYSTEM_PREFIX
- [ ] Verify cache hit metrics
- [ ] Document cost savings

**Metrics:**
```
Monthly savings: TBD (target: $50+)
PR: TBD
```

---

### Task 4.2: Add Sentry Integration
- **Status:** Not Started
- **Priority:** P2-2 (Medium)
- **Estimated Effort:** 1-2 days

**Implementation:**
- [ ] Install @sentry/react
- [ ] Configure Sentry.init()
- [ ] Add ErrorBoundary wrapper
- [ ] Add replay integration
- [ ] Verify error capture

**Metrics:**
```
Error coverage before: 0%
Error coverage after: 100% (target)
PR: TBD
```

---

### Task 4.3: Mobile APM Setup
- **Status:** Not Started
- **Priority:** P0-4 (Critical)
- **Estimated Effort:** 1-2 days

**Implementation:**
- [ ] Install @sentry/react-native
- [ ] Configure Sentry.init()
- [ ] Enable native crash reporting
- [ ] Enable session tracking
- [ ] Verify in Sentry dashboard

**Metrics:**
```
Mobile APM coverage before: 0%
Mobile APM coverage after: 100% (target)
PR: TBD
```

---

### Task 4.4: Bundle Size Optimization
- **Status:** Not Started
- **Priority:** P3 (Low)
- **Estimated Effort:** 2-3 days

**Strategies:**
- [ ] Lazy load Recharts (~30 KB savings)
- [ ] Tree-shake date-fns (~15 KB savings)
- [ ] Split code by route (~20 KB savings)
- [ ] Remove unused icons (~10 KB savings)

**Metrics:**
```
Bundle size before: 615 KB
Bundle size after: TBD (target: 550 KB)
PR: TBD
```

---

### Task 4.5: Lighthouse CI Integration
- **Status:** Not Started
- **Priority:** P3 (Low)
- **Estimated Effort:** 0.5 days

**Implementation:**
- [ ] Create lighthouserc.json
- [ ] Create .github/workflows/lighthouse.yml
- [ ] Set performance budgets
- [ ] Verify PR comments

**Metrics:**
```
LCP before: ~2.5s
LCP after: TBD (target: <2.0s)
PR: TBD
```

---

## Completion Log

| Date | Task | PR | Notes |
|------|------|-----|-------|
| - | - | - | Waiting to start |

---

## Blockers & Issues

| Date | Issue | Status | Resolution |
|------|-------|--------|------------|
| - | - | - | No blockers yet |

---

**Last updated:** 2026-04-28 (initial creation)
