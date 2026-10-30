# Auralis — Phase 0 Competitive Research: MedSpa Management Ecosystems

> **Scope:** US + UK medical spa software landscape
> **Product:** Auralis — all-in-one MedSpa management ecosystem (Web Admin + Staff Mobile App + Patient Mobile App), one centralized backend
> **Purpose:** Ground our roadmap in verified competitor intel and define a defensible differentiation strategy
> **Status:** Phase 0 research deliverable — to be committed to the public repo

---

## 1. Executive Summary

### 1.1 Market Size and Opportunity

| Market | Estimated Size | Growth | Notes |
| --- | --- | --- | --- |
| US med spa market | ~USD 17-19B (2024), projected ~USD 30B+ by early 2030s | ~13-15% CAGR | Fastest-growing category in aesthetics; ~21,000+ med spas operating, +10% YoY openings |
| UK medical aesthetics (non-surgical) | ~GBP 3-4B | ~8-11% CAGR | Botulinum toxin and dermal fillers dominate; heavily independent/single-site, minimal software penetration |
| Vertical software TAM | SPA/PMS software for beauty & wellness | ~12% CAGR | Med spa is the premium, compliance-heavy sub-vertical with the highest willingness to pay |

**Takeaway:** The US market is large, consolidating, and software-mature. The UK market is smaller but nearly greenfield: most clinics run on generic salon software, paper consents, and WhatsApp. A dual-market product is a moat almost nobody currently has done well.

### 1.2 Key Trends

