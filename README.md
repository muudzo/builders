# Vaka

**Digital building-inspection & permit control for Zimbabwe** — stage-gated, paid on **Paynow**,
built for local authorities and the Ministry of Local Government & Public Works.

Vaka replaces the paper-and-cash, multi-stage building-inspection process with one digital gate:
each construction stage unlocks only after the previous stage is **paid** (via Paynow) and
**signed off** by an inspector on site. Cash never touches the inspector; every fee is a traceable
digital record the council can see in real time.

> Working name. _Vaka_ = "to build" (Shona). See [pitch-deck.md](pitch-deck.md),
> [research.md](research.md), and [CLAUDE.md](CLAUDE.md).

## Architecture

```
builders/                 # git repo root
├── apps/
│   ├── api/              # NestJS + Prisma (secure backend)
│   └── web/              # React 19 + Vite (3-persona frontend)
├── CLAUDE.md             # project source of truth (stack, security, domain)
├── CONTRACT.md           # API + design contract
├── research.md           # grounded research + sources
└── pitch-deck.md         # investor + government narrative
```

- **Backend:** NestJS, PostgreSQL/SQLite via Prisma, JWT + httpOnly refresh cookies, argon2id,
  RBAC guards, append-only audit log, helmet/CORS/rate-limiting, Paynow (server-side only,
  simulation mode by default). Self-hostable for data sovereignty (POTRAZ).
- **Frontend:** React + Vite + TypeScript, bespoke "Civic Confidence" design system, TanStack Query,
  three persona surfaces (Applicant, Inspector, Council/Ministry) + public certificate verification.

## Quickstart

```bash
npm install            # install both workspaces
npm run db:setup       # generate Prisma client, migrate, seed Bulawayo demo data
npm run dev            # api on :3001, web on :5173
```

Open http://localhost:5173.

## Demo logins (password: `password123`)

| Persona | Email | What to show |
| --- | --- | --- |
| Applicant / Builder | `owner1@demo.vaka` | Pay a stage on Paynow, watch the gate unlock, download certificate |
| Inspector | `moyo@bcc.gov.zw` | Job queue → on-site sign-off (photo, GPS, PASS/FAIL) |
| Council | `clerk@bcc.gov.zw` | Live KPIs, payment reconciliation, builder verification, audit trail |
| Ministry | `ps@mlgpw.gov.zw` | Read-only national super-view |

The login screen has one-tap quick-login buttons for each persona.

## The 3-minute pitch demo

1. **Applicant** opens an active permit → sees the 5-stage gate, one clear next action.
2. Taps **"Pay with Paynow"** → EcoCash-style confirmation → stage flips to *Awaiting inspection*.
3. Switch to **Inspector** → the job appears in the queue → sign off with photo + GPS → **PASS**.
4. The applicant's **next stage unlocks** automatically.
5. Switch to **Council** → the fee is already on the books, reconciled, with a full audit trail.
6. Finish a permit → a **QR Certificate of Occupation** is issued; verify it at `/verify/:token` with no login.

The point: every payment is traceable, the process is visible end-to-end, and the inspector never
handles cash.

## The five inspection stages

Foundation → DPC/Slab → Drainage → Superstructure → Final (Certificate of Occupation).

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Run api + web together |
| `npm run dev:api` / `npm run dev:web` | Run one side |
| `npm run db:setup` | generate + migrate + seed |
| `npm run db:reset` | wipe + re-migrate + re-seed |
| `npm run build` | Build both apps |
| `bash scripts/smoke.sh` | Curl-based API smoke test |
