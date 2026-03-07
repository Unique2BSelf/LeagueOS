# Pre-Live Checklist

This is the canonical pre-live tracker for LeagueOS. It supersedes older implied launch-readiness claims in summary docs.

Reference:
- Baseline spec: [00_PRODUCT_VISION_PRD.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/00_PRODUCT_VISION_PRD.md)
- Product revisions and additions: [10_PRD_REVISION_LOG.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/10_PRD_REVISION_LOG.md)
- Current implementation handoff: [11_CURRENT_STATE_HANDOFF.md](/C:/Users/25K%20Gamer/Documents/LeagueOS-main/docs/11_CURRENT_STATE_HANDOFF.md)

## Active Items

### Playwright coverage for critical MVP flows
- Status: In progress
- Why it matters before live: The MVP flows need browser-level regression coverage so auth, registration, payment redirects, and admin actions do not silently break.
- Current state: Registration Playwright coverage is live on dev. Team, roster, schedule, availability, and sub-request flows are not yet covered.
- Done when:
  - account creation is covered
  - season registration is covered
  - team create/join/roster is covered
  - schedule generation/view is covered
  - availability is covered
  - sub requests are covered

### Expand API tests for blocked contract areas
- Status: In progress
- Why it matters before live: Some business rules still rely on assumptions rather than locked contracts, which leaves critical admin/reporting/payment behavior open to regressions.
- Current state: Route-level Vitest coverage exists for auth, insurance, registrations, payments, seasons, reports, and audit logs. Reporting/export edge cases, audit completeness, and some remaining business rules are not fully covered.
- Done when:
  - insurance gating behavior is fully covered
  - reporting/export edge cases are covered
  - audit log behavior is covered for all sensitive admin mutations in MVP scope
  - remaining registration/payment edge cases are covered

### Strengthen identity photo verification
- Status: Pending
- Why it matters before live: Player identity drives eligibility, check-in, anti-ringer enforcement, and disciplinary trust. The current production liveness/photo flow is not strong enough to treat as a hardened identity control.
- Current state: Dev has an E2E-only test photo bypass enabled for browser automation. Production does not use that bypass, but the live liveness/photo flow still needs a formal hardening decision.
- Done when:
  - production has no test bypass enabled
  - the liveness/photo verification approach is explicitly approved
  - server-side validation rules are defined
  - manual review workflow exists for failed or suspicious captures
  - admin overrides are audited
  - anti-spoof policy is defined for screenshots, uploads, and reused photos
