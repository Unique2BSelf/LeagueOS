# FULL PRD COMPLIANCE CHECKLIST - League OS

## Phase 1: Foundation & Identity ✅
- [x] User can register with email/password (no photo required now)
- [x] User can login and get session
- [x] User roles: ADMIN, MODERATOR, REF, CAPTAIN, PLAYER, SPONSOR
- [x] User model has all required fields
- [x] Live photo capture component exists
- [x] Digital ID page shows QR code and user info
- [x] Locked ID state shows full-screen red overlay

## Phase 2: Financials & Compliance

### 2.1 Stripe/Payment (STUB - needs API keys)
- [x] Escrow target per team (currentBalance tracks toward target)
- [x] Team confirmed when currentBalance >= escrowTarget
- [x] Split payment support UI
- [x] Captain can pay for team
- [x] Fines create Ledger entries (Disciplinary UI)
- [ ] Real Stripe integration - STUB ONLY

### 2.2 1099-NEC Engine ✅
- [x] Track Ledger where type = REF_PAYOUT && year = currentYear
- [x] Flag users with SUM(amount) >= 2000 for 1099
- [x] PDF generation endpoint (Copy B for ref, Copy A for league)
- [x] TaxIdEncrypted decrypted only during PDF generation
- [x] API: GET /api/taxes/1099?userId=X&year=Y

### 2.3 Background Checks ✅
- [x] BackgroundCheck model with: userId, provider, status, resultUrl, expiresAt
- [x] Status values: PENDING, CLEAR, FAIL
- [x] Block ref job board if not CLEAR
- [x] API: POST /api/background-checks/initiate

### 2.4 Fundraising ✅
- [x] FundraisingCampaign model
- [x] Public donation page with progress bar
- [x] API: POST /api/fundraising/donate
- [x] Ledger type: DONATION

## Phase 3: Scheduling & Match Operations ✅

### 3.1 Equity Scheduler ✅
- [x] Round-robin base scheduling
- [x] Track qualityScore per team
- [x] Variance check: no team exceeds league avg by >10%
- [x] Support blackout dates
- [x] Jersey conflict detection (RGB delta < threshold)
- [x] API: POST /api/scheduler

### 3.2 Match Center ✅
- [x] Pre-game checklist (4 items)
- [x] Live timer with minute tracking
- [x] Score entry (GOAL, YELLOW_CARD, RED_CARD events)
- [x] Mandatory finalize within 4 hours
- [x] No-show lockout
- [x] API: /api/match-center

### 3.3 Referee Job Board ✅
- [x] Self-select games from job board
- [x] Background check gate (must be CLEAR)
- [x] Certification upload requirement
- [x] Payout tracking
- [x] API: /api/ref/jobs

### 3.4 Sub Marketplace ✅
- [x] 1-Down/Any-Up rule: homeDivision >= matchDivision - 1 OR isGoalie=true
- [x] Goalie exception: ignore division restriction
- [x] Ringer flag: eloRating > divisionAvg * 1.5
- [x] Insurance required
- [x] Seasonal quota per team
- [x] API: /api/subs/eligibility

### 3.5 Volunteer Shifts ✅
- [x] VolunteerShift model: userId, eventId, role, hours, status
- [x] Volunteer job board
- [x] Sign-up → auto-assign to event
- [x] Hour tracking
- [x] API: GET /api/volunteers/shifts

### 3.6 Field Maintenance ✅
- [x] MaintenanceLog model: fieldId, issue, status, notes
- [x] Field calendar view
- [x] Booking conflict prevention
- [x] API: POST /api/maintenance/log

## Phase 4: Community & Analytics ✅

### 4.1 Chat (Socket.io STUB)
- [x] Global/division/team/1-1 rooms
- [x] Real-time via Socket.io (STUB - needs custom server)
- [x] Moderation: delete, mute, report
- [x] API: /api/chat

### 4.2 Business Directory ✅
- [x] Business model: userId, name, category, discount, logoUrl, contactInfo
- [x] Search by category
- [x] Privacy toggle (hideFromDirectory)
- [x] Discount display: "15% off with ID"

### 4.3 Analytics Dashboard ✅
- [x] Attendance heatmaps
- [x] Sub usage by division
- [x] Retention charts
- [x] Revenue breakdowns

## Phase 5: Disciplinary & V2 ✅

