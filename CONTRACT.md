# Vaka — Build Contract (for parallel agents)

This is the binding contract between the backend feature agent (**Agent A**) and the frontend
agent (**Agent B**). Read [CLAUDE.md](CLAUDE.md) for context. The domain enums + stage gate live in
[apps/api/src/common/domain.ts](apps/api/src/common/domain.ts) — treat that file as canonical.

**Environment:** deps are already installed (npm workspaces). Do **not** run `npm install` at the
root or delete `node_modules`. Do **not** run any `git` commands — the orchestrator commits.
You may run builds/typechecks (`npm run build -w api`, `npm run build -w web`).

---

## The demo loop (what everything serves)

`Owner pays a stage fee (Paynow) → stage unlocks for inspection → inspector signs off on site
(GPS + photo) → next stage unlocks.` Cash never touches the inspector; every fee is a traceable
digital record. The council/ministry sees it all live.

## Auth (already built — do not modify)

- `POST /api/auth/login { email, password }` → `{ accessToken, user }` and sets an httpOnly refresh cookie.
- `POST /api/auth/refresh` → `{ accessToken, user }` (reads cookie).
- `POST /api/auth/logout` → `{ ok: true }`.
- `GET /api/auth/me` → `AuthUser`.
- Send `Authorization: Bearer <accessToken>` on every protected call. Frontend uses
  `credentials: 'include'` for refresh.

**AuthUser** = `{ sub, email, name, role, councilId, inspectorId }`, role ∈ `APPLICANT | INSPECTOR | COUNCIL | MINISTRY`.

**Seeded demo users (password `password123` for all):**
| Email | Role |
| --- | --- |
| owner1@demo.vaka | APPLICANT |
| owner2@demo.vaka | APPLICANT |
| moyo@bcc.gov.zw | INSPECTOR |
| ncube@bcc.gov.zw | INSPECTOR |
| clerk@bcc.gov.zw | COUNCIL |
| ps@mlgpw.gov.zw | MINISTRY |

## Conventions (enterprise-grade — non-negotiable)

- TypeScript strict. **No `any`** in app code (use `unknown` + narrow). Explicit types on exported/public APIs.
- Immutable updates (spread, no in-place mutation).
- Validate all input at the boundary with `class-validator` DTOs (backend) / typed forms (frontend).
- Every money/state transition calls `AuditService.record(...)` (backend).
- RBAC via `@Roles(...)` on controllers; rely on the global `JwtAuthGuard` + `RolesGuard`.
- Explicit error handling; throw Nest `HttpException` subclasses with helpful messages. No `console.log` in app code.
- Files < 400 lines where reasonable. Organize by feature.

---

## REST API — Agent A builds these (all under `/api`)

Shapes are the JSON the frontend expects. Use DTOs + service classes per feature module. Inject the
global `PrismaService` and `AuditService`. Money is integer **USD cents** (`amountCents`).

### Shared DTO shapes
```ts
StageDto = {
  id, key, label, order, amountCents, currency, status,
  bookedFor: string | null,
  payment?: { id, status, method, reference, paidAt: string | null },
  inspection?: { result, signedAt, inspectorName, notes, photoUrl }
}
PermitDto = {
  id, ref, standNumber, suburb, projectType, ownerName, ownerPhone,
  builderRegNumber, builderName, builderStatus, status, createdAt,
  council: { name, code },
  stages: StageDto[],
  progress: { passed, total, currentStageKey: string|null, currentStatus: string|null },
  certificate?: { serial, qrToken, issuedAt }
}
```

### Permits — `src/permits`
- `GET /permits` → `PermitDto[]`. COUNCIL/MINISTRY/APPLICANT see all seeded permits (demo scope; note in code that production scopes APPLICANT to owner). INSPECTOR may 403 or return [].
- `GET /permits/:ref` → `PermitDto` (full, with stages’ payment + inspection, certificate).
- `POST /permits` (COUNCIL, also allow APPLICANT for demo) body `{ standNumber, suburb, projectType, ownerName, ownerPhone, builderRegNumber }` → verifies builder against registry, snapshots `builderStatus`, generates the 5 stages from `STAGE_DEFINITIONS` (FOUNDATION → `AWAITING_PAYMENT`, rest `LOCKED`), audits `PERMIT_APPROVED`. Returns `PermitDto`.

