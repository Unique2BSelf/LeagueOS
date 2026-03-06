# Rewritten User Stories: Registration, Insurance, Seasons

## Scope

These stories replace the loose originals with **testable contracts**.
They are aligned to the current League OS architecture:

- account creation
- annual insurance policy
- season registration
- admin insurance management
- season management
- reporting/export requirements

Where the current app does not yet implement the requirement, that is called out explicitly.

---

## Player Stories

### P-01 Create Account

As an adult player,
I want to create an account with my name, email, password, and verified photo,
so that I can access protected league features.

Acceptance criteria:
- Registration requires:
  - `fullName`
  - `email`
  - `password`
  - verified photo
- Duplicate email registration is rejected with a clear error.
- Public registration always creates a `PLAYER` role account.
- Successful registration creates a session and redirects the player into the signed-in flow.

Out of scope for current implementation:
- email verification
- DOB/age validation

### P-02 Purchase Annual Insurance

As a registered player,
I want to purchase annual insurance,
so that I can satisfy league coverage requirements.

Acceptance criteria:
- Authenticated player can purchase one active annual insurance policy.
- If an active policy already exists, duplicate purchase is rejected.
- Successful purchase creates an active insurance policy with a 365-day term.
- Player insurance state updates immediately after purchase.
- Failed purchase does not create an active policy.

Open product decision:
- whether insurance remains a direct app purchase or becomes Stripe Checkout like registration

### P-03 Register For A Season

As a player,
I want to register for an available season,
so that I can participate in league play.

Acceptance criteria:
- Registration requires selecting a valid season.
- If the season registration form requires a waiver, waiver acceptance is mandatory.
- Duplicate registration for the same season is rejected.
- Registration amount is calculated from:
  - active pricing tier
  - pro-ration
  - discount code if valid
- Successful paid checkout marks the registration:
  - `paid = true`
  - `status = APPROVED`

Open product decision:
- if insurance is missing, should the app:
  - block season registration entirely, or
  - add insurance cost into the same checkout flow

### P-04 Register As A Free Agent

As a player without a team,
I want my registration to preserve free-agent availability,
so that captains and admins can place me appropriately.

Acceptance criteria:
- Player can mark themselves as a free agent.
- Free-agent state is persisted on the user profile.
- Season registration does not clear that state unless the player joins a team or changes the preference.

Current gap:
- free-agent registration behavior is not yet formalized tightly enough for final automation

---

## Admin Stories

### A-01 Create Insurance Record

As an admin,
I want to create an insurance record for a player,
so that I can correct or manually enter coverage data.

Acceptance criteria:
- Admin can create a policy for a target player.
- Policy includes:
  - provider
  - cost
  - status
  - start date
  - end date
- Player coverage state reflects the new active policy.
- Creation action is audit logged.

Current gap:
- formal audit logging is not yet implemented

### A-02 View Insurance Records

As an admin,
I want to view player insurance records,
so that I can verify compliance.

Acceptance criteria:
- Admin-only access.
- Search/filter by:
  - player
  - status
  - date range
- Detail view includes:
  - policy history
  - related registration context
  - payment state where applicable

### A-03 Modify Insurance Record

As an admin,
I want to update an insurance record,
so that I can correct payment or expiration details.

Acceptance criteria:
- Edit form pre-populates current values.
- Invalid values are rejected.
- Before/after changes are audit logged.
- Player notification behavior is defined if enabled.

### A-04 Deactivate Insurance Record

As an admin,
I want to deactivate an invalid insurance record,
so that I can preserve history without losing traceability.

Acceptance criteria:
- Destructive delete is avoided in normal admin flow.
- Record is marked inactive or superseded.
- Deactivation is blocked if the product rule says it would invalidate an active paid registration.
- Action is audit logged.

### A-05 Generate Insurance Compliance Report

As an admin,
I want a report of player insurance compliance,
so that I can monitor league coverage and share the data externally.

Acceptance criteria:
- Report filters by:
  - season
  - insurance status
  - date range
- Report includes:
  - player name
  - email
  - insurance paid/effective date
  - expiration date
  - status
- Summary counts include:
  - total active
  - total expired
  - total missing/unpaid

### A-06 Export Insurance Compliance Report

As an admin,
I want to export filtered insurance reports,
so that I can use them outside the app.

Acceptance criteria:
- Export supports at least CSV.
- Export contains the currently filtered dataset with headers.
- Download is only available to authorized users.
- Empty export behavior is defined.

Optional later formats:
- Excel
- PDF

### A-07 Create Season

As an admin,
I want to create a season,
so that players can register against it.

Acceptance criteria:
- Admin can create a season with:
  - name
  - start date
  - end date
  - roster settings
- Newly created season appears in season selection flows.
- Non-admin creation attempts are rejected.

Planned extension:
- season description
- registration fee metadata directly on season
- overlap validation
- audit logging

---

## QA Scenarios

These are not user stories. They are validation flows.

### Q-01 Validate Reverse Registration Flow

Goal:
- confirm a player can:
  - create account
  - obtain insurance
  - select season
  - pay
  - reach approved registration state

### Q-02 Validate Admin Season Visibility

Goal:
- confirm an admin-created season appears in:
  - public registration season selection
  - admin registration views
  - reporting filters

### Q-03 Validate Insurance Gating

Goal:
- confirm the final product decision for missing insurance behaves consistently across:
  - registration API
  - registration UI
  - payment flow
  - admin views

---

## Contract Notes

These product decisions still need to be finalized before full automation can be considered complete:

- email verification behavior
- adult-age validation source and threshold
- whether insurance is blocked or bundled at season registration time
- audit log schema
- notification delivery rules
- reporting/export formats beyond CSV
