# Vaka — DevOps & Environments

Enterprise-grade delivery for Vaka: how code moves from a laptop to production, and the guardrails
around it.

## Environments

| Env | Purpose | Data | Deploy trigger |
| --- | --- | --- | --- |
| **local** | Developer machine | SQLite (`apps/api/prisma/dev.db`) or Docker | `npm run dev` / `docker compose up` |
| **staging** | Pre-prod verification, demos | PostgreSQL (isolated) | Auto on tag build / manual dispatch |
| **production** | Live service | PostgreSQL (self-hosted, ZW data residency) | Tag `v*.*.*`, **manual approval** |

Production data lives on Zimbabwe-based infrastructure for sovereignty (Cyber & Data Protection Act /
POTRAZ). See [CLAUDE.md](CLAUDE.md) §5.

## Pipelines (GitHub Actions)

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | push `main`, all PRs | `npm ci` → Prisma generate → lint → build (api+web) → api tests; dependency review + commitlint on PRs |
| `codeql.yml` | push/PR `main`, weekly | CodeQL static analysis (security-and-quality) |
| `security.yml` | push/PR, weekly | gitleaks secret scan + `npm audit` |
| `deploy.yml` | tag `v*.*.*`, manual | Build & push images to GHCR → deploy staging → **gated** production |

**Branch protection (configure in repo settings):** require `ci.yml` + CodeQL to pass, require 1
review (CODEOWNERS), linear history, no force-push to `main`.

**Pin for hardening:** Dependabot keeps `github-actions` current; for maximum supply-chain safety,
pin actions to commit SHAs.

## Required GitHub config (one-time)

1. **Environments** → create `staging` and `production`; on `production` add *required reviewers* and
   an optional wait timer. This is what gates the production deploy.
2. **Secrets** (per environment): `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`,
   `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, and cloud OIDC role config.
3. Enable **Dependabot** + **secret scanning** + **code scanning** in Settings → Security.

## Secrets management

- Never commit secrets. `.env` is git-ignored; `apps/api/.env.example` documents the shape.
- Generate strong secrets: `openssl rand -base64 48`.
- CI uses throwaway values; real secrets come from GitHub Environments / your secret manager.
- Prefer cloud **OIDC** over long-lived keys for deploy auth.

## Containers

```bash
# Build + run the whole stack locally (web :8080, api :3001, seeded demo data)
docker compose up --build
```

- `docker/api.Dockerfile` — multi-stage, non-root (`uid 1001`), runs `prisma migrate deploy` on start.
- `docker/web.Dockerfile` — Vite build served by nginx (security headers, gzip, SPA fallback, `/api` proxy).
- Images publish to `ghcr.io/<owner>/builders-{api,web}` via `deploy.yml`.

## SQLite → PostgreSQL (production)

The schema ships with SQLite for zero-infra local/demo use. For staging/production:

1. In `apps/api/prisma/schema.prisma` set `datasource db { provider = "postgresql" }`.
2. Set `DATABASE_URL="postgresql://user:pass@host:5432/vaka?schema=public"`.
3. `npx prisma migrate dev --name init_pg` to generate Postgres migrations (review the SQL).
4. Deploy with `prisma migrate deploy` (the container entrypoint already runs this).

## Release process

1. Merge to `main` (CI green).
2. Tag: `git tag v0.1.0 && git push origin v0.1.0`.
3. `deploy.yml` builds images → deploys to **staging** automatically.
4. Approve the **production** environment to promote.
5. Migrations run before traffic switches; roll back by re-deploying the previous image tag.

## Rollback

- App: redeploy the previous immutable image tag (kept in GHCR).
- DB: forward-only migrations; keep them small + reversible. Snapshot the database before each
  production migration.