### Payments (Paynow) — `src/payments`
Build `PaynowService` with a real-SDK seam + **simulation default** (no creds → simulate).
- `POST /payments/initiate { stageId, method, payerPhone? }` (APPLICANT/COUNCIL) → require `stage.status === 'AWAITING_PAYMENT'`; create `Payment(status='PENDING')`; in sim mode schedule auto-complete ~5s later; audit `PAYMENT_INITIATED`. Return `{ paymentId, reference, status:'PENDING', instructions, pollUrl }`.
- `GET /payments/:id` → `{ id, status, method, amountCents, reference, paidAt }`.
- `POST /payments/:id/confirm` (APPLICANT/COUNCIL — **demo accelerator**) → force the simulated payment to `PAID` immediately.
- On a payment becoming `PAID` (sim timer or confirm or real callback): set its stage `PAID_AWAITING_INSPECTION`, audit `PAYMENT_PAID` + `STAGE_AWAITING_INSPECTION`.
- `POST /payments/paynow/callback` (`@Public()`) → reconcile a real Paynow result (no-op-safe in sim).

### Inspections — `src/inspections`
- `GET /inspections/queue` (INSPECTOR) → jobs in the inspector’s council with stage status `PAID_AWAITING_INSPECTION` or `BOOKED`. `InspectionJobDto = { stageId, permitRef, stageKey, stageLabel, suburb, standNumber, ownerName, status, bookedFor, amountCents, gps:{lat,lng}, distanceKm }`. Approximate gps/distance from the council base + suburb (document the approximation).
- `POST /inspections/book { stageId, date }` (APPLICANT/COUNCIL) → require `PAID_AWAITING_INSPECTION` → set `BOOKED`, `bookedFor=date`. Returns `StageDto`.
- `POST /inspections/sign-off { stageId, result, notes, photoUrl?, gpsLat?, gpsLng? }` (INSPECTOR) → require stage in `[PAID_AWAITING_INSPECTION, BOOKED]`; create `Inspection`. **PASS** → stage `INSPECTED_PASS`, unlock next stage (`LOCKED`→`AWAITING_PAYMENT`); if final stage → issue `Certificate` + permit `COMPLETED`. **FAIL** → stage `INSPECTED_FAIL`. Audit each. Return `{ stage: StageDto, nextStageKey?, certificate? }`.
- `POST /inspections/:stageId/re-request` (APPLICANT/COUNCIL) → `INSPECTED_FAIL` → back to `PAID_AWAITING_INSPECTION` (no re-pay).

### Registry — `src/registry`
- `GET /registry/verify/:regNumber` → `{ regNumber, found, name?, category?, status, expiresAt? }`; not found → `{ found:false, status:'UNREGISTERED' }`.
- `GET /registry` (COUNCIL/MINISTRY) → registry rows.

### Dashboard — `src/dashboard`
- `GET /dashboard/overview` (COUNCIL/MINISTRY) → `{ feesCollectedTodayCents, feesCollectedTotalCents, leakageRecoveredCents, activePermits, completedPermits, inspectionsToday, awaitingInspection, stageBreakdown:[{key,label,count}], paymentsByMethod:[{method,count,amountCents}], inspectorLoad:[{inspectorName,jobs}], recentActivity: AuditDto[] }`. `leakageRecoveredCents` = sum of all PAID payments (framed as fees now captured digitally).
- `GET /dashboard/reconciliation` (COUNCIL/MINISTRY) → `[{ reference, permitRef, stageLabel, method, amountCents, status, paidAt }]`.
- `GET /audit` (COUNCIL/MINISTRY) → `AuditDto[] = { id, actorRole, action, entity, entityId, metadata, createdAt }` (most recent first, limit ~100).

### Certificates — `src/certificates`
- `GET /certificates/verify/:qrToken` (`@Public()`) → `{ valid, permitRef?, ownerName?, suburb?, standNumber?, serial?, issuedAt? }`.

