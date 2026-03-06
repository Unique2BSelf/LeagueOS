# League OS Automated Test Matrix

## Purpose

This document turns the current player/admin insurance-registration stories into **automation-ready test coverage**.
It is written against the **current League OS codebase**, not an idealized future product.

Use this matrix before rewriting the user stories. It forces exact assertions, identifies current gaps, and separates:

- what should be tested now
- what is blocked by missing features
- what should become contract tests once the product behavior is finalized

## Current Test Reality

- There is **no real test runner configured** in [package.json](/C:/Users/25K%20Gamer/Documents/LeagueOS/package.json).
- The existing test stub in [registration.test.ts](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/__tests__/registration.test.ts) is not production-usable.
- The best automation split for this app is:
  - `API`: route-level or integration tests for auth, insurance, registration, admin mutations, exports
  - `E2E`: Playwright for browser flows, redirects, forms, Stripe redirect handling, admin UI flows

## Recommended Test Stack

- `Vitest` for fast API/integration tests
- `Playwright` for browser/E2E flows
- Prisma test database or isolated schema for integration runs
- deterministic seed helpers for:
  - players
  - admins
  - seasons
  - pricing tiers
  - insurance policies
  - registrations
  - discount codes

## Test Data Conventions

- `adult_player@example.com`: valid adult player
- `underage_player@example.com`: under-18 registration scenario
- `admin@example.com`: admin operator
- `season_spring_2026`: active season
- `season_fall_2026`: second season
- `insurance_active`
- `insurance_expired`
- `registration_pending`
- `registration_paid`

## Coverage Legend

- `P0`: business-critical
- `P1`: important
- `P2`: useful but lower-risk
- `Now`: should be automated against current code now
- `Blocked`: requires product/code changes first

---

## Epic A: Account Creation

### A-01 Create account with valid adult data

- Priority: `P0`
- Story source: Player Story 1
- Automation: `API` and `E2E`
- Preconditions:
  - email not already registered
- Steps:
  - submit registration with full name, email, password, photo URL, adult DOB/age field once implemented
- Expected API:
  - `201`
  - response includes public user object
  - session cookie is set
- Expected UI:
  - user lands on login or dashboard consistently
- Current code reality:
  - [register route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/auth/register/route.ts) requires `fullName`, `email`, `password`, `photoUrl`
  - there is **no age field** and **no email verification**
- Status: `Blocked` for full story, `Now` for current minimal registration flow

### A-02 Reject duplicate email

- Priority: `P0`
- Story source: Player Story 1
- Automation: `API`, `E2E`
- Preconditions:
  - user already exists with target email
- Expected API:
  - `400`
  - `{ error: 'Email already registered' }`
- Expected UI:
  - inline error message shown, form not cleared
- Status: `Now`

### A-03 Reject missing required registration fields

- Priority: `P0`
- Automation: `API`, `E2E`
- Cases:
  - missing email
  - invalid email format
  - missing password
  - missing photo
- Expected API:
  - `400`
- Current mismatch:
  - invalid email format validation is not explicit in the route today
- Status: `Now` for missing fields, `Blocked` for robust email format validation unless added

### A-04 Prevent privileged role assignment at registration

- Priority: `P0`
- Automation: `API`
- Preconditions:
  - anonymous user attempts registration with `role=ADMIN|MODERATOR|REF`
- Expected API:
  - created user role is always `PLAYER`
- Current code:
  - enforced in [register route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/auth/register/route.ts)
- Status: `Now`

### A-05 Email verification flow

- Priority: `P1`
- Story source: Player Story 1
- Automation: `API`, `E2E`
- Expected behavior:
  - verification token issued
  - email sent
  - unverified account restrictions defined
- Current mismatch:
  - not implemented
- Status: `Blocked`

---

## Epic B: Annual Insurance Payment

### B-01 Show insurance purchase option to logged-in uninsured player

- Priority: `P0`
- Story source: Player Story 2
- Automation: `E2E`
- Preconditions:
  - authenticated player
  - no active insurance policy
- Expected UI:
  - purchase option visible on dashboard/profile/registration flow
- Current code touchpoints:
  - [insurance API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/insurance/route.ts)
  - [users me route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/users/me/route.ts)
- Status: `Now`

### B-02 Purchase annual insurance successfully

- Priority: `P0`
- Automation: `API`, `E2E`
- Preconditions:
  - authenticated player
  - Stripe Sandbox configured for dev
- Expected API:
  - insurance policy created
  - status becomes active
  - `endDate = startDate + 365 days`
- Expected UI:
  - success confirmation and updated insured state
- Current mismatch:
  - confirmation email/receipt not fully specified or validated
- Status: `Now` for purchase/state, `Blocked` for email receipt if absent

### B-03 Block league registration when insurance is missing

- Priority: `P0`
- Story source: Player Stories 2 and 3
- Automation: `API`, `E2E`
- Preconditions:
  - authenticated player without active insurance
- Expected product behavior:
  - registration blocked or clearly split into registration fee + insurance purchase step
