# Vaka — Research Dossier

Grounded research behind the product and the pitch. Everything below is sourced; figures marked
**[validate]** still need primary confirmation before they go in front of investors.

Last updated: 2026-06-26.

---

## 1. The current ("as-is") process

Building control in Zimbabwe sits with **local authorities** (urban councils, town councils, rural
district councils) under the **Ministry of Local Government & Public Works**, governed by the
**Model Building By-laws** and the **Regional, Town and Country Planning Act**.

### Plan approval
- Applicant submits architectural plans to the local authority.
- Council **circulates** to departments — Works, Health / Trade Waste, Land Survey, Valuation, etc.
- Scrutiny fee paid; approval typically takes **~4 weeks**.
- Building permit issued.

### Stage inspections (the core of the pain)
Each stage = **book inspector → site visit → sign paper card → pay fee (often cash)**:

| Stage | Typical wait (per local-authority guidance) |
| --- | --- |
| Foundation | ~1 month |
| Drainage | ~1 business day |
| Structure / superstructure | ~2 weeks |
| Final (→ Certificate of Occupation) | ~1 month |

(Bulawayo/Harare model by-laws also separate DPC/slab level in practice.)

### Builder verification
- Contractors register with the **Construction Industry Federation of Zimbabwe (CIFOZ)**, the
  **Zimbabwe Building Contractors Association (ZBCA)**, and/or the local authority.
- Registration also requires **ZIMRA tax compliance**.
- Verifying a registration number today means **phoning CIFOZ or the council** — slow, manual,
  forgeable.

### Why it hurts (the three friction points the user named)
1. **Paper trail per stage** → lost files, no status visibility, weeks of delay.
2. **Cash at each stage** → revenue leakage, bribery exposure, zero audit trail.
3. **One inspector across regions / shared offices** → travel friction, scheduling chaos, missed
   visits.

## 2. Payment rail — Paynow

- **Paynow** (by Webdev) is Zimbabwe's leading gateway. Aggregates **EcoCash, OneMoney, Telecash,
  InnBucks, ZIPIT/Zimswitch, Visa/Mastercard, bank transfer**.
- **Well-documented API + official SDKs** (Node, PHP, Java, .NET) at the Paynow Developer Hub.
- **Mobile-money flow:** POST to the `remotetransaction` interface → customer receives an **EcoCash
  USSD prompt** on their phone → merchant **polls `pollUrl`** or receives a callback at `resultUrl`
  → status flips to `Paid`.
- **Web/card flow:** Express Checkout redirect.
- **Settlement:** to the merchant (council) account.

**Implication for Vaka:** we don't ask government to build payments — we ride the rail citizens
already trust. We hold **no money**; each council is its own Paynow merchant → keeps us out of
money-transmission / RBZ licensing.

## 3. Critical finding — Paynow is _already_ inside councils

- **City of Harare** is "fully going digital" and accepts Paynow / EcoCash / OneMoney / Telecash /
  Visa / Mastercard / InnBucks / Zimswitch for **rates, fees, levies**.
- **Bulawayo City Council** accepts the same set (plus PayPal) for bills/fees/levies, via **Paynow
  and E-Solutions**.
- Billing intermediaries exist: **BillPay (billpay.paynow.co.zw), topup.co.zw**, and council ERP
  vendors (e.g. **Quill**).

**So payment is NOT the moat.** Councils already take Paynow for _billing_. What none of them do is
the **stage-gated inspection workflow + offline inspector app + builder verification + reconciled
audit log**. That orchestration layer is the product; payment is a commodity we sit on top of.
**Position Vaka as complementary** to existing council billing, not competitive.

## 4. The legal route into government — unsolicited PPP via ZIDA

- The **ZIDA Act [Chapter 14:37] (2020)** replaced the old Joint Ventures Act and governs
  **Public-Private Partnerships**.
- It **explicitly recognizes unsolicited bids**: a proposal made on the private party's own
  initiative is referred by the contracting authority to **ZIDA's PPP Unit**, which does a
  **preliminary assessment with that authority within 14 days**.
