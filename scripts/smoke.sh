#!/usr/bin/env bash
# Vaka API smoke test — verifies the secure foundation + core endpoints are alive.
# Usage: start the API (npm run dev:api), then: bash scripts/smoke.sh
set -euo pipefail

API="${API:-http://localhost:3001/api}"
EMAIL="${EMAIL:-clerk@bcc.gov.zw}"
PASSWORD="${PASSWORD:-password123}"

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
info() { printf "\033[1m%s\033[0m\n" "$1"; }

info "1. Health"
curl -fsS "$API/health" | grep -q '"status":"ok"' && pass "GET /health ok"

info "2. Auth"
TOKEN=$(curl -fsS -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
test -n "$TOKEN" && pass "POST /auth/login returned an access token"

AUTH=(-H "Authorization: Bearer $TOKEN")

info "3. Auth required (expect 401 without token)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/permits")
[ "$code" = "401" ] && pass "GET /permits is protected (401 without token)" || { echo "  expected 401, got $code"; exit 1; }

info "4. Permits"
curl -fsS "${AUTH[@]}" "$API/permits" | grep -q '"ref"' && pass "GET /permits returns seeded permits"

info "5. Dashboard"
curl -fsS "${AUTH[@]}" "$API/dashboard/overview" | grep -q 'feesCollected' && pass "GET /dashboard/overview returns KPIs"

info "6. Registry verification"
curl -fsS "${AUTH[@]}" "$API/registry/verify/BCC%2F2021%2F0412" | grep -q '"status"' && pass "GET /registry/verify returns a builder status"

printf "\n\033[32mSmoke test passed.\033[0m\n"