- Current code reality:
  - [registrations route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/registrations/route.ts) does **not** block registration; it marks `insuranceStatus='REQUIRED'` and adds `50` to amount
- Status: `Now` as a **current behavior test**
- Rewrite note:
  - decide whether product should truly block or bundle insurance into checkout

### B-04 Handle failed insurance payment

- Priority: `P0`
- Automation: `API`, `E2E`
- Expected:
  - failed checkout does not create active insurance
  - user sees recoverable error
- Status: `Blocked` unless insurance flow is Stripe-backed and failure states are exposed

### B-05 Insurance receipt/confirmation delivery

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - email or downloadable receipt exists
- Current mismatch:
  - no formal mail assertion path in repo
- Status: `Blocked`

---

## Epic C: League Registration as Free Agent

### C-01 List active seasons for registration

- Priority: `P0`
- Story source: Player Story 3
- Automation: `API`, `E2E`
- Expected API:
  - active seasons available from [seasons route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/seasons/route.ts)
- Expected UI:
  - registration form shows season dropdown
- Status: `Now`

### C-02 Create free-agent registration with active insurance

- Priority: `P0`
- Automation: `API`, `E2E`
- Preconditions:
  - authenticated player
  - active insurance exists
  - season exists
- Expected API:
  - registration created
  - amount based on pricing tier and pro-ration
  - `insuranceStatus='VALID'` or `EXPIRING_SOON`
- Current mismatch:
  - free-agent flag is user-level, not clearly part of registration payload
- Status: `Now` for registration creation, `Blocked` for explicit free-agent registration assertion unless product contract is clarified

### C-03 Apply discount code during registration

- Priority: `P1`
- Automation: `API`
- Preconditions:
  - active season
  - valid discount code
- Expected:
  - discounted amount returned
  - `currentUses` increments
- Code path:
  - [registrations route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/registrations/route.ts)
- Status: `Now`

### C-04 Reject duplicate season registration

- Priority: `P0`
- Automation: `API`, `E2E`
- Expected API:
  - `400`
  - `{ error: 'Already registered for this season' }`
- Status: `Now`

### C-05 Enforce waiver requirement when season form requires it

- Priority: `P0`
- Automation: `API`, `E2E`
- Preconditions:
  - registration form has `requireWaiver=true`
- Expected API:
  - `400`
  - `{ error: 'Waiver acceptance is required' }`
- Status: `Now`

### C-06 Complete paid registration via Stripe

- Priority: `P0`
- Automation: `E2E`
- Preconditions:
  - season fee > 0
  - Stripe sandbox available
- Expected:
  - checkout session created
  - redirect to Stripe
  - webhook or completion route marks registration `paid=true`, `status='APPROVED'`
- Status: `Now`

### C-07 Handle failed or abandoned season payment

- Priority: `P0`
- Automation: `E2E`
- Expected:
  - registration remains unpaid/pending
  - no false approval
- Status: `Now`

### C-08 Free agent status reflected after registration

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - user remains discoverable as free agent if that is selected
- Current mismatch:
  - product contract is not precise enough
- Status: `Blocked`

---

## Epic D: Admin Insurance Record Management

Note: these stories should be renamed from “Annual Registration” to **Insurance Policy / Insurance Record**.

### D-01 Admin creates insurance record manually

- Priority: `P0`
- Story source: Admin Story 4
- Automation: `API`, `E2E`
- Preconditions:
  - authenticated admin
  - target player exists
- Expected:
  - insurance policy created with amount, payment status, effective dates
  - user coverage reflects new active policy
- Current mismatch:
  - no dedicated “Create Annual Registration” admin form exists as described
- Status: `Blocked` for exact story, `Now` if using current insurance admin endpoints

### D-02 Prevent duplicate insurance record for same player/year when business rule requires uniqueness

- Priority: `P0`
- Automation: `API`
- Expected:
  - duplicate conflicting entry rejected
- Current mismatch:
  - uniqueness by “year” is not encoded in schema today
- Status: `Blocked`

### D-03 View insurance records list by player/status/date

- Priority: `P0`
- Story source: Admin Story 5
- Automation: `API`, `E2E`
- Expected:
  - searchable/filterable admin list
  - access restricted to admin roles
- Current mismatch:
  - current admin UI/API coverage needs confirmation; likely partial
- Status: `Partial`

### D-04 View insurance detail with payment history

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - player insurance detail joins payment/ledger history
- Current code candidates:
  - [users id route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/users/%5Bid%5D/route.ts)
- Status: `Partial`

### D-05 Edit insurance record

- Priority: `P0`
- Story source: Admin Story 6
- Automation: `API`, `E2E`
- Expected:
  - pre-populated edit form
  - validation on negative fee / invalid expiration
  - saved changes reflected immediately
- Status: `Partial`

### D-06 Soft delete insurance record

- Priority: `P1`
- Story source: Admin Story 7
- Automation: `API`, `E2E`
- Expected:
  - confirmation prompt
  - record marked inactive, not destroyed
  - history preserved
- Current mismatch:
  - no explicit insurance soft-delete contract is defined
