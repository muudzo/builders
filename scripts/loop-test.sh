#!/usr/bin/env bash
# Vaka end-to-end gate test: pay a stage -> confirm -> inspector signs off PASS -> next stage unlocks.
# Exercises the stage-gate invariant against a running API. Requires python3.
# Usage: start the API (npm run dev:api), seeded DB, then: bash scripts/loop-test.sh
set -euo pipefail

API="${API:-http://localhost:3001/api}"
PW="password123"
j() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

login() { curl -fsS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | j "d['accessToken']"; }

ok() { printf "  \033[32m✓\033[0m %s\n" "$1"; }

OWNER=$(login owner1@demo.vaka)
INSP=$(login moyo@bcc.gov.zw)
COUNCIL=$(login clerk@bcc.gov.zw)

# Find a permit + stage currently AWAITING_PAYMENT.
PERMITS=$(curl -fsS "$API/permits" -H "Authorization: Bearer $COUNCIL")
READ=$(printf '%s' "$PERMITS" | python3 -c '
import sys,json
permits=json.load(sys.stdin)
for p in permits:
    for s in p["stages"]:
        if s["status"]=="AWAITING_PAYMENT":
            print(p["ref"], s["id"], s["key"], s["amountCents"]); sys.exit(0)
sys.exit("no AWAITING_PAYMENT stage found — reseed with: npm run db:reset")
')
REF=$(echo "$READ" | cut -d' ' -f1); STAGE=$(echo "$READ" | cut -d' ' -f2); KEY=$(echo "$READ" | cut -d' ' -f3)
echo "Permit $REF — paying stage $KEY ($STAGE)"

# 1. Initiate + confirm payment (simulated Paynow).
PAY=$(curl -fsS -X POST "$API/payments/initiate" -H "Authorization: Bearer $OWNER" \
  -H 'Content-Type: application/json' -d "{\"stageId\":\"$STAGE\",\"method\":\"ECOCASH\",\"payerPhone\":\"+263771234567\"}")
PID=$(printf '%s' "$PAY" | j "d['paymentId']")
[ -n "$PID" ] && ok "payment initiated ($PID), status $(printf '%s' "$PAY" | j "d['status']")"

curl -fsS -X POST "$API/payments/$PID/confirm" -H "Authorization: Bearer $OWNER" >/dev/null
ok "payment confirmed (PAID)"

# 2. Stage should now be PAID_AWAITING_INSPECTION and appear in the inspector queue.
QUEUE=$(curl -fsS "$API/inspections/queue" -H "Authorization: Bearer $INSP")
printf '%s' "$QUEUE" | python3 -c "import sys,json;q=json.load(sys.stdin);assert any(x['stageId']=='$STAGE' for x in q),'stage not in queue'" \
  && ok "stage is in the inspector queue"

# 3. Inspector signs off PASS.
curl -fsS -X POST "$API/inspections/sign-off" -H "Authorization: Bearer $INSP" \
  -H 'Content-Type: application/json' \
  -d "{\"stageId\":\"$STAGE\",\"result\":\"PASS\",\"notes\":\"Compliant with approved plans.\",\"photoUrl\":\"https://example.com/p.jpg\",\"gpsLat\":-20.15,\"gpsLng\":28.58}" >/dev/null
ok "inspector signed off PASS"

# 4. Verify: this stage INSPECTED_PASS and the next stage unlocked to AWAITING_PAYMENT.
DETAIL=$(curl -fsS "$API/permits/$REF" -H "Authorization: Bearer $COUNCIL")
printf '%s' "$DETAIL" | python3 -c "
import sys,json
p=json.load(sys.stdin)
st={s['key']:s['status'] for s in p['stages']}
order=[s['key'] for s in sorted(p['stages'], key=lambda x:x['order'])]
i=order.index('$KEY')
assert st['$KEY']=='INSPECTED_PASS', 'stage not passed: '+st['$KEY']
if i+1 < len(order):
    nxt=order[i+1]
    assert st[nxt]=='AWAITING_PAYMENT', 'next stage not unlocked: '+nxt+'='+st[nxt]
    print('  next stage', nxt, 'unlocked ->', st[nxt])
else:
    assert p['status']=='COMPLETED', 'final stage but permit not COMPLETED'
    print('  final stage passed -> permit COMPLETED + certificate')
"
ok "gate advanced correctly"
printf "\n\033[32mEnd-to-end gate test passed.\033[0m\n"
