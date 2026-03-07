# PRD Revision Log

This document tracks material additions, corrections, and workflow revisions that have been implemented after the baseline PRD in [00_PRODUCT_VISION_PRD.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/00_PRODUCT_VISION_PRD.md).

Current execution handoff:
- [11_CURRENT_STATE_HANDOFF.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/11_CURRENT_STATE_HANDOFF.md)

Use this file for:
- product behavior added after the original PRD was written
- workflow corrections where the implementation needed a clearer operator flow
- MVP scope clarifications
- implementation notes that should survive beyond chat history

## 2026-03-07

### Dashboard Information Architecture Reorganization
- Status: Implemented
- Why: The original dashboard structure had drifted into duplicated dropdowns and mismatched entry points. Features existed but were hard to find.
- Revision:
  - unified dashboard navigation under a shared nav model
  - grouped features by actual operational use instead of ad hoc growth
  - exposed previously buried league-op features in the dashboard shell
- Affected implementation:
  - [dashboard-nav.ts](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/lib/dashboard-nav.ts)
  - [dashboard layout](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/layout.tsx)
  - [dashboard page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/page.tsx)

### Teams, Divisions, and Rostering Workflow Correction
- Status: Implemented
- Why: The original app had team creation, division data, and roster controls, but the operator flow was fragmented and not usable for real league administration.
- Revision:
  - season page now acts as the league control surface for:
    - divisions
    - teams within divisions
    - team approval actions
  - team creation is now driven by real seasons/divisions instead of placeholder division values
  - team page now acts as the roster management surface
  - admins can roster players directly on the team page without an invite code
- Revised workflow:
  - `Season -> Division -> Team -> Roster`
- Affected implementation:
  - [divisions API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/divisions/route.ts)
  - [admin roster API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/admin/rosters/route.ts)
  - [season detail](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/seasons/%5Bid%5D/page.tsx)
  - [team create](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/teams/create/page.tsx)
  - [team detail](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/teams/%5Bid%5D/page.tsx)

### Official Roster Lifecycle and Bulk Team Operations
- Status: Implemented
- Why: The original PRD and later MVP discussion required league-usable roster administration, but the product still lacked a formal team roster lifecycle and bulk operator controls.
- Revision:
  - teams now carry an explicit official roster lifecycle:
    - `DRAFT`
    - `SUBMITTED`
    - `FINALIZED`
  - season operations page now supports:
    - search
    - approval filtering
    - roster fullness filtering
    - roster workflow filtering
    - bulk approval
    - bulk submission/finalization/reopen actions
  - team page now exposes official roster lifecycle controls directly where captains and admins manage the roster
  - finalized rosters are protected from captain edits until reopened
  - admin override edits automatically reopen finalized rosters and are audited
- Affected implementation:
  - [season detail](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/seasons/%5Bid%5D/page.tsx)
  - [team detail](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/teams/%5Bid%5D/page.tsx)
  - [admin teams API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/admin/teams/route.ts)
  - [team roster status API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/teams/%5Bid%5D/roster-status/route.ts)
  - [team roster API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/teams/%5Bid%5D/players/route.ts)

### Admin Direct Roster Assignment
- Status: Implemented
- Why: League administrators need a direct override path that does not depend on invite codes or captain-mediated join requests.
- Revision:
  - admin can assign a player directly to a team
  - admin can move a player between teams in the same season
  - admin can remove a player from a team
  - all of these actions are audited
- Note:
  - this is intentionally separate from the captain invite/join-request workflow
- Affected implementation:
  - [admin roster API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/admin/rosters/route.ts)
  - [team detail](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/teams/%5Bid%5D/page.tsx)
  - [user detail](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/users/%5Bid%5D/page.tsx)

### Communications Module
- Status: Implemented
- Why: The PRD called for league communication capabilities, but the feature was not actually present in the product.
- Revision:
  - added admin communications module
  - audience targeting supports players, referees, seasons, divisions, teams, and all players
  - outbound emails are persisted in DB whether SMTP sends or skips them
- Affected implementation:
  - [communications page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/communications/page.tsx)
  - [communications API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/admin/communications/route.ts)
  - [email lib](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/lib/email.ts)

### Disciplinary Review, Fines, and Auto-Unlock Flow
- Status: Implemented
- Why: The original product intent required referee-reported cards, board/admin review, fine assignment, and player lock/unlock behavior, but the shipped implementation was a mock page with no persisted workflow.
- Revision:
  - referees can now create pending disciplinary reports
  - moderators/admins review and approve or reject the report
  - approval creates the fine ledger entry and locks the player
  - players can pay the disciplinary fine through Stripe Checkout from the payments page
  - once the fine is paid, the player is automatically unlocked and the disciplinary action is released
  - admins can also create manual disciplinary actions outside a specific match
- Affected implementation:
  - [disciplinary API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/disciplinary/route.ts)
  - [disciplinary page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/disciplinary/page.tsx)
  - [payments API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/payments/route.ts)
  - [payments page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/payments/page.tsx)
  - [discipline lib](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/lib/discipline.ts)

### Reporting, Export, and Audit Logging
- Status: Implemented
- Why: The original PRD required operational reporting and traceability, but the product lacked a consistent audit trail and usable compliance reporting.
- Revision:
  - added insurance/registration compliance reporting
  - added CSV export
  - added persistent audit logs for sensitive admin mutations
- Affected implementation:
  - [reports page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/reports/page.tsx)
  - [audit logs page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/audit-logs/page.tsx)
  - [reports API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/admin/reports/insurance/route.ts)
  - [audit API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/admin/audit-logs/route.ts)

### File Storage Rebuild
- Status: Implemented
- Why: The prior file UI was effectively a mock browser and did not meet the PRD’s operational needs.
- Revision:
  - private document storage with metadata in Prisma
  - signed downloads
  - visibility categories for owner/team/league/admin-only access
- Affected implementation:
  - [files page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/files/page.tsx)
  - [files API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/files/route.ts)
  - [file storage lib](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/lib/file-storage.ts)

### Stripe Checkout For Dev
- Status: Implemented on dev
- Why: The original payment flow was mock-only and not operational.
- Revision:
  - dev now uses real Stripe Checkout session creation
  - Stripe webhook verification is implemented for dev
  - app-managed receipt/thank-you emails exist pending SMTP delivery setup
- Affected implementation:
  - [payments API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/payments/route.ts)
  - [payments webhook](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/payments/webhook/route.ts)
  - [payments lib](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/lib/payments.ts)

### Season-Specific Rules Management
- Status: Implemented
- Why: The public rules page was hardcoded and not season-aware, while league operations require admins to publish and revise rules per season.
- Revision:
  - added one rules document per season in the database
  - admins can edit a season's public rules from season management
  - public `/rules` now loads published rules by selected season instead of fixed placeholder copy
- Affected implementation:
  - [rules API](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/api/rules/route.ts)
  - [season rules editor](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/dashboard/seasons/%5Bid%5D/rules/page.tsx)
  - [public rules page](/C:/Users/25K%20Gamer/Documents/LeagueOS/src/app/rules/page.tsx)

## Usage Notes

- If a change corrects an error in the original PRD, update the PRD and record the correction here.
- If a change is a genuine product revision or scope addition, record it here first and only fold it into the PRD once it is stable.
- Link future automated coverage changes here when they materially change confidence in a workflow.