- Status: `Blocked`

### D-07 Prevent deleting coverage linked to active paid registration

- Priority: `P0`
- Automation: `API`
- Expected:
  - delete blocked with validation error
- Status: `Blocked`

### D-08 Audit log on create/edit/delete insurance record

- Priority: `P0`
- Automation: `API`
- Expected:
  - actor, target, timestamp, before/after, action type
- Current mismatch:
  - no formal audit log model/route exists
- Status: `Blocked`

### D-09 Notify player of admin insurance changes

- Priority: `P2`
- Automation: `API`, `E2E`
- Expected:
  - email/notification optional and traceable
- Status: `Blocked`

---

## Epic E: Reports and Exports

### E-01 Filter insurance compliance report by season/status/date

- Priority: `P0`
- Story source: Admin Story 8
- Automation: `API`, `E2E`
- Expected:
  - filter inputs produce stable dataset
  - columns:
    - player name
    - email
    - insurance paid date
    - expiration
    - status
- Current mismatch:
  - no formal reporting endpoint currently aligned to this contract
- Status: `Blocked`

### E-02 Export report as CSV

- Priority: `P0`
- Story source: Admin Story 9
- Automation: `API`, `E2E`
- Expected:
  - downloadable CSV
  - headers reflect filtered dataset
  - only authenticated admins can fetch it
- Status: `Blocked`

### E-03 Export report as Excel/PDF

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - file type correct
  - exported data matches current filters
- Status: `Blocked`

### E-04 Show summary counts on report

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - total paid
  - total unpaid
  - total expired
- Status: `Blocked`

### E-05 Empty report handling

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - no crash
  - user-friendly empty state
  - export disabled or empty file behavior defined
- Status: `Blocked`

---

## Epic F: Season Management

### F-01 Admin creates season successfully

- Priority: `P0`
- Story source: Admin Story 10
- Automation: `API`, `E2E`
- Preconditions:
  - authenticated admin
- Expected API:
  - season created with name, dates, roster settings
- Code path:
  - [seasons route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/seasons/route.ts)
- Current mismatch:
  - fee/description are not part of season create contract today
- Status: `Now` for current season create route, `Blocked` for full story

### F-02 Non-admin cannot create season

- Priority: `P0`
- Automation: `API`
- Expected:
  - `403`
  - `{ error: 'Admin only' }`
- Status: `Now`

### F-03 Prevent overlapping seasons when rule is enabled

- Priority: `P1`
- Story source: Admin Story 10
- Automation: `API`
- Expected:
  - overlapping dates rejected
- Current mismatch:
  - not implemented in [seasons route](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/seasons/route.ts)
- Status: `Blocked`

### F-04 Newly created season appears in registration flows

- Priority: `P0`
- Automation: `API`, `E2E`
- Expected:
  - new season visible in player season selection
- Status: `Now`

### F-05 Audit season creation

- Priority: `P1`
- Automation: `API`
- Current mismatch:
  - no audit log system
- Status: `Blocked`

---

## Epic G: Reverse-Flow Admin Verification

Note: this is **not** a user story. It is a QA scenario.

### G-01 Admin validates player season registration path

- Priority: `P1`
- Story source: Admin Story 11, converted to QA scenario
- Automation: `E2E`
- Expected:
  - active seasons shown
  - price reflects season/pricing tier
  - successful checkout updates correct season registration
- Status: `Now`

### G-02 Admin verifies season-specific reporting after registration

- Priority: `P1`
- Automation: `API`, `E2E`
- Expected:
  - reports break down by season correctly
- Status: `Blocked` until reporting exists

---

## Minimum First Automation Slice

These are the first tests worth implementing immediately:

1. `A-02` duplicate email rejection
2. `A-04` forced `PLAYER` role on registration
3. `B-02` insurance purchase success
4. `C-04` duplicate season registration rejection
5. `C-05` waiver enforcement
6. `C-06` Stripe registration checkout success
7. `F-02` non-admin season create blocked
8. `F-04` newly created season appears in registration flow

These give the best return first because they cover auth, money flow, access control, and core registration state.

## Proposed Automation File Layout

If you want these implemented next, use this structure:

```text
tests/
  api/
    auth.register.test.ts
    insurance.test.ts
    registrations.test.ts
    seasons.test.ts
  e2e/
    account-creation.spec.ts
    insurance-purchase.spec.ts
    free-agent-registration.spec.ts
    admin-season-management.spec.ts
  helpers/
    seed.ts
    auth.ts
    prisma.ts
```

## Rewrite Guidance For The Stories

Before rewriting the user stories, tighten the following:

- Replace “annual registration” with `insurance record` where that is the real domain object
- Define exact status codes and enum values
- Define exact redirect targets
- Decide whether missing insurance:
  - blocks league registration outright, or
  - adds insurance purchase to checkout
- Decide whether email verification is required before login, before payment, or before play
- Define audit log requirements as a concrete data contract

## Recommendation

Implement the **minimum first automation slice** before rewriting all stories.  
That will force the product contract to become precise and will expose the remaining ambiguity fast.
