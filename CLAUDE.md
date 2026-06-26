# Vaka — Digital Building Inspection & Permit Platform (Zimbabwe)

> Working name: **Vaka** (Shona: _to build_). A govtech/fintech platform that digitizes
> Zimbabwe's stage-gated building-inspection process, settles fees on **Paynow**, and gives
> local authorities and the Ministry of Local Government & Public Works a real-time,
> auditable system of record.

This file is the source of truth for anyone (human or agent) working in this repo. Read it first.

---

## 1. The problem (one line)

Building control runs on **paper + cash** across multiple inspection stages, and a single
inspector covers offices across several regions. Result: **revenue leakage, no audit trail,
corruption exposure, and slow approvals.**

See [research.md](research.md) for the grounded detail and sources. See
[pitch-deck.md](pitch-deck.md) for the investor + government narrative.

## 2. What we are building (MVP slice)

The **inspection → payment → sign-off loop** — the sharpest pain and the clearest ROI.

The product is a **stage-gated workflow engine**: each construction stage unlocks _only_ after
the previous stage has been **paid (via Paynow)** and **signed off (by an inspector in-app)**.
That single rule converts an unenforceable paper sequence into a system-enforced one, and makes
cash leakage structurally hard.

Three personas, one engine:

| Persona | Surface | Core job |
| --- | --- | --- |
| **Applicant / Builder** | Web + (later) USSD/WhatsApp | Submit permit, see live status, pay stage fees, book inspections, download QR certificate |
| **Inspector** | Mobile (offline-first) | See nearby bookings, capture GPS + photo evidence, pass/fail sign-off |
| **Council / Ministry** | Dashboard | Plan-review queue, fee reconciliation, inspector load, audit log, builder verification, certificate registry |

**Deliberately deferred:** multi-council tenancy at scale, live CIFOZ/ZIMRA APIs, full
plan-scrutiny digitization, analytics suite.

## 3. The five inspection stages (the gate)

Modelled on the local-authority by-law process (Bulawayo/Harare):

1. `FOUNDATION` — footing/excavation before pour
2. `DPC` — damp-proof course / slab level
3. `DRAINAGE` — drainage installation
4. `SUPERSTRUCTURE` — walls / structure to wall-plate
5. `FINAL` — final inspection → **Certificate of Occupation**

Each stage moves through statuses:
`LOCKED → AWAITING_PAYMENT → PAID_AWAITING_INSPECTION → BOOKED → INSPECTED_PASS | INSPECTED_FAIL`.
A `FAIL` returns the stage to remediation; only `INSPECTED_PASS` unlocks the next stage.

## 4. Architecture & stack (and _why_)

**Principle:** unified TypeScript, **secure-by-construction**, self-hostable for data sovereignty.

### Frontend
- **React + Vite + TypeScript**
- **Tailwind** with a **custom design system / tokens** — must NOT look like a default template
  (see `~/.claude/rules/ecc/web/design-quality.md`)
- **TanStack Query** (server state), **React Router**, **Zod** (boundary validation)

### Backend — "the most secure backend we can practically ship"
- **NestJS (TypeScript)** — chosen for security ergonomics:
  - **Guards** → role-based access control (RBAC)
  - **Validation pipes** (`class-validator` / Zod) → reject bad input at the boundary
  - **Interceptors** → append-only **audit log** on every state change
  - First-class **helmet, CORS allowlist, rate limiting, CSRF** for cookie flows
- **PostgreSQL** (prod) / **SQLite** (local dev) via **Prisma** ORM → parameterized queries, no SQL injection
- **Auth:** short-lived **JWT access token** + **httpOnly, Secure, SameSite refresh cookie**;
  **argon2id** password hashing; roles: `APPLICANT | INSPECTOR | COUNCIL | MINISTRY`