- **ZIDA published PPP Guidelines (March 2026).**
- Since late 2023, ZIDA received **26 PPP proposals — 19 unsolicited.**

**Implication:** there is a **named, active, legal path** to approach a council or the Ministry
without waiting for a tender. This is the antidote to the "African-government sales cycle is
infinite" objection investors raise.

## 5. Ease-of-doing-business framing

- The World Bank's **Dealing with Construction Permits** indicator measured the **procedures, time,
  and cost** to build (and inspect) a warehouse, plus a **building-quality-control index**.
- The programme was **discontinued in Sept 2021**, so use it _directionally_, not as a live rank.
- Stronger than a stale rank: the **process timings in §1** (≈4 weeks plan approval, up to ~1 month
  per inspection stage) are concrete, sourced, and tell the speed story on their own.

## 6. Market frame (for the raise) — **[validate]**

- **~32 urban + ~60 rural local authorities** in Zimbabwe (confirm exact count).
- TAM math to fill from council annual reports / Ministry data:
  `# building plans & inspections per year × avg fees per permit × take-rate`.
- **Expansion vectors:** occupation certificates, change-of-use, signage/advertising permits,
  scrutiny fees; then **regional SADC** councils (Zambia, Malawi, Mozambique, Botswana) running the
  same manual process.
- All specific volumes/values here are **[validate]** — do not put invented figures in the deck.

## 7. Risks (and how we answer them)

| Risk | Answer |
| --- | --- |
| Councils already take Paynow | We're the orchestration/inspection layer, not a payments competitor — complementary |
| Cash-incentive insiders sabotage adoption | Top-down mandate + make digital easier/safer + "no cash = inspector protection" + applicant self-pays |
| "Integrate into our legacy IT" | We're the digital layer + expose read API/exports; integrate to council ERP later |
| Data protection (POTRAZ) | DPO, data-sharing clause in PPP, local hosting, encryption at rest |
| Procurement delay | Unsolicited PPP via ZIDA + no-cost council pilot MOU |

## 8. Open questions to close before pitching

1. Exact permit/inspection **volumes and fee schedules** for the beachhead council. **[validate]**
2. Which council ERP/billing system the beachhead runs (integration surface). **[validate]**
3. Whether the council can sanction a **processing fee inside a PPP** without re-gazetting by-laws.
4. Paynow commercial terms for a multi-council orchestration partner.

## 9. Sources

- DLA Piper REALWORLD — Zimbabwe construction law:
  https://www.dlapiperrealworld.com/law/index.html?t=construction&s=legal-framework&c=ZW
- City of Bulawayo — Plan Approvals & Inspections: http://www.citybyo.co.zw/AzServices/PlanApprovals
- City of Bulawayo — Pay Your Bills: https://www.citybyo.co.zw/Notices/PayYourBills
- Deepleague Homes — Building Plan Approval Process:
  https://www.deepleaguehomes.co.zw/the-building-plan-approval-process/
- Paynow Developer Hub: https://developers.paynow.co.zw/
- Paynow — Initiate mobile transaction:
  https://developers.paynow.co.zw/docs/initiate_mobile_transaction.html
- City of Harare — Bills & Payments: https://www.hararecity.co.zw/services/bills-and-payments
- ZIDA Act (Ch 14:37) — UNCTAD:
  https://investmentpolicy.unctad.org/investment-laws/laws/325/zimbabwe-zimbabwe-investment-and-development-agency-act
- ZIDA PPP Guidelines (2026): https://zidainvest.com/ppp-guideline/
- World Bank — Dealing with Construction Permits (Zimbabwe):
  https://archive.doingbusiness.org/en/data/exploreeconomies/zimbabwe
- M&J Consultants — Registering with CIFOZ:
  https://mjconsultants.co.zw/insights/a-guide-to-registering-with-cifoz-and-other-construction-bodies-in-zimbabwe/
