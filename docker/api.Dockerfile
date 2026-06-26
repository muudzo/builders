# syntax=docker/dockerfile:1
# Vaka API — hardened multi-stage image (non-root, slim runtime).
FROM node:22-slim AS base
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# --- dependencies (cached on the lockfile) ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

# --- build ---
FROM deps AS build
COPY . .
RUN npm run db:generate && npm run build -w api

# --- runtime ---
FROM base AS runtime
RUN groupadd --system --gid 1001 vaka \
 && useradd --system --uid 1001 --gid vaka vaka \
 && mkdir -p /data && chown vaka:vaka /data
WORKDIR /app
# Generated Prisma client + runtime deps
COPY --from=build --chown=vaka:vaka /app/node_modules ./node_modules
COPY --from=build --chown=vaka:vaka /app/package.json ./package.json
# Compiled app + schema + seed source (src kept so `prisma db seed` works in demos)
COPY --from=build --chown=vaka:vaka /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=vaka:vaka /app/apps/api/src ./apps/api/src
COPY --from=build --chown=vaka:vaka /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=vaka:vaka /app/apps/api/package.json ./apps/api/package.json
COPY --chown=vaka:vaka docker/api-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER vaka
WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/main.js"]