1. **Consolidation.** Private equity roll-ups (multi-site med spa groups, dermatology + aesthetics chains, franchises) are swallowing independents. Multi-site operators need enterprise features: centralized pricing, cross-location reporting, staff sharing, brand-wide campaigns. Incumbents handle this poorly at the med spa tier (Zenoti is enterprise but not aesthetics-clinical; PatientNow is clinical but weak as a multi-brand HQ system).
2. **AI receptionists and agents.** Zoca has made five AI agents the core of its pitch (Discovery, Front Desk, Booking, Engagement, Loyalty). Zenoti markets AI heavily ("Genius"-style features). PatientNow and others are bolting on AI assistants. The market message is clear: buyers now expect AI to answer calls, book appointments, and chase revenue. Nobody has made agents *native to the clinical system of record*.
3. **Memberships as the business model.** Recurring revenue is now 20-40% of revenue at well-run med spas. Membership billing, benefit burn-down tracking, and win-back logic are still implemented as afterthoughts with weak clinical linkage (e.g., auto-applying a member's free Botox unit allotment to a treatment plan).
4. **Compliance pressure.** HIPAA enforcement is expanding to web technologies (OCR letters on tracking pixels), Good Faith Exam (GFE) requirements vary by US state, and UK clinics face UK GDPR, PECR marketing rules, ASA/CAP advertising codes, and CQC registration where regulated activities apply. Compliance is shifting from "nice to have" to a purchase criterion.
5. **Fragmented stacks.** The typical 3-10 location med spa runs 4-7 tools: PMS/booking, EMR, e-consent, photo tool, review/marketing tool, payments, inventory spreadsheet. Every vendor claims "all-in-one" but no one covers ops + clinical + growth at equal depth.

### 1.3 Competitive Landscape at a Glance

| Segment | Players | What they optimize for |
| --- | --- | --- |
| Clinical-first (EMR-led) | PatientNow, Aesthetic Record | Charting, consents, photos, GFE |
| Enterprise multi-location | Zenoti | Scale, brand HQ control, AI ops |
| Growth-led newcomers | Zoca | Lead flow, AI agents, marketing |
| Booking/payments-led UX players | Boulevard, Mangomint | Premium booking UX, payments, retention |
| UK/clinic heritage | Pabau | Clinic records + scheduling + UK compliance |
| Mass-market volume | Vagaro | Low price, marketplace discovery |

### 1.4 UK Market Nuances

| Factor | Implication for Auralis |
| --- | --- |
| Market structure | Predominantly independent clinics and small chains; very low penetration of purpose-built software — most run generic salon tools or spreadsheets |
| Regulation | CQC registration applies only to clinics delivering regulated activities; prescription-only medicines (botulinum toxin) shape booking/consent flows; ASA/CAP ad rules constrain marketing templates |
| Data law | UK GDPR + PECR (marketing consent) + DSAR obligations; UK data residency is a procurement question we will hear in every enterprise UK deal |
| Payments | Card-on-file and deposit culture is weaker than the US; Open Banking payments and VAT-compliant invoicing (20% standard rate) are must-haves |
| Competition gap | Pabau is the only serious dual-market player; Zenoti's UK mid-market presence is thin — a well-executed UK story wins by default |

---

## 2. Competitor Deep-Dives

> Pricing figures are directional, compiled from public pricing pages, review sites (Capterra/G2/Software Advice), and user forums at research time. Verify before quoting externally.

### 2.1 PatientNow

| Dimension | Detail |
| --- | --- |
| Positioning | "Run your med spa with PatientNow. Connect scheduling, EMR, payments, photos, marketing, memberships, and reporting in one platform." The original med-spa-native all-in-one. |
| Target market | US med spas, aesthetic practices, plastic surgery/derm satellite clinics; single site to small multi-site groups |
| Core modules | EMR (aesthetics-specific charting, GFE documentation), e-consents, before/after photo management, scheduling with room/resources, POS/payments, inventory, email/SMS marketing, memberships (MYM — Manage Your Memberships), patient rewards/referrals, reporting |
| Standout strengths | Deepest med-spa-native clinical workflows of the legacy vendors; photo management is a genuine differentiator; memberships module is mature; long track record — many 500+ client clinics grew up on it |
| Notable weaknesses / complaints | Legacy, dated UI and slow UX; onboarding and support quality complaints; integration ecosystem is thin (closed-ish platform); mobile experience lags web; reported contract/price-hike frustrations; modern growth features (lead scoring, attribution) weak |
| Pricing model | Custom quote per location/provider; commonly reported in the ~USD 300-1,000+/mo range depending on modules; annual contracts |
| Emulate | Clinical module taxonomy (chart templates, consents, photos as first-class objects); membership benefit logic |
| Avoid | Legacy UX, opaque pricing, closed API, slow release cadence |

### 2.2 Zenoti

| Dimension | Detail |
| --- | --- |
| Positioning | Enterprise-grade salon/spa/med spa platform; "AI-powered" operations at franchise and multi-brand scale |
| Target market | Large chains, franchises, 10-500+ location brands; increasingly mid-market med spas via a dedicated med spa package |
| Core modules | Appointment book, advanced resource/room scheduling, CRM + loyalty, lead management, marketing, memberships/gift cards, payments, inventory with supply-chain features, HR/payroll-adjacent workforce tools, analytics, AI concierge/booking assistant features, mobile apps (consumer + provider) |
| Standout strengths | Best-in-class multi-location and enterprise admin (role hierarchies, brand-level templates, cross-location client profiles); global operations (multi-currency, multi-country); strong AI narrative and R&D budget; deep payments and inventory for volume operations |
| Notable weaknesses / complaints | Expensive and long to implement; complexity and "overkill for a 3-location spa"; UI dense, dated in places; clinical/EMR depth for med spa lighter than dedicated aesthetics EMRs; support responsiveness at scale; feels built for salons with med spa bolted on |
| Pricing model | Quote-based, tiered by locations/providers; commonly reported starting ~USD 1,000-2,500+/mo for meaningful deployments; annual contracts |
| Emulate | Enterprise multi-tenancy patterns (brand → region → location), centralized service catalogs with local overrides, workforce and inventory rigor |
| Avoid | Heavy implementation weight, pricing opacity, clinical shallowness, complexity tax on small clinics |

### 2.3 Zoca

| Dimension | Detail |
| --- | --- |
| Positioning | "One platform to get your med spa found, answer every call, fill the calendar, and keep clients returning. No agency and no extra hires." A growth platform powered by AI agents — marketing agency replacement, not an EMR. |
| Target market | Independent med spas and small groups (1-10 locations) that spend on Google/Meta ads and answer their own phones |
| Core modules | Five AI agents: **Discovery** (get found: local SEO, listings, social, ads), **Front Desk** (answers calls/messages 24/7), **Booking** (calendar filling via agent-driven booking), **Engagement** (nurture, reminders, follow-ups), **Loyalty** (reviews, referrals, retention); growth analytics; lead capture; campaign reporting |
| Standout strengths | Clearest AI-native wedge in the category — agents as the product, not a feature; strong marketing-in-a-box for owners who can't afford an agency; modern positioning and sales motion; growth analytics tied to booked revenue |
| Notable weaknesses / complaints | Not a clinical system: no EMR, consents, charting, photos, or real inventory/POS depth; must integrate alongside an existing PMS/EMR, creating a two-system reality; newer company with a shorter track record; limited UK/regulatory footprint |
| Pricing model | Subscription, tiered by agent bundle and locations; commonly reported in the mid-hundreds USD/mo; no clinical-module add-ons |
| Emulate | The five-agent taxonomy (Discovery / Front Desk / Booking / Engagement / Loyalty) — we will implement it **natively**; growth KPI framing ("calls answered, calendar filled, clients returning") |
| Avoid | Operating as a bolt-on to someone else's system of record; owning marketing but not the patient record |

### 2.4 Aesthetic Record

| Dimension | Detail |
| --- | --- |
| Positioning | Med-spa-native EMR + booking + POS built for aesthetics injection practices; mobile-first (iPad) |
| Target market | US injectable-focused med spas, nurse-injector practices, solo providers to mid-size clinics |
| Core modules | Clinical charting with treatment protocols and GFE, e-consents, before/after photo capture and comparison, appointment scheduling, integrated POS, inventory (lot/batch/expiry discipline), telehealth/video consult options, marketing (email/SMS), loyalty/gift cards, reporting, open API |
| Standout strengths | True aesthetics clinical depth (injection mapping, units, lot tracking tied to patient record); strong iPad-centric staff experience; transparent published pricing tiers; responsive product iteration |
| Notable weaknesses / complaints | Reliability/bug complaints on releases; support and account management inconsistencies; web admin experience weaker than tablet app; multi-location and enterprise features less mature; growth/marketing automation is basic |
| Pricing model | Published tiers per location, commonly ~USD 300-700/mo depending on tier + payment processing |
| Emulate | Lot/batch tracking linked to charting; injection/units documentation patterns; mobile-first clinical capture |
| Avoid | Platform stability issues, thin marketing automation, weak lead management |

### 2.5 Boulevard

| Dimension | Detail |
| --- | --- |
| Positioning | "Medspa EMR software... Streamline booking, charting, and growth with HIPAA-compliant medical spa management software." Premium booking/payments UX player moving up into med spa. |
| Target market | Design-conscious salons, spas, and now med spas; boutique to multi-location premium brands; US (and Canada) |
| Core modules | Best-in-class online booking and calendar, client CRM, memberships, gift cards, package series, Blvd Payments (native merchant processing), inventory, charting/med spa EMR (newer), forms/consents, waitlist, marketing integrations, reporting, open API |
| Standout strengths | The reference UX for client-facing booking and admin calendar; payments are excellent (deposits, no-show fees, saved cards on file — big revenue-leak killer); strong multi-location; polished brand and docs; open API and webhooks |
| Notable weaknesses / complaints | Payments lock-in (must use Blvd Payments); feature paywalls and add-on pricing fatigue; charting/EMR is young and shallow vs. clinical-first vendors; before/after photo workflows limited; UK/regional availability limited; per-feature upsells frustrate users |
| Pricing model | Tiered per location, from ~USD 165-200/mo entry tiers up; onboarding fees; processing via native payments |
| Emulate | Booking UX (deposit-at-booking, smart waitlist backfill, seamless rescheduling), card-on-file and no-show protection flows, API quality |
| Avoid | Payments lock-in, nickel-and-dime add-on packaging, clinical shallow-end |

### 2.6 Pabau

| Dimension | Detail |
| --- | --- |
| Positioning | Clinic management software for med spas/clinics with genuine dual UK-US presence (geo-aware support, GBP/USD pricing, VAT awareness) |
| Target market | UK clinics (aesthetics, skin, dental-adjacent) and US med spas; solo to multi-practitioner clinics |
| Core modules | EMR/charting with treatment templates, e-consents, scheduling, lead pipeline, email/SMS marketing, memberships, POS + payments, inventory (incl. product usage deduction), photo/document storage, telehealth, client portal, staff app, reporting |
| Standout strengths | Strongest dual-market (UK + US) compliance posture in the set; all-in-one breadth with clinical depth; per-user pricing is approachable for small clinics; built-in lead pipeline and marketing uncommon among clinic software |
| Notable weaknesses / complaints | Pabau 2 migration turbulence and performance complaints; reporting/analytics weaker than growth platforms; UI inconsistent across modules; AI features early-stage; enterprise multi-brand tooling limited |
| Pricing model | Per-practitioner tiers (commonly ~USD 75-165/user/mo range) with feature tiers (e.g., entry/growth/elite); GBP and USD billing |
| Emulate | UK market playbook (VAT, PECR-aware marketing, UK support), lead pipeline inside clinic software, breadth on a single record |
| Avoid | Migration instability, inconsistent UX between modules, weak analytics |

### 2.7 Mangomint

| Dimension | Detail |
| --- | --- |
| Positioning | "Highest rated scheduling software" for salons/spas including med spas; premium UX, modern stack, open platform |
| Target market | Upscale salons/spas and med spas, US/Canada-centric; 1-20 locations |
| Core modules | Online booking, smart calendar with room/equipment awareness, client CRM, Forms & Charting (add-on), e-consents, packages, memberships, gift cards, POS with processing, inventory with auto-deduction, marketing automation (email/SMS journeys), Smart Discounts, open API + webhooks, staff and client apps |
| Standout strengths | Cleanest modern UX in the salon/spa category alongside Boulevard; excellent automation builder; strong inventory automation (usage deduction, purchase orders); developer-friendly open API; fast onboarding and support reputation |
| Notable weaknesses / complaints | Clinical depth is thin (charting is an add-on, not an aesthetics EMR); no lot/batch-to-patient discipline; before/after photo tools basic; US/Canada focus — no real UK compliance story; growth/lead features oriented to existing clients, not new lead capture |
| Pricing model | Tiered per location, commonly ~USD 165-350+/mo (Essential → Ultimate tiers); processing via integrated payments |
| Emulate | Automation journey builder, inventory auto-deduction, calendar/room model, API quality, "highest-rated" review-driven GTM |
| Avoid | Clinical shallow-end, single-market focus |

### 2.8 Vagaro

| Dimension | Detail |
| --- | --- |
| Positioning | Mass-market salon/spa/wellness platform + consumer marketplace ("book beauty & wellness near you") |
| Target market | Price-sensitive salons, barbers, spas, small med spas; enormous long tail; US/CA/UK/AU availability |
| Core modules | Online booking via marketplace + own site widgets, calendar, client records, marketing/email, forms, charting (basic), POS, inventory, memberships, payroll/timekeeping (add-ons), mobile apps, reporting |
| Standout strengths | Lowest price of the set; marketplace is a real acquisition channel for discovery; huge app ecosystem of independent businesses; broad feature checklist on paper; works in several countries including the UK |
| Notable weaknesses / complaints | Med spa clinical needs barely served (charting/consents primitive); transaction/processing fees add up; UI cluttered and dated; support scale issues; per-staff pricing punishes larger teams; not credible for compliance-sensitive clinics |
| Pricing model | Per-staff-per-month tiers, commonly ~USD 35/55/85 per staff/mo + processing fees; free marketplace listing tier |
| Emulate | Marketplace-led client acquisition concept (we can build an Auralis consumer booking network later), low-friction onboarding for solos |
| Avoid | Race-to-the-bottom pricing, cluttered UX, no clinical credibility |

### 2.9 Watchlist — Adjacent Players We Will Encounter in Deals

| Player | Category | Why it matters to Auralis |
| --- | --- | --- |
| Symplast | Aesthetics EMR (US) | Clinical rival for injectable-heavy practices; validates demand for aesthetics-native charting |
| TouchMD | Consultation/photo tools | Often paired with weak EMRs; our native consultation + photo flow replaces it |
| Fresha | Marketplace + free-tier PMS (UK-strong) | Threat to UK solo clinics on price; counter with compliance + clinical depth Fresha lacks |
| Book4Time | Enterprise spa/med spa (hotels, med spas) | Competes for multi-site and hotel-spa deals; legacy UX is its weakness |
| Nextech / ModMed | Specialty EHR (plastic surgery, derm) | Competes at the medical end; too heavy and expensive for typical med spas |
| Adu / MoeGo | Vertical salon tools | Signal: vertical-specific UX wins; watch their med spa expansion |
| Canva-class marketing tools + GoHighLevel | DIY growth stacks | What owners hack together before buying Zoca-style platforms; our growth modules must replace these stacks outright |

---

## 3. Feature Comparison Matrix

Legend: ✅ = mature native capability · ⚠️ = partial, add-on, or weak · ❌ = not available/negligible

| Feature | PatientNow | Zenoti | Zoca | Aesthetic Record | Boulevard | Pabau | Mangomint | Vagaro | **Auralis target** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Online booking | ✅ | ✅ | ⚠️ (agent-driven) | ✅ | ✅ (best UX) | ✅ | ✅ | ✅ (marketplace) | ✅ |
| Calendar & room/equipment scheduling | ✅ | ✅ | ⚠️ (sync only) | ✅ | ✅ | ✅ | ✅ (strong) | ✅ | ✅ |
| Patient CRM | ✅ | ✅ | ⚠️ (lead-centric) | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| EMR / clinical notes | ✅ (deep) | ⚠️ (lighter) | ❌ | ✅ (deep) | ⚠️ (new) | ✅ | ⚠️ (add-on) | ⚠️ | ✅ |
| Consent forms | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Before/after photos | ✅ (strong) | ⚠️ | ❌ | ✅ (strong) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Lead pipeline management | ⚠️ | ✅ | ✅ (core) | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ |
| Marketing automation | ✅ | ✅ | ✅ (core) | ⚠️ | ⚠️ | ✅ | ✅ (strong) | ✅ | ✅ |
| AI receptionist / agents | ⚠️ (bolt-on) | ✅ (positioned) | ✅ (core, 5 agents) | ⚠️ (early) | ⚠️ (early) | ⚠️ (early) | ⚠️ (early) | ⚠️ | ✅ (core) |
| Multi-location | ✅ | ✅ (best-in-class) | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Multi-currency (US + UK) | ❌ | ✅ (global) | ⚠️ | ⚠️ | ⚠️ (US/CA) | ✅ (GBP/USD) | ⚠️ (US/CA) | ⚠️ | ✅ (native USD+GBP) |
| Memberships / packages / gift cards | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory management | ✅ | ✅ (enterprise) | ❌ | ✅ (lot tracking) | ✅ | ✅ | ✅ (strong) | ✅ | ✅ |
| POS & payments | ✅ | ✅ | ❌ | ✅ | ✅ (best payments) | ✅ | ✅ | ✅ (fees) | ✅ |
| Mobile apps (staff + patient) | ⚠️ (staff-lagging) | ✅ | ⚠️ (business app) | ✅ (iPad-strong) | ✅ (client-strong) | ✅ | ✅ | ✅ | ✅ (both, native) |
| Analytics | ✅ | ✅ | ✅ (growth) | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ (spend-to-LTV) |
| Open API / webhooks | ⚠️ | ✅ | ⚠️ | ✅ | ✅ (strong) | ✅ | ✅ (strong) | ⚠️ | ✅ (day one) |

### 3.1 Matrix Notes and Confidence

| Topic | Notes |
| --- | --- |
| Sources | Official product pages fetched live for PatientNow, Zenoti, Zoca, Boulevard, Pabau, Mangomint; Aesthetic Record and Vagaro blocked by bot protection (Cloudflare/Incapsula) — assessed from review platforms and prior knowledge; confidence flagged ⚠️ for those two rows |
| Zoca agents | Verified from live page markup: agent components for Discovery, Front Desk, Booking, Engagement, Loyalty |
| Pabau dual market | Verified: geo-switched UK/US support numbers and currency/language handling on live site |
| Zenoti med spa EMR | Marketed as part of med spa package; depth vs. dedicated aesthetics EMRs is disputed by users — treat as ⚠️ for clinical parity purposes |
| Pricing | All pricing directional; vendors change packaging frequently; re-verify quarterly |

### 3.2 Pricing Model Comparison

| Vendor | Model | Entry point (directional) | Lock-in risk |
| --- | --- | --- | --- |
| PatientNow | Custom quote, per location/provider, annual contract | ~USD 300-1,000+/mo | Medium (contracts) |
| Zenoti | Quote-based tiers, annual | ~USD 1,000-2,500+/mo | High (implementation + contract) |
| Zoca | Subscription by agent bundle | Mid-hundreds USD/mo | Low-Medium |
| Aesthetic Record | Published tiers per location | ~USD 300-700/mo | Medium (processing) |
| Boulevard | Tiered per location + onboarding fee, native processing | ~USD 165-200+/mo | High (payments required) |
| Pabau | Per-practitioner tiers, GBP/USD billing | ~USD 75-165/user/mo | Low |
| Mangomint | Tiered per location | ~USD 165-350+/mo | Medium (processing) |
| Vagaro | Per-staff tiers + processing fees | ~USD 35/55/85 per staff/mo | Low |

### 3.3 Synthesized Voice of the Customer (from review-platform themes)

| Vendor | Top positive themes | Top complaint themes |
| --- | --- | --- |
| PatientNow | Clinical completeness, photos, one-system promise | Dated UI, support quality, contract pricing |
| Zenoti | Scale, multi-location control, AI roadmap | Cost, implementation length, complexity for small chains |
| Zoca | Lead flow, call answering, agency replacement | Not a real EMR, must keep existing system, young company |
| Aesthetic Record | Aesthetics charting, iPad workflow, lot tracking | Bugs on release, support inconsistency |
| Boulevard | Booking UX, payments, deposits/no-show protection | Payment lock-in, add-on upsells, young charting |
| Pabau | Breadth, UK/US fit, lead pipeline | Migration issues, performance, reporting depth |
| Mangomint | UX polish, automation, inventory automation, support | Clinical shallow-end, US/CA focus |
| Vagaro | Price, marketplace discovery | Fees, cluttered UX, not for medical clinics |

---

## 4. Gap Analysis — Where ALL Competitors Fall Short

| # | Gap | Who's closest | Why it persists | Auralis opportunity |
| --- | --- | --- | --- | --- |
| G1 | **Ops + clinical + growth never in one system of record.** Every vendor is strong in one pillar and mediocre in the others; clinics run 3-7 tools and stitch them manually. | PatientNow / Pabau (breadth) | Clinical vendors lack growth DNA; growth vendors (Zoca) lack clinical depth; UX vendors (Boulevard/Mangomint) stopped at charting | One data model: lead → patient → treatment → outcome → retention. Every module reads/writes the same record |
| G2 | **Lead nurturing is a checkbox.** Lead pipelines exist (Pabau, Zenoti) but speed-to-lead, multi-touch nurture, and attribution to booked/retained revenue are absent. Most leads die in an unmonitored inbox. | Zoca (capture, not pipeline) | Incumbents sell to incumbents' habits; owners don't measure speed-to-lead | Sub-minute AI response SLA, native pipelines with source-to-LTV attribution |
| G3 | **No unified US+UK compliance story.** Zenoti is multi-country but clinically shallow; Pabau is dual-market but weak at scale/analytics; nobody ships HIPAA + UK GDPR/CQC mode, VAT vs. sales tax, and consent templates localized per jurisdiction in one product. | Pabau (UK), Zenoti (global ops) | US vendors ignore UK; UK vendors lack US enterprise rigor | Compliance-as-a-feature: jurisdiction packs per tenant (state GFE rules, UK GDPR/PECR, CQC-aware records) |
| G4 | **AI is a bolt-on, not a platform layer.** 2024-2026 AI features are assistants on top of legacy data models. No vendor lets an agent act on the clinical record with guardrails and human handoff. | Zoca (agents as product, no record) | Legacy architectures can't safely expose charting to agents | Agents built on our native data model with audit trails, human-in-the-loop, and BAA-eligible infrastructure |
| G5 | **Legacy UX / fragmented modern UX.** PatientNow, Vagaro, Zenoti feel dated; modern players (Boulevard, Mangomint) are gorgeous but clinically shallow. Staff juggle ugly clinical screens and pretty booking screens. | Boulevard / Mangomint (UX) | UX modernization is expensive on old codebases | Modern design system from day one applied to clinical + ops + growth equally |
| G6 | **Mobile parity is rare.** Patient apps are mostly reminders and rebooking. Staff apps lag web. Consent signing, photo capture, and charting on mobile are incomplete everywhere. | Aesthetic Record (staff/iPad) | Clinical workflows were designed desktop-first | Native staff + patient apps: mobile consent, guided photo capture, charting, and agent notifications |
| G7 | **Memberships lack clinical logic.** Membership systems handle billing but not benefit burn-down against specific treatments, cross-location redemption rules, or expiry/win-back automation. | Boulevard / PatientNow | Membership modules inherited from salon gift-card thinking | Membership engine aware of treatment plans, units, expiry, and multi-location redemption |
| G8 | **Analytics don't connect spend to lifetime value.** Growth tools report leads; PMS tools report utilization; nobody closes the loop from ad spend → lead → booked → retained → LTV. | Zoca (directionally) | Data lives in disconnected systems | Unified warehouse-grade analytics on our single backend; channel LTV dashboards as a flagship |
| G9 | **Inventory lacks clinical traceability.** Lot/expiry tracking exists (Aesthetic Record) but device utilization (laser hours), syringe-level batch-to-patient linkage, and auto-reorder tied to treatment volume are rare. | Aesthetic Record | Ops tools don't know about charting | Charting-driven consumption: a documented treatment auto-deducts stock and logs batch to the record |
| G10 | **Booking and payments excellence isn't standardized.** Deposits, no-show protection, card-on-file, waitlist backfill are premium add-ons or missing. | Boulevard | Payments are a revenue moat vendors monetize separately | Ship deposit/no-show protection in the core booking flow, not as an upsell |

---

## 5. Auralis Differentiation Strategy — How We Win

**Formula:** PatientNow clinical depth + Zenoti enterprise multi-location + Zoca AI growth engine + Boulevard booking UX — on one modern backend, for US + UK.

### 5.1 Ten Differentiators

1. **One system of record for clinical, ops, and growth.** A lead captured by an ad becomes a patient whose chart, consents, photos, memberships, and LTV live in one backend. No integrations required to do the basics — the category's core failure (G1) is our baseline.
2. **Compliance-as-a-feature for two markets.** Tenant-level jurisdiction packs: US (HIPAA BAA, state Good Faith Exam templates, deposit/no-show law awareness) and UK (UK GDPR, PECR marketing consent, CQC-aware record keeping, GBP/VAT invoicing). A London clinic and an Austin spa run the same product with different compliance skins.
3. **Five native AI agents (not an assistant bolt-on).** Discovery, Front Desk, Booking, Engagement, Loyalty — see 5.2. Agents act on real records (calendar, charts, memberships) with full audit trails and human handoff. Zoca proved demand; nobody offers agents *with* the system of record.
4. **Boulevard-grade booking UX with room/equipment intelligence.** Deposit-at-booking, card-on-file, no-show protection, waitlist auto-backfill, and resource-aware scheduling (treatment rooms, laser devices, provider certifications) in the core flow, not premium tiers.
5. **Speed-to-lead as an enforced SLA.** Every web form, call, DM, and chat becomes a pipeline lead; AI responds in under a minute 24/7; escalation and response-time analytics make lead leakage visible to owners.
6. **Clinical-grade photography workflow.** Standardized capture guidance (angles, lighting presets), automated before/after pairing per treatment area, and consent-aware photo sharing — PatientNow's strength, rebuilt with modern UX.
7. **Charting-driven inventory.** Documented treatments auto-consume stock (units, vials, syringes) with lot/batch/expiry logged to the patient record; device utilization (laser hours per machine) drives maintenance and revenue analytics.
8. **Memberships with clinical logic.** Benefit burn-down against treatment plans, cross-location redemption, expiry automation, AI win-back via the Loyalty agent — recurring revenue managed as a first-class clinical-adjacent object.
9. **Open ecosystem from day one.** Public API, webhooks, Zapier-class connectors, and documented data export. No lock-in as a feature; migrations matter more than walled gardens in a consolidating market.
10. **Spend-to-LTV analytics.** Closed-loop dashboards: channel spend → leads → booked → retained → LTV, per location and provider. The number no competitor can compute because their data is fragmented.

### 5.2 AI Agent Architecture (Zoca-inspired, Auralis-native)

| Agent | Trigger/Inputs | Actions | KPIs | Human-in-the-loop |
| --- | --- | --- | --- | --- |
| **Discovery** | Ad clicks, SEO landing, marketplace listings, inbound forms | Lead capture, enrichment, scoring, instant qualification reply, source attribution | Cost per lead, lead → consult conversion | Owner approves budgets and target personas |
| **Front Desk** | Inbound calls, SMS, web chat, social DMs | 24/7 answers, FAQs (pricing bands, aftercare), triage to booking or staff, message summaries | Calls answered %, avg response time, deflection rate | Escalation paths to on-duty staff; scripted boundaries |
| **Booking** | Calendar state, provider skills, rooms/equipment, waitlist | Books/reschedules, deposits, reminders, waitlist auto-backfill on cancellation, capacity optimization | Fill rate, no-show rate, deposit coverage | Staff confirm any booking flagged clinical (e.g., new injectable patient) |
| **Engagement** | Appointment lifecycle, treatment plans, consent status | Pre/post-care instructions, review requests, rebooking nudges, dormant-patient journeys | Rebook rate, review velocity, retention | Marketing team tunes journeys; compliance reviews templates |
| **Loyalty** | Membership state, benefit expiry, purchase history | Membership renewal, benefit burn-down alerts, referrals, gift cards, win-back offers | MRR churn, renewal rate, referral revenue | Owner sets offer rules; finance audits discounts |

**Agent guardrails:** no agent may modify clinical documentation autonomously; all agent actions logged to an immutable audit trail; PHI never leaves BAA-covered infrastructure; per-tenant kill switches.

### 5.3 Illustrative Agent Flow (Front Desk + Booking)

| Step | Actor | Action | System of record impact |
| --- | --- | --- | --- |
| 1 | Prospect | Calls clinic at 8:15pm about laser hair removal pricing | Call transcribed; new lead created (source: phone) |
| 2 | Front Desk agent | Answers in brand voice; gives pricing band; qualifies (area, skin type, timeline) | Lead enriched and scored; consent-script logged |
| 3 | Booking agent | Offers three slots matching room + certified provider + device availability | Tentative appointment created with deposit link |
| 4 | Prospect | Pays deposit via text link | Appointment confirmed; card-on-file stored via payment provider |
| 5 | Engagement agent | Sends intake forms, GFE booking, pre-care instructions | Forms issued; pipeline stage: Booked Consult |
| 6 | Staff | Reviews flagged consult (new patient, injectable) next morning | Human-in-the-loop sign-off; audit trail entry |

Elapsed time from first ring to confirmed appointment: under 5 minutes — the speed-to-lead SLA no incumbent meets.

---

## 6. Recommended Module Priorities — Mapped to 8 Development Phases

| Phase | Theme | Modules to build | Why now (competitor evidence) | Inspiration |
| --- | --- | --- | --- | --- |
| 1 | Auth, dashboards, multi-tenancy | SSO/RBAC, tenant provisioning, org hierarchy (org → brand → location), audit logging, base dashboards | Zenoti proves enterprise hierarchy wins roll-up business; every sale starts with tenancy design | Zenoti |
| 2 | CRM + appointments | Patient CRM (unified client record), service catalog, booking engine, calendar with rooms/equipment/providers, deposits, waitlist | Booking UX is the first demo that wins clinics; Boulevard/Mangomint reviews are dominated by calendar quality | Boulevard, Mangomint |
| 3 | Staff, branches, services | Staff profiles, certifications/licensure tracking (who can inject what), schedules, branch-level pricing/service overrides, room/equipment management | Consolidators and franchises need brand-level control with local flexibility; licensure tracking is a compliance differentiator | Zenoti, PatientNow |
| 4 | Leads + marketing | Lead pipeline (kanban), omni-channel capture, nurture journeys (email/SMS), review/reputation tools, consent-aware templates | Growth is the loudest unmet need; Zoca's entire company exists because incumbents fail here | Zoca, Pabau |
| 5 | Payments + inventory | POS, native-style payments (deposits, card-on-file, no-show fees), memberships/packages/gift cards, inventory with lot/batch/expiry and auto-deduction | Revenue-leak features (deposits, no-show fees) and memberships are top owner ROI asks; payments decisions lock in early | Boulevard, Aesthetic Record |
| 6 | Mobile apps | Staff app (schedule, charting-lite, photo capture, task inbox), patient app (booking, consents, photos, membership, aftercare) | Mobile consent + photo capture are daily-pain workflows; Aesthetic Record's iPad loyalty shows mobile-first clinical capture sticks | Aesthetic Record, Boulevard |
| 7 | AI agents | Discovery, Front Desk, Booking, Engagement, Loyalty agents on native data; guardrails, audit, handoff, per-tenant toggles | AI is now table stakes in the sales conversation; agents on a real system of record leapfrog Zoca's bolt-on model | Zoca |
| 8 | Analytics + security hardening | Spend-to-LTV dashboards, provider/location scorecards, benchmarking, penetration-test hardening, BAA execution, UK data residency options | Analytics closes the differentiation loop (G8); security sign-off gates enterprise and UK sales | Zenoti, Zoca |

**Dependency note:** Phases are sequential but the data model in Phase 1 must already define lead, patient, treatment, membership, and audit entities — retrofitting single-record design is the mistake that made incumbents fragmented.

### 6.1 Phase Exit Criteria (Acceptance Signals)

| Phase | Exit criteria |
| --- | --- |
| 1 | Multi-tenant org hierarchy live; RBAC enforced; audit log captures every record read/write; demo tenant per US/UK jurisdiction |
| 2 | End-to-end: lead → booked appointment with deposit, room/equipment conflict-free; calendar matches Boulevard-class UX benchmarks internally |
| 3 | Branch-level service/pricing overrides; provider certification gates booking (unlicensed provider cannot be booked for injectable) |
| 4 | Lead responds to inbound form in <60s automatically; pipeline kanban live; nurture journey sends on schedule; attribution recorded |
| 5 | POS transaction, card-on-file, no-show fee charged, membership benefit auto-applied to booked treatment; stock auto-deducted with lot logged |
| 6 | Staff app: charting-lite + photo capture + schedule; patient app: booking + consent signing + membership card; both reviewed in real-device test matrix |
| 7 | Five agents live in staging with guardrails: no autonomous chart writes, full audit trail, handoff tested, per-tenant kill switch works |
| 8 | Spend-to-LTV dashboard reconciles with payments data; penetration test findings remediated; BAAs executed; UK residency option documented |

---

## 7. Security & Compliance Notes

### 7.1 United States — HIPAA

| Area | Requirement / decision |
| --- | --- |
| Status | Med spas are covered entities when they transmit PHI for covered transactions; treat all tenant clinical data as PHI from day one |
| BAAs | Execute BAAs with every subprocessor touching PHI (cloud hosting, SMS/email, payment metadata, LLM providers) **before** production; demo/staging must also use BAAs or synthetic data only |
| Safeguards | Encryption in transit (TLS 1.2+) and at rest (AES-256); RBAC least-privilege; MFA enforced for staff/admin; session timeouts; immutable audit trail for chart/consent/photo access |
| Tracking tech | OCR has signaled enforcement on web tracking technologies (pixels) sharing PHI with ad platforms — implement a PHI-safe analytics mode; no pixels on authenticated patient portals |
| State layer | Good Faith Exam templates and who-may-perform rules vary by state; store as configurable jurisdiction packs, not hard-coded logic |

### 7.2 United Kingdom — UK GDPR / DPA 2018 / CQC

| Area | Requirement / decision |
| --- | --- |
| Lawful basis | Special-category health data requires explicit consent (or Art. 9(2)(h) care basis); marketing uses PECR-compliant opt-in, separate from care communications |
| Records | Retention schedules configurable per tenant (commonly ~8 years after last contact for adult private records; longer for children); DSAR (subject access) workflow built-in |
| CQC | Clinics delivering regulated activities in England must be CQC-registered; Auralis is not a regulated service but must support CQC-aware record keeping and inspection exports; Scotland (HIS), Wales (HIW), NI (RQIA) variants noted |
| Transfers | US-hosted UK tenant data requires IDTA/addendum or UK data residency option (Phase 8 deliverable) |
| Advertising | ASA/CAP rules on aesthetics advertising (no misleading claims, prescription-only medicine advertising restrictions) — Engagement/Loyalty agent templates must ship pre-cleared for UK |

### 7.3 Demo Data Policy

- All demo/staging datasets are **synthetic and fictional** (generated names, photos from consented stock, fabricated lot numbers). No real patient data in any non-production environment.
- Seed data must still exercise compliance surfaces: expired consents, batch recalls, PECR opt-outs, so demos tell the compliance story.

### 7.4 Open Compliance Questions (track in Phase 8)

1. Per-state US deposit/gift-card/no-show-fee law matrix — legal review required.
2. LLM sub-processor selection under BAA (and EU/UK regional endpoints for UK tenants).
3. Whether UK data residency is a Phase 8 requirement or post-GA add-on (depends on anchor UK customers).

---

## Appendix A — Sources and Method

| Source | Status | Notes |
| --- | --- | --- |
| patientnow.com/specialties/med-spa-software | Fetched live | Positioning/messaging confirmed |
| zenoti.com/medical-spa-software/features | Fetched live (JS-rendered) | Page exists; feature detail from review platforms |
| zoca.com/medspa-growth-platform | Fetched live | Tagline + 5 AI agents confirmed in page markup |
| aestheticrecord.com | Blocked (Cloudflare challenge) | Assessed from reviews/prior knowledge |
| joinblvd.com/medical-spa-software | Fetched live | Med spa EMR positioning confirmed |
| pabau.com/features | Fetched live | Dual UK/US market handling confirmed |
| mangomint.com/features | Fetched live | Salon/spa-first positioning confirmed |
| vagaro.com | Blocked (Incapsula) | Assessed from reviews/prior knowledge |
| Review platforms (Capterra, G2, Software Advice), pricing pages | Secondary | Pricing marked directional |

## Appendix B — Confidence Legend

| Level | Meaning |
| --- | --- |
| High | Verified from live official page this sprint |
| Medium | Cross-referenced from multiple review sources; stable over time |
| Low | Single-source or fast-moving (pricing, AI feature claims) — re-verify before external use |

## Appendix C — Risks and Open Questions

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Scope: building clinical + growth + ops in parallel exceeds capacity | High | High | Strict phase gating (Section 6); single-record data model first; no feature without a Phase owner |
| R2 | Zoca accelerates toward clinical record (funding permitting) | Medium | High | Our moat is record + compliance + agents together; speed on Phases 2 and 7 is the defense |
| R3 | Boulevard deepens charting to clinical parity | Medium | Medium | Match their UX bar, out-build on clinical depth and UK market they ignore |
| R4 | AI regulatory scrutiny (health claims, call recording consent laws like two-party consent states) | Medium | Medium | Jurisdiction packs include call/agent disclosure rules; legal review of agent scripts |
| R5 | Payments partner dependency | Medium | Medium | Abstract payments behind interface; support processor swap per tenant |
| R6 | UK sales cycle slow without CQC-familiar brand | Medium | Low | Recruit UK aesthetics advisor; publish UK compliance whitepaper as GTM asset |
| R7 | Pricing race to bottom vs. Vagaro-class tools | Low | Medium | Compete on ROI (deposits saved, leads converted), never on price; publish ROI calculator |

**Open questions for Phase 1 planning:** (1) org hierarchy depth — org/brand/location or org/location/room as tenants? (2) payments abstraction target for UK (Stripe UK + GoCardless for Open Banking?). (3) which agent ships first with Phase 7 pilot customers — Front Desk or Booking?

## Appendix D — Immediate Next Actions

| # | Action | Owner | When |
| --- | --- | --- | --- |
| 1 | Convert Section 6 phase table into engineering backlog epics with acceptance criteria from 6.1 | Product | Phase 1 kickoff |
| 2 | Draft single-record data model (lead, patient, treatment, membership, audit) as Phase 1 ADR | Eng lead | Phase 1 sprint 1 |
| 3 | Re-verify pricing for Aesthetic Record and Vagaro via trial sign-up or sales call (bot protection blocked live fetch) | Research | Before external pricing claims |
| 4 | Demo-cycle the three nearest rivals: book a PatientNow, Zoca, and Boulevard sales demo and record module inventories | Founder + research | Next 3 weeks |
| 5 | Legal scan: US state deposit/no-show-fee matrix and UK PECR consent wording for agent scripts | Legal advisor | Parallel with Phase 4 |
| 6 | Recruit 3 design-partner clinics (2 US, 1 UK) for weekly build-feedback sessions | Founder | Phase 1-2 window |
| 7 | Draft UK compliance whitepaper (UK GDPR, CQC-aware records, PECR) as early GTM asset | Product + legal | Before UK outreach |