### 5.1 Red Card Fine Lock ✅
- [x] DisciplinaryAction: userId, matchId, cardType, fineAmount, isPaid, isReleased
- [x] Auto-create Ledger entry on red card
- [x] Set user.isActive = false when fine unpaid
- [x] Digital ID shows RED "Locked – Pay Fine"
- [x] Admin "Review & Release" action
- [x] UI: /dashboard/disciplinary

### 5.2 Jersey Conflict Detection ✅
- [x] Check primaryColor RGB delta < threshold
- [x] Flag match → notify away captain 72h prior
- [x] Suggest secondary kit (in scheduler API)

## UI/UX Requirements ✅

### Styling (Dark Glassmorphism)
- [x] All cards use .glass-card class
- [x] .glass-card: background rgba(255,255,255,0.05), backdrop-filter blur(15px)
- [x] Background: #121212 (OLED Black)
- [x] Accent: #00F5FF (Electric Cyan)
- [x] Alert: #FF3B3B (Crimson Red)
- [x] Text primary: #E0E0E0
- [x] Text secondary: #AAAAAA

### Components ✅
- [x] Verified badge with shimmer animation
- [x] Locked ID overlay (full-screen red)
- [x] Heatmap component for analytics
- [x] Mobile bottom nav with glass effect
- [x] Progress bar for fundraising

### PWA ✅
- [x] manifest.json
- [x] service worker for offline
- [x] Mobile-first responsive

## API Endpoints ✅ (All Implemented)

### Auth ✅
- [x] POST /api/auth/register
- [x] POST /api/auth/login

### Teams ✅
- [x] GET /api/teams
- [x] POST /api/teams
- [x] POST /api/teams/join

### Matches ✅
- [x] GET /api/matches
- [x] POST /api/matches

### Subs ✅
- [x] GET /api/subs
- [x] POST /api/subs
- [x] POST /api/subs/eligibility

### Finance ✅
- [x] GET /api/ledger
- [x] POST /api/ledger
- [x] GET /api/taxes/1099

### Background ✅
- [x] POST /api/background-checks/initiate
- [x] GET /api/background-checks/status

### Fundraising ✅
- [x] GET /api/campaigns
- [x] POST /api/campaigns
- [x] POST /api/fundraising/donate

### Volunteers ✅
- [x] GET /api/volunteers/shifts
- [x] POST /api/volunteers/shifts

### Maintenance ✅
- [x] GET /api/maintenance
- [x] POST /api/maintenance/log

### Scheduler ✅
- [x] GET /api/scheduler
- [x] POST /api/scheduler

### Ref Jobs ✅
- [x] GET /api/ref/jobs
- [x] POST /api/ref/jobs

### Match Center ✅
- [x] GET /api/match-center
- [x] POST /api/match-center

### Chat ✅
- [x] GET /api/chat
- [x] POST /api/chat
- [x] PATCH /api/chat (moderation)

### Analytics ✅
- [x] GET /api/analytics

## Remaining External Dependencies (Need API Keys)
- Stripe payment processing (needs API keys)
- Socket.io server (needs custom server setup)
- Twilio SMS (needs API keys)
- SendGrid email (needs API keys)
- Checkr/Sterling background checks (needs API keys)

## Added: Season Registration & Insurance Tracking (per user feedback)

### Registration Model ✅
- [x] Registration model: userId, seasonId, status, paid, insuranceStatus
- [x] One registration per user per season (unique constraint)
- [x] Insurance status tracking: PENDING, VALID, EXPIRED, REQUIRED
- [x] API: GET/POST /api/registrations

### Insurance 365-Day Token ✅ (per PRD "insurance hard-gate")
- [x] InsurancePolicy model with 365-day endDate
- [x] Auto-check insurance validity on registration
- [x] Days until expiry calculation
- [x] Expiring soon flag (within 30 days)
- [x] Insurance purchase/renewal API
- [x] API: GET/POST/PATCH /api/insurance

### Tiered Pricing ✅ (per PRD "early bird → late fees")
- [x] PricingTier model: name, startDate, endDate, amount
- [x] Dynamic fee calculation based on current date
- [x] API: GET/POST /api/pricing

### Gaps Now Closed
- Season registration flow
- 365-day insurance tracking with auto-expiry
- Tiered pricing for early bird/regular/late registration
