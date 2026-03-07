# Current State Handoff

This is the current implementation and deployment handoff for LeagueOS. Use it as the first resume point before continuing work.

Reference set:
- Baseline spec: [00_PRODUCT_VISION_PRD.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/00_PRODUCT_VISION_PRD.md)
- Pre-live blockers: [09_PRELIVE_CHECKLIST.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/09_PRELIVE_CHECKLIST.md)
- Product revisions: [10_PRD_REVISION_LOG.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/10_PRD_REVISION_LOG.md)
- Test planning: [07_AUTOMATED_TEST_MATRIX.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/07_AUTOMATED_TEST_MATRIX.md)

## Resume Prompt

Use this when returning to the project:

`Resume LeagueOS from C:\Users\25K Gamer\Documents\LeagueOS-main using docs/09_PRELIVE_CHECKLIST.md, docs/10_PRD_REVISION_LOG.md, and docs/11_CURRENT_STATE_HANDOFF.md`

## Repo And Deploy State

- Primary repo: [LeagueOS-main](/C:/Users/25K%20Gamer/Documents/LeagueOS-main)
- Canonical branch: `main`
- Current source commit: `b6550b8`
- GitHub remote: `git@github.com:Unique2BSelf/LeagueOS.git`

Deploy targets:
- Dev app dir: `/opt/league-os`
- Prod app dir: `/opt/league-os-prod`
- Dev URL: [dev.corridor.soccer](https://dev.corridor.soccer)
- Prod URL: [corridor.soccer](https://corridor.soccer)

Runtime:
- Local Git is configured and working
- Local Node exists, but VPS Node 22 is the deployment compatibility gate
- VPS app services are pinned to `/opt/node-v22.22.0-linux-x64`

Service names:
- `league-os-dev.service`
- `league-os-prod.service`

## Current Deployment Reality

- Dev is ahead of prod.
- Dev includes:
  - sub eligibility cleanup
  - referee center consolidation
  - persisted maintenance, volunteer, and match-center state
- Prod was last explicitly updated to `0ccbb44` during the insurance Playwright pass.
- Before promoting the latest dev work to prod, run:
  - `git pull origin main`
  - `npx prisma db push`
  - `npm run build`
  - `systemctl restart league-os-prod.service`

## MVP Status

League MVP status is roughly `80-85%`.

Working core lanes:
- account creation and session auth
- annual insurance gating
- season registration
- Stripe-backed registration and insurance payments
- team creation
- divisions
- rostering and direct admin roster assignment
- official roster lifecycle
- schedule generation
- public schedule presentation
- player availability
- sub requests

Operationally improved modules:
- disciplinary review, fines, and auto-unlock on payment
- reports, CSV export, and audit logs
- private file storage and team jersey uploads
- field and location management
- season-specific rules editor
- communications shell

## Highest-Value Completed Fixes

- Durable Prisma-backed payment records replaced in-memory payment state
- Insurance gating now blocks season registration correctly
- Insurance purchases now go through Stripe instead of silently self-marking insured
- Team, division, and roster workflows were reorganized into a usable admin flow
- Team archive and unarchive are back
- Referee tools were consolidated into a session-backed center
- Maintenance, volunteer shifts, and match-center state are now persisted

## Current Top Gaps

Still weak or incomplete:
- analytics is still largely mock or synthetic
- chat is still partial relative to the PRD:
  - SSE instead of full websocket/socket.io parity
  - no full moderation/report/mute workflow
  - no real direct-message model
- identity photo/liveness is still not hardened enough for the PRD standard
- fundraising and directory remain largely mock
- background-check provider integration is still manual review, not vendor-backed
- SMTP is still not configured, so outbound emails are stored but skipped

## Testing State

Automated coverage exists in both API and browser layers.

Route/API coverage includes:
- auth
- insurance
- registrations
- payments
- reports and audit logs
- rosters
- disciplinary
- sub eligibility
- referee jobs
- maintenance
- volunteer shifts
- match center

Playwright coverage currently includes:
- registration
- team flow
- schedule flow
- availability and sub requests
- insurance gating flow

Important note:
- Browser coverage is meaningful for MVP, but not broad enough for the whole PRD.

## Known Operational Notes

- SMTP is still unresolved. Do not block product work on it.
- Receipt and communication emails are recorded, but actual delivery is skipped until SMTP is configured.
- The identity photo flow still needs a formal hardening pass before live.
- Advanced analytics should either be rebuilt with real data or explicitly de-scoped from MVP.

## Recommended Next Moves

If continuing product work:
1. Promote the latest dev state to prod after validating the persisted ops changes.
2. Tackle analytics honestly:
   - rebuild from real data, or
   - de-scope and label it clearly
3. Decide whether chat is launch-critical. If yes, finish it properly. If no, de-scope it from MVP.

If focusing on stability:
1. Expand Playwright around the newest insurance and referee flows.
2. Add deployment runbook notes for dev -> prod promotion.
3. Continue closing remaining pre-live checklist items.

## Recent Important Commits

- `b6550b8` Persist ops and match center state
- `7c401f1` Consolidate referee center workflows
- `f383794` Replace mock sub eligibility route
- `0ccbb44` Handle idempotent insurance return state
- `1ddff2a` Make insurance payment finalization idempotent
- `56662cd` Route insurance purchase through Stripe
- `f435879` Surface and enforce annual insurance
- `62691a3` Fix insurance registration gating
- `b666867` Persist payment records in Prisma

## Resume Rule

When resuming work, read these in order:
1. [11_CURRENT_STATE_HANDOFF.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/11_CURRENT_STATE_HANDOFF.md)
2. [09_PRELIVE_CHECKLIST.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/09_PRELIVE_CHECKLIST.md)
3. [10_PRD_REVISION_LOG.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/10_PRD_REVISION_LOG.md)