- **Payments:** **Paynow Node SDK**, **server-side only**. Idempotent transaction records,
  poll + webhook reconciliation. Runs in **simulation mode** when no integration key is set
  (so the demo runs with zero credentials), real SDK behind the same interface.

### Why NestJS over the alternatives
- vs **Express bare**: NestJS bakes in the security primitives (guards/pipes/interceptors) we'd
  otherwise hand-assemble and forget.
- vs **Django**: Django's "secure by default" reputation is real, but splits the language. We keep
  one TypeScript codebase with shared DTOs/types end-to-end. (Django remains the fallback if we
  ever want Python's batteries-included admin.)
- vs **Supabase/BaaS**: convenient, but data-residency for a government buyer is a hard requirement;
  we stay self-hostable on Zimbabwe-based infra.

## 5. Security posture (also a pitch asset)

- [ ] All input validated at the boundary (DTO + Zod), never trust client data
- [ ] RBAC on every endpoint via guards; least privilege per role
- [ ] Append-only **audit log** for every money/state transition
- [ ] Payments orchestrated **server-side only**; client never holds Paynow keys
- [ ] Secrets via env only — `.env` is git-ignored; `.env.example` is committed
- [ ] argon2id hashing; JWT access + httpOnly refresh cookie; rotation on refresh
- [ ] helmet, HSTS, CORS allowlist, per-route rate limiting
- [ ] PII (owner/builder details) encryptable at rest; data-residency / self-host option
- [ ] Cyber & Data Protection Act (POTRAZ) alignment: DPO, data-sharing clause, local hosting

## 6. Repository structure (target)

```text
builders/
├── CLAUDE.md            # this file
├── research.md          # grounded research + sources
├── pitch-deck.md        # 12-slide narrative
├── apps/
│   ├── web/             # React + Vite frontend (3 personas)
│   └── api/             # NestJS backend (secure)
├── packages/
│   └── shared/          # shared types / DTOs / domain enums
└── prisma/              # schema + seed (realistic ZW data)
```

## 7. Commands (filled in as scaffolding lands)

```bash
# install
npm install

# dev (both apps)
npm run dev

# backend only
npm run dev:api

# frontend only
npm run dev:web

# db
npx prisma migrate dev
npx prisma db seed

# quality gate
npm run lint && npm run typecheck && npm test
```

## 8. Conventions

Follow the user's global rules in `~/.claude/rules/ecc/`:
- **Coding style** — immutability, small focused files (<400 lines typical, 800 max), early returns,
  named constants, explicit error handling
- **Web** — design tokens via CSS custom properties, semantic HTML, compositor-friendly animation,
  anti-template design quality bar
- **Testing** — TDD where it pays; unit for utils/hooks/services, e2e for the critical
  pay→inspect→sign-off flow; visual regression for the key surfaces
- **Security** — the checklist in §5 is mandatory before any commit
- **Naming** — Components `PascalCase`, hooks `useX`, constants `UPPER_SNAKE_CASE`, CSS kebab-case

## 9. Domain glossary

- **Stage gate** — the rule that a stage is locked until the prior stage is `INSPECTED_PASS`
- **Permit** — an approved building application; owns an ordered list of stages
- **Builder reg number** — contractor registration (council / CIFOZ / ZBCA); verified green/amber/red
- **Certificate of Occupation** — issued after `FINAL` pass; QR-verifiable
- **Leakage** — statutory fees collected as cash that never reach council books (the money we recover)
- **PPP / ZIDA** — the unsolicited public-private-partnership route into government (see research.md)

## 10. Build phases

1. **Scaffold** — monorepo, web + api skeletons, security baseline, Prisma schema + ZW seed
2. **Core loop** — stage-gate engine, Paynow (simulated) payment, inspector sign-off, auto-unlock
3. **Surfaces** — applicant portal, inspector mobile view, council dashboard
4. **Trust** — builder verification, QR certificate, append-only audit log
5. **Polish** — design system, responsive, demo reset, seed scenarios for live pitching
