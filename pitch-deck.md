# Vaka — Pitch Deck

> 12-slide narrative for two audiences at once: **investors** (rails revenue, defensibility, a
> credible path to government revenue) and **government** (recovered money, legality, ease of doing
> business). Speaker notes under each slide. Figures marked **[validate]** are placeholders.

---

## Slide 1 — Title

**Vaka** — _Digital building control for Zimbabwe._
The stage-gated inspection and permit platform that runs on Paynow and recovers the fees councils
lose to paper and cash.

> Notes: one breath — "we turn building inspections from paper-and-cash into a digital gate that
> councils can see and trust."

## Slide 2 — The problem

Building a house in Zimbabwe means clearing **five inspection stages**. Each one is:
**book the inspector → wait → sign a paper card → pay cash.** One inspector covers offices across
multiple regions.

> Notes: tell one builder's story — weeks of waiting, cash in an envelope, a paper card that gets
> lost. Everyone in the room has lived it.

## Slide 3 — What it actually costs

- **Revenue leakage** — cash fees that never reach council books.
- **Corruption exposure** — no audit trail; the inspector holds the gate _and_ the cash.
- **Slow approvals** — ≈4 weeks to approve plans, up to ~1 month per inspection stage.
- **No visibility** — neither the builder nor the Ministry can see status.

> Notes: name the three friction points: paper, cash, a roaming inspector.

## Slide 4 — The insight

**The payment rail already exists.** Harare and Bulawayo already take EcoCash / Paynow for rates and
bills. What's missing isn't payments — it's the **orchestration**: the stage gate, the inspector
app, the verification, the audit.

> Notes: this is the wedge. We're not selling "pay with EcoCash" — they have that. We sell the layer
> on top that no one has built.

## Slide 5 — The solution

**Vaka** — one stage-gated workflow, three apps:
- **Applicant / Builder** — submit, track, pay, book, download certificate.
- **Inspector** — offline-first mobile: nearby jobs, GPS + photo, pass/fail sign-off.
- **Council / Ministry** — live queue, reconciliation, inspector load, audit, verification.

> Notes: the stage gate IS the product. You cannot reach the next stage until the last one is paid
> and signed off.

## Slide 6 — How it works (the demo)

`Pay stage fee (Paynow) → inspector signs off on site (GPS + photo) → next stage unlocks.`
Cash never touches the inspector. Every payment is a digital receipt against a permit and stage.

> Notes: run the clickable demo here. Show the gate refusing to advance without a traceable payment,
> and the council seeing it land in real time.

## Slide 7 — Built on Paynow

We ride the rail Zimbabweans already trust — **EcoCash, OneMoney, ZIPIT, cards** — via Paynow's API.
Each council is its **own merchant**; **Vaka holds no money** (keeps us out of money-transmission
licensing) and reconciles every cent.

> Notes: de-risks both trust (citizens know EcoCash) and regulation (we're not a payments company).

## Slide 8 — Plugs into the Ministry

Multi-tenant by local authority, with the Ministry as super-tenant:
- National **builder-registration verification** (one-tap green/amber/red).
- **QR Certificate of Occupation** any bank or buyer can validate.
- Real-time **construction-activity data** and a **read API** for the Ministry / ZIMRA.

> Notes: data sovereignty is a feature we _offer_ — local hosting, POTRAZ-aligned.

## Slide 9 — Business model

**Revenue-share PPP. Zero capex for government. No surcharge on citizens.**
We earn a take-rate on fees processed through the platform, funded by the **leakage we recover** —
money councils aren't getting today.

> Notes: the headline number — "X% of inspection fees never reach the books; we recover them
> digitally and share the upside." **[validate]**

## Slide 10 — Go-to-market

Two doors, used together:
1. **No-cost pilot MOU with one reform-minded council** (speed + proof) — beachhead: **Bulawayo**
   (or a hungry mid-size council).
2. **Unsolicited PPP via ZIDA** with Ministry sponsorship (scale + air-cover) — a named, legal,
   active route (ZIDA took 19 unsolicited proposals since 2023).

> Notes: this is the answer to "selling to government takes forever." It doesn't have to.

## Slide 11 — Market & expansion

- **~32 urban + ~60 rural** local authorities to replicate across. **[validate]**
- Expand per-permit-type: occupation certs, change-of-use, signage, scrutiny fees.
- Then **regional SADC** — same manual process across Zambia, Malawi, Mozambique, Botswana.
- TAM: `plans & inspections/yr × avg fees × take-rate`. **[validate]**

> Notes: land one city → replicate → go regional. Classic wedge-and-expand.

## Slide 12 — The ask

- **90-day paid pilot** with [beachhead council], Ministry as sponsor.
- Hero metrics we'll prove: **% fees captured digitally**, **days per stage before/after**,
  **$ leakage recovered (annualized)**.
- **Raise:** [amount] to fund the pilot, the build-out, and the ZIDA PPP submission. **[validate]**

> Notes: close on the proof loop — give us one city and 90 days, and we hand you the evidence that
> unlocks the national mandate.

---

### Appendix A — Security & data sovereignty
Secure-by-construction stack, append-only audit log, server-side-only payments, encryption at rest,
self-hostable on Zimbabwe-based infra, POTRAZ-aligned (DPO + data-sharing clause). See
[CLAUDE.md](CLAUDE.md) §5.

### Appendix B — The five stages
Foundation → DPC/slab → Drainage → Superstructure → Final (Certificate of Occupation).

### Appendix C — Why now
Councils are already digitizing billing on Paynow; ZIDA is actively taking unsolicited PPPs; mobile
money is universal. The rails are laid — the orchestration layer is the opening.