**Wiring:** each feature module is already imported by `app.module.ts` (`PermitsModule`,
`PaymentsModule`, `InspectionsModule`, `RegistryModule`, `DashboardModule`, `CertificatesModule`).
Replace the stub `*.module.ts` with a real module declaring its controller(s) + provider(s).
Verify with `npm run build -w api`.

---

## Frontend — Agent B builds this (`apps/web`)

### Visual direction: "Civic Confidence" (NOT a generic dashboard template)
Trustworthy govtech with editorial character. Design tokens as CSS custom properties in
`src/styles/tokens.css`. Suggested palette (tune for contrast/AA):
- `--vk-bg` warm paper off-white (`#F6F4EE`), `--vk-surface` white, `--vk-ink` near-black slate.
- `--vk-primary` deep authoritative green (`#0E5A43`), `--vk-primary-strong` darker.
- `--vk-accent` warm gold for primary actions (`#E0A032`).
- Status colors: `locked`=slate, `awaiting`=amber, `paid`=blue, `booked`=violet, `pass`=green, `fail`=red.
Typography: a display **serif** for headings (e.g. Fraunces or Newsreader via Google Fonts) + a clean
**sans** for UI (Inter / Plus Jakarta Sans). Two families max, `font-display: swap`. Layered surfaces,
generous hierarchy, bento KPI cards, subtle depth/shadow, compositor-friendly motion (transform/opacity).
Meet the anti-template bar in `~/.claude/rules/ecc/web/design-quality.md`.

### UX law: REMOVE FRICTION (the product’s whole reason to exist)
- Fewest taps. An owner pays a stage in ≤ 2 taps (choose method → confirm). Inspector signs off in ≤ 3.
- Status legible at a glance: render the 5-stage gate as a **color-coded vertical stepper/timeline**;
  each permit shows exactly **one clear next action**.
- Plain language, no jargon. Fees shown clearly in `$`. Payment modal feels EcoCash-familiar.
- No dead ends — every state shows its next step. Inspector flow is one-thumb, big tap targets, mobile-first.
- Public certificate verification needs **no login**.

### Stack & setup
React 19 + Vite + TS (already scaffolded). Use `react-router-dom` and `@tanstack/react-query`
(already deps). API base `http://localhost:3001/api`; `fetch` with `credentials:'include'` + Bearer
token (keep access token in memory + a React context; refresh on 401). Add a Vite dev proxy if you prefer.

### Routes & surfaces
- `/login` — clean login **plus quick-login buttons** for each seeded persona (removes demo friction).
- `/` — role-aware redirect.
- **Applicant:** `/permits` (cards list with progress), `/permits/:ref` (the gate timeline + pay + book + download certificate). New-permit form with live builder verification.
- **Inspector:** `/inspect` (job queue, nearest first), `/inspect/:stageId` (sign-off: photo, GPS capture, notes, PASS/FAIL).
- **Council/Ministry:** `/dashboard` (bento KPIs + activity), `/dashboard/reconciliation` (traceable payments table), `/dashboard/registry` (builder verification), `/dashboard/audit` (audit trail).
- **Public:** `/verify/:qrToken` (certificate authenticity).
- A small persistent **role/persona indicator**; for COUNCIL & MINISTRY the dashboard is shared (MINISTRY = read-only super-view).

### Shared UI
Build a small bespoke component kit in `src/components/ui` (Button, Card, Badge/StatusPill,
StageTimeline, Modal, Stat, Table, EmptyState, Spinner) and reuse everywhere for consistency. Keep
ARIA/keyboard support (focus states, labels). Verify with `npm run build -w web`.

---

## File ownership (no overlaps)
- **Agent A:** only `apps/api/src/{permits,payments,inspections,registry,dashboard,certificates}/**`. May READ everything; must NOT edit `main.ts`, `app.module.ts`, `auth/`, `common/`, `prisma/`, `health/`, or anything in `apps/web`.
- **Agent B:** only `apps/web/**`. Must NOT edit anything in `apps/api`.
- Neither agent runs `git`. The orchestrator integrates + commits.
