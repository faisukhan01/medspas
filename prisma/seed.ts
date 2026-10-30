/* ═══════════════════════════════════════════════════════════════════════════
   Auralis — Demo data seeder
   Creates a complete FICTIONAL MedSpa world (US + UK): 1 tenant, 4 branches,
   11 staff, 26 patients, ~200 appointments, full EMR, leads, marketing,
   billing, inventory. 100% synthetic data — safe for public demos.
   Run: bunx prisma db push && bunx tsx prisma/seed.ts  (or: bun prisma/seed.ts)

   IMPORTANT — DateTime consistency:
   The runtime app talks to Turso through @prisma/adapter-libsql, which
   serializes DateTime as TEXT (ISO-8601). Plain PrismaClient (SQLite file)
   stores DateTime as INTEGER ms. Data written by one path is INVISIBLE to
   date-filtered queries through the other. Therefore this seeder
   auto-selects the same path the app will use:
     • TURSO_DATABASE_URL + TURSO_AUTH_TOKEN set  → seeds Turso via adapter
     • otherwise                                  → seeds the local SQLite file
   ═══════════════════════════════════════════════════════════════════════════ */
import { PrismaClient } from "@prisma/client";
import { scryptSync } from "crypto";

async function makeClient(): Promise<PrismaClient> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
    const adapter = new PrismaLibSQL({
      url: tursoUrl.replace("libsql://", "https://"),
      authToken: tursoToken,
    } as never);
    console.log("🔗 Seeding TURSO cloud via libSQL adapter (TEXT/ISO DateTime path)…");
    return new PrismaClient({ adapter } as never);
  }
  console.log("💾 Seeding LOCAL SQLite file (default Prisma path)…");
  return new PrismaClient();
}

const db = await makeClient();

// ── deterministic RNG (LCG) so re-seeding yields stable data ────────────────
let seedState = 42;
const rnd = () => (seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;

const hashPassword = (pw: string) =>
  scryptSync(pw, "auralis-static-demo-salt", 32).toString("hex");
const DEMO_HASH = hashPassword("demo1234");

const daysAgo = (n: number, h = 10, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d;
};
const daysAhead = (n: number, h = 10, m = 0) => daysAgo(-n, h, m);

async function main() {
  console.log("🌱 Seeding Auralis demo world (fictional data)…");

  // wipe in child→parent order
  const tables = [
    "AiInteraction","SupportTicket","Setting","Notification","AuditLog","Referral","Review",
    "PurchaseOrder","Product","Payment","Invoice","GiftCard","PatientPackage","ServicePackage",
    "Membership","MembershipPlan","MessageLog","Campaign","LeadActivity","Lead","WaitlistEntry",
    "Appointment","TreatmentRecord","ClinicalNote","SignedConsent","ConsentFormTemplate","Patient",
    "Room","Service","ServiceCategory","StaffSchedule","User","Branch","Tenant",
  ];
  for (const t of tables) {
    await db.$executeRawUnsafe(`DELETE FROM "${t}";`);
  }

  // ── Tenant & Branches ──────────────────────────────────────────────────────
  const tenant = await db.tenant.create({
    data: {
      name: "Auralis Aesthetics Group", slug: "auralis-demo", plan: "SCALE", status: "ACTIVE",
      country: "US", currency: "USD", timezone: "America/New_York",
      website: "https://auralis.example.com", logoEmoji: "✦", brandColor: "#047857",
    },
  });

  const branchLA = await db.branch.create({ data: {
    tenantId: tenant.id, name: "Beverly Hills Flagship", code: "LAX-1", country: "US", currency: "USD",
    timezone: "America/Los_Angeles", address: "9200 Sunset Blvd, Suite 400", city: "Los Angeles",
    state: "CA", postalCode: "90069", phone: "+1 (310) 555-0142", email: "la@auralis.example.com",
    taxRate: 9.5,
  }});
  const branchNYC = await db.branch.create({ data: {
    tenantId: tenant.id, name: "Manhattan Midtown", code: "NYC-1", country: "US", currency: "USD",
    timezone: "America/New_York", address: "455 Madison Ave, Floor 12", city: "New York",
    state: "NY", postalCode: "10022", phone: "+1 (212) 555-0187", email: "nyc@auralis.example.com",
    taxRate: 8.875,
  }});
  const branchLDN = await db.branch.create({ data: {
    tenantId: tenant.id, name: "London Mayfair", code: "LDN-1", country: "UK", currency: "GBP",
    timezone: "Europe/London", address: "28 Harley Street, Marylebone", city: "London",
    state: "Greater London", postalCode: "W1G 9PA", phone: "+44 20 7946 0958",
    email: "mayfair@auralis.example.com", taxRate: 20,
  }});
  const branchMCR = await db.branch.create({ data: {
    tenantId: tenant.id, name: "Manchester Northern Quarter", code: "MCR-1", country: "UK",
    currency: "GBP", timezone: "Europe/London", address: "12 Tib Lane", city: "Manchester",
    state: "Greater Manchester", postalCode: "M2 4JB", phone: "+44 161 496 0233",
    email: "mcr@auralis.example.com", taxRate: 20,
  }});
  const branches = [branchLA, branchNYC, branchLDN, branchMCR];

  // ── Users (staff) ──────────────────────────────────────────────────────────
  const mkUser = (data: Record<string, unknown>) => db.user.create({ data: data as never });
  const owner = await mkUser({ tenantId: tenant.id, branchId: branchNYC.id, name: "Amara Okafor",
    email: "owner@auralis.demo", phone: "+1 (212) 555-0101", passwordHash: DEMO_HASH, role: "OWNER",
    title: "Founder & CEO", avatarColor: "#047857", mfaEnabled: true });
  const admin = await mkUser({ tenantId: tenant.id, branchId: branchLA.id, name: "Sophie Turner",
    email: "admin@auralis.demo", phone: "+1 (310) 555-0102", passwordHash: DEMO_HASH, role: "ADMIN",
    title: "Operations Director", avatarColor: "#0d9488", mfaEnabled: true });
  const mgrLA = await mkUser({ tenantId: tenant.id, branchId: branchLA.id, name: "Marcus Chen",
    email: "manager@auralis.demo", phone: "+1 (310) 555-0103", passwordHash: DEMO_HASH, role: "MANAGER",
    title: "Branch Manager — Beverly Hills", avatarColor: "#b45309" });
  const recepLA = await mkUser({ tenantId: tenant.id, branchId: branchLA.id, name: "Ella Brooks",
    email: "reception@auralis.demo", phone: "+1 (310) 555-0104", passwordHash: DEMO_HASH,
    role: "RECEPTIONIST", title: "Front Desk Lead", avatarColor: "#7c3aed" });
  const prov1 = await mkUser({ tenantId: tenant.id, branchId: branchLA.id, name: "Dr. Priya Nair",
    email: "priya@auralis.demo", phone: "+1 (310) 555-0111", passwordHash: DEMO_HASH, role: "PROVIDER",
    title: "Aesthetic Nurse Practitioner", specialties: "Botox,Dermal Fillers,PRP",
    qualifications: "MSN,NP", licenseNumber: "CA-NP-88214", commissionRate: 12, bio: "8 years in aesthetic medicine.",
    avatarColor: "#be185d", rating: 4.9 });
  const prov2 = await mkUser({ tenantId: tenant.id, branchId: branchLA.id, name: "James Whitfield",
    email: "james@auralis.demo", phone: "+1 (310) 555-0112", passwordHash: DEMO_HASH, role: "PROVIDER",
    title: "Laser & Skin Specialist RN", specialties: "Laser Hair Removal,IPL,Microneedling",
    qualifications: "RN,CMLSO", licenseNumber: "CA-RN-551207", commissionRate: 10, avatarColor: "#0891b2", rating: 4.8 });
  const prov3 = await mkUser({ tenantId: tenant.id, branchId: branchNYC.id, name: "Dr. Sofia Rossi",
    email: "sofia@auralis.demo", phone: "+1 (212) 555-0113", passwordHash: DEMO_HASH, role: "PROVIDER",
    title: "Board-Certified Dermatologist", specialties: "Botox,Fillers,Morpheus8,CoolSculpting",
    qualifications: "MD,FAAD", licenseNumber: "NY-MD-109384", commissionRate: 15, avatarColor: "#7c2d12", rating: 5.0 });
  const prov4 = await mkUser({ tenantId: tenant.id, branchId: branchLDN.id, name: "Dr. Owen Hartley",
    email: "owen@auralis.demo", phone: "+44 20 7946 0114", passwordHash: DEMO_HASH, role: "PROVIDER",
    title: "Aesthetic Doctor", specialties: "Botox,Lip Filler,IV Drips",
    qualifications: "MBBS,MRCS", licenseNumber: "GMC-7421586", commissionRate: 12, avatarColor: "#166534", rating: 4.9 });
  const prov5 = await mkUser({ tenantId: tenant.id, branchId: branchLDN.id, name: "Amelia Wood",
    email: "amelia@auralis.demo", phone: "+44 20 7946 0115", passwordHash: DEMO_HASH, role: "PROVIDER",
    title: "Senior Aesthetician", specialties: "HydraFacial,Chemical Peel,Microneedling",
    qualifications: "LEVEL4-AESTHETICS", licenseNumber: "VTCT-99102", commissionRate: 8, avatarColor: "#a16207", rating: 4.7 });
  const prov6 = await mkUser({ tenantId: tenant.id, branchId: branchMCR.id, name: "Grace O'Connell",
    email: "grace@auralis.demo", phone: "+44 161 496 0116", passwordHash: DEMO_HASH, role: "PROVIDER",
    title: "Aesthetic Nurse Prescriber", specialties: "Botox,Fillers,Skin Boosters",
    qualifications: "RN,V300", licenseNumber: "NMC-88Y4412", commissionRate: 11, avatarColor: "#9d174d", rating: 4.8 });
  const marketer = await mkUser({ tenantId: tenant.id, branchId: branchLDN.id, name: "Noah Bennett",
    email: "marketing@auralis.demo", phone: "+44 20 7946 0117", passwordHash: DEMO_HASH, role: "MARKETER",
    title: "Growth Marketing Lead", avatarColor: "#4338ca" });
  const providers = [prov1, prov2, prov3, prov4, prov5, prov6];
  const usProviders = [prov1, prov2, prov3];
  const ukProviders = [prov4, prov5, prov6];
  console.log("   ✓ 1 tenant · 4 branches · 11 users");

  // ── Staff schedules ────────────────────────────────────────────────────────
  for (const u of [prov1, mgrLA, recepLA]) {
    for (let wd = 1; wd <= 5; wd++)
      await db.staffSchedule.create({ data: { userId: u.id, branchId: branchLA.id, weekday: wd, startTime: "09:00", endTime: "18:00" } });
  }
  for (const u of [prov2, prov3]) {
    for (let wd = 1; wd <= 4; wd++)
      await db.staffSchedule.create({ data: { userId: u.id, branchId: u.branchId!, weekday: wd, startTime: "10:00", endTime: "19:00" } });
    await db.staffSchedule.create({ data: { userId: u.id, branchId: u.branchId!, weekday: 6, startTime: "10:00", endTime: "16:00" } });
  }
  for (const u of [prov4, prov5, prov6, marketer]) {
    for (let wd = 1; wd <= 5; wd++)
      await db.staffSchedule.create({ data: { userId: u.id, branchId: u.branchId!, weekday: wd, startTime: "09:30", endTime: "18:30" } });
  }
  for (let wd = 2; wd <= 6; wd++)
    await db.staffSchedule.create({ data: { userId: owner.id, branchId: branchNYC.id, weekday: wd, startTime: "08:00", endTime: "17:00" } });

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const roomsByBranch: Record<string, { id: string; name: string }[]> = {};
  for (const b of branches) {
    const names = b.country === "US"
      ? ["Treatment Room 1", "Treatment Room 2", "Laser Suite", "Injectables Bar"]
      : ["Consult Room", "Treatment Suite 1", "Laser Room"];
    roomsByBranch[b.id] = [];
    for (const n of names) {
      const r = await db.room.create({ data: { branchId: b.id, name: n,
        type: n.includes("Laser") ? "LASER" : n.includes("Consult") ? "CONSULT" : n.includes("Inject") ? "INJECTABLES" : "TREATMENT" } });
      roomsByBranch[b.id].push({ id: r.id, name: r.name });
    }
  }

  // ── Service categories & services ─────────────────────────────────────────
  const catInject = await db.serviceCategory.create({ data: { tenantId: tenant.id, name: "Injectables", description: "Neuromodulators & dermal fillers", colorHex: "#047857", icon: "syringe", sortOrder: 1 } });
  const catLaser = await db.serviceCategory.create({ data: { tenantId: tenant.id, name: "Laser & Light", description: "Hair removal, photofacials, resurfacing", colorHex: "#b45309", icon: "zap", sortOrder: 2 } });
  const catFacial = await db.serviceCategory.create({ data: { tenantId: tenant.id, name: "Facials & Skin", description: "Medical-grade facials & peels", colorHex: "#0d9488", icon: "sparkles", sortOrder: 3 } });
  const catBody = await db.serviceCategory.create({ data: { tenantId: tenant.id, name: "Body Contouring", description: "Non-invasive body sculpting", colorHex: "#7c3aed", icon: "dumbbell", sortOrder: 4 } });
  const catWell = await db.serviceCategory.create({ data: { tenantId: tenant.id, name: "Wellness & IV", description: "IV therapy & vitamin shots", colorHex: "#16a34a", icon: "leaf", sortOrder: 5 } });
  const catHair = await db.serviceCategory.create({ data: { tenantId: tenant.id, name: "Hair Restoration", description: "PRP & growth protocols", colorHex: "#9d174d", icon: "scissors", sortOrder: 6 } });

  type Svc = { id: string; name: string; price: number; durationMin: number; depositAmount: number; requiresConsultation: boolean; category: string; emoji: string };
  const mkSvc = async (categoryId: string, category: string, name: string, price: number, durationMin: number, emoji: string, deposit = 0, consult = false): Promise<Svc> => {
    const s = await db.service.create({ data: { tenantId: tenant.id, categoryId, category, name, description: `${name} performed by Auralis medical team.`, durationMin, price, currency: "USD", depositAmount: deposit, requiresConsultation: consult, emoji } });
    return { id: s.id, name, price, durationMin, depositAmount: deposit, requiresConsultation: consult, category, emoji };
  };
  const services: Svc[] = [];
  services.push(await mkSvc(catInject.id, "Injectables", "Botox — 3 Areas", 380, 30, "💧", 50, true));
  services.push(await mkSvc(catInject.id, "Injectables", "Dermal Filler — Cheeks", 720, 45, "✨", 100, true));
  services.push(await mkSvc(catInject.id, "Injectables", "Lip Filler — 1ml", 590, 45, "💋", 100, true));
  services.push(await mkSvc(catInject.id, "Injectables", "Skin Booster course", 540, 40, "🌟", 0, true));
  services.push(await mkSvc(catLaser.id, "Laser & Light", "Laser Hair Removal — Small Area", 180, 30, "🔦", 25));
  services.push(await mkSvc(catLaser.id, "Laser & Light", "Laser Hair Removal — Large Area", 340, 60, "🔦", 50));
  services.push(await mkSvc(catLaser.id, "Laser & Light", "IPL Photofacial", 260, 45, "📸", 0));
  services.push(await mkSvc(catFacial.id, "Facials & Skin", "HydraFacial Signature", 220, 50, "🧖", 0));
  services.push(await mkSvc(catFacial.id, "Facials & Skin", "HydraFacial Platinum", 340, 75, "🧖", 0));
  services.push(await mkSvc(catFacial.id, "Facials & Skin", "Chemical Peel — Medium Depth", 240, 40, "🧪", 0));
  services.push(await mkSvc(catFacial.id, "Facials & Skin", "Microneedling with PRP", 480, 70, "🌱", 50, true));
  services.push(await mkSvc(catBody.id, "Body Contouring", "CoolSculpting — 1 Cycle", 700, 60, "❄️", 100, true));
  services.push(await mkSvc(catBody.id, "Body Contouring", "EMSCULPT NEO — Session", 850, 45, "💪", 100, true));
  services.push(await mkSvc(catBody.id, "Body Contouring", "Morpheus8 — Face & Neck", 1100, 90, "⚡", 150, true));
  services.push(await mkSvc(catWell.id, "Wellness & IV", "IV Vitamin Drip — Glow", 260, 60, "🧃", 0));
  services.push(await mkSvc(catWell.id, "Wellness & IV", "Vitamin B12 Shot", 45, 15, "💉", 0));
  services.push(await mkSvc(catHair.id, "Hair Restoration", "PRP Hair Restoration", 620, 60, "💇", 100, true));
  console.log(`   ✓ ${services.length} services across 6 categories`);

  // ── Consent form templates ─────────────────────────────────────────────────
  const cfBotox = await db.consentFormTemplate.create({ data: { tenantId: tenant.id, title: "Botulinum Toxin Consent", version: 2, content: "## Botulinum Toxin (Botox®) Informed Consent\n\nI understand that botulinum toxin injections temporarily relax muscles to soften dynamic wrinkles. Common side effects include bruising, swelling, headache and temporary asymmetry. Rare risks include ptosis and diffusion to adjacent muscles.\n\nI confirm I am not pregnant or breastfeeding and have disclosed all medications.\n\n**Patient signature:** ______________  **Date:** ____________" } });
  const cfFiller = await db.consentFormTemplate.create({ data: { tenantId: tenant.id, title: "Dermal Filler Consent", version: 2, content: "## Dermal Filler Informed Consent\n\nI understand dermal fillers are temporary hyaluronic-acid based implants. Risks include bruising, swelling, lumps, and rarely vascular occlusion. I have reviewed the aftercare instructions and emergency contact protocol.\n\n**Patient signature:** ______________  **Date:** ____________" } });
  const cfLaser = await db.consentFormTemplate.create({ data: { tenantId: tenant.id, title: "Laser Treatment Consent", version: 1, content: "## Laser / IPL Informed Consent\n\nI understand laser treatments may cause redness, swelling, pigment change or blistering. I confirm I have not used photosensitising medication and will avoid sun exposure before/after treatment.\n\n**Patient signature:** ______________  **Date:** ____________" } });
  const cfFacial = await db.consentFormTemplate.create({ data: { tenantId: tenant.id, title: "Skin Treatment Consent", version: 1, content: "## Facials, Peels & Microneedling Consent\n\nI understand results vary and multiple sessions may be required. Possible reactions include temporary redness, peeling and sensitivity.\n\n**Patient signature:** ______________  **Date:** ____________" } });

  // ── Patients ───────────────────────────────────────────────────────────────
  type PSpec = { fn: string; ln: string; email: string; phone: string; country: string; branchId: string; tags?: string; skin?: string; allergies?: string; meds?: string; history?: string; status?: string; source?: string };
  const specs: PSpec[] = [
    { fn: "Ava", ln: "Thompson", email: "ava.thompson@example.com", phone: "+1 (310) 555-0201", country: "US", branchId: branchLA.id, tags: "VIP,Member", skin: "Fitzpatrick II", allergies: "Latex", source: "Instagram" },
    { fn: "Mia", ln: "Rodriguez", email: "mia.rodriguez@example.com", phone: "+1 (310) 555-0202", country: "US", branchId: branchLA.id, tags: "Member", skin: "Fitzpatrick III", meds: "Sertraline 50mg", source: "Google Ads" },
    { fn: "Ethan", ln: "Cole", email: "ethan.cole@example.com", phone: "+1 (310) 555-0203", country: "US", branchId: branchLA.id, skin: "Fitzpatrick I", history: "Rosacea, sensitive skin", source: "Referral" },
    { fn: "Grace", ln: "Kim", email: "grace.kim@example.com", phone: "+1 (310) 555-0204", country: "US", branchId: branchLA.id, tags: "VIP", skin: "Fitzpatrick II", source: "Walk-in" },
    { fn: "Olivia", ln: "Bennett", email: "olivia.bennett@example.com", phone: "+1 (310) 555-0205", country: "US", branchId: branchLA.id, allergies: "Penicillin", meds: "Accutane (past course 2023)", skin: "Fitzpatrick II", source: "Website" },
    { fn: "Jackson", ln: "Reed", email: "jackson.reed@example.com", phone: "+1 (310) 555-0206", country: "US", branchId: branchLA.id, status: "CHURN_RISK", source: "Event" },
    { fn: "Chloe", ln: "Davis", email: "chloe.davis@example.com", phone: "+1 (212) 555-0207", country: "US", branchId: branchNYC.id, tags: "Member", skin: "Fitzpatrick III", source: "Google Ads" },
    { fn: "Amelia", ln: "Foster", email: "amelia.foster@example.com", phone: "+1 (212) 555-0208", country: "US", branchId: branchNYC.id, tags: "VIP", skin: "Fitzpatrick I", allergies: "Aspirin", source: "Referral" },
    { fn: "Sofia", ln: "Martinez", email: "sofia.martinez@example.com", phone: "+1 (212) 555-0209", country: "US", branchId: branchNYC.id, skin: "Fitzpatrick IV", source: "Instagram" },
    { fn: "Harper", ln: "Wilson", email: "harper.wilson@example.com", phone: "+1 (212) 555-0210", country: "US", branchId: branchNYC.id, tags: "Member", meds: "Levothyroxine", skin: "Fitzpatrick II", source: "Website" },
    { fn: "Zoe", ln: "Adams", email: "zoe.adams@example.com", phone: "+1 (212) 555-0211", country: "US", branchId: branchNYC.id, status: "INACTIVE", source: "Print" },
    { fn: "Liam", ln: "Patel", email: "liam.patel@example.com", phone: "+1 (212) 555-0212", country: "US", branchId: branchNYC.id, skin: "Fitzpatrick III", history: "Acne scarring", source: "AI Agent" },
    { fn: "Poppy", ln: "Hughes", email: "poppy.hughes@example.com", phone: "+44 20 7946 0213", country: "UK", branchId: branchLDN.id, tags: "VIP,Member", skin: "Fitzpatrick II", source: "Instagram" },
    { fn: "Isla", ln: "Fraser", email: "isla.fraser@example.com", phone: "+44 20 7946 0214", country: "UK", branchId: branchLDN.id, skin: "Fitzpatrick I", allergies: "Nickel", source: "Google Ads" },
    { fn: "Freya", ln: "MacLeod", email: "freya.macleod@example.com", phone: "+44 20 7946 0215", country: "UK", branchId: branchLDN.id, tags: "Member", meds: "Oral contraceptive", skin: "Fitzpatrick II", source: "Referral" },
    { fn: "Oliver", ln: "Grant", email: "oliver.grant@example.com", phone: "+44 20 7946 0216", country: "UK", branchId: branchLDN.id, skin: "Fitzpatrick II", history: "Male-pattern hair loss", source: "Website" },
    { fn: "Charlotte", ln: "Ellis", email: "charlotte.ellis@example.com", phone: "+44 20 7946 0217", country: "UK", branchId: branchLDN.id, source: "Walk-in" },
    { fn: "Theo", ln: "Harrison", email: "theo.harrison@example.com", phone: "+44 161 496 0218", country: "UK", branchId: branchMCR.id, tags: "Member", skin: "Fitzpatrick II", source: "AI Agent" },
    { fn: "Georgia", ln: "Lane", email: "georgia.lane@example.com", phone: "+44 161 496 0219", country: "UK", branchId: branchMCR.id, allergies: "Bee venom", skin: "Fitzpatrick III", source: "Event" },
    { fn: "Ruby", ln: "Shaw", email: "ruby.shaw@example.com", phone: "+44 161 496 0220", country: "UK", branchId: branchMCR.id, tags: "VIP", skin: "Fitzpatrick I", source: "Referral" },
    { fn: "Emily", ln: "Baxter", email: "emily.baxter@example.com", phone: "+44 161 496 0221", country: "UK", branchId: branchMCR.id, skin: "Fitzpatrick II", status: "CHURN_RISK", source: "Instagram" },
    { fn: "Harry", ln: "Whitmore", email: "harry.whitmore@example.com", phone: "+44 161 496 0222", country: "UK", branchId: branchMCR.id, history: "Melasma", meds: "Hydroquinone topical", skin: "Fitzpatrick IV", source: "Website" },
    { fn: "Nina", ln: "Kapoor", email: "nina.kapoor@example.com", phone: "+1 (310) 555-0223", country: "US", branchId: branchLA.id, tags: "Member", skin: "Fitzpatrick V", source: "Google Ads" },
    { fn: "Daniel", ln: "Osei", email: "daniel.osei@example.com", phone: "+1 (212) 555-0224", country: "US", branchId: branchNYC.id, skin: "Fitzpatrick VI", source: "Referral" },
    { fn: "Lucy", ln: "Whitfield", email: "lucy.whitfield@example.com", phone: "+44 20 7946 0225", country: "UK", branchId: branchLDN.id, skin: "Fitzpatrick II", source: "Instagram" },
    { fn: "Marcus", ln: "Barnes", email: "marcus.barnes@example.com", phone: "+44 161 496 0226", country: "UK", branchId: branchMCR.id, skin: "Fitzpatrick III", source: "Walk-in" },
  ];
  const patients = [];
  for (const s of specs) {
    const joined = daysAgo(ri(20, 700));
    const p = await db.patient.create({ data: {
      tenantId: tenant.id, branchId: s.branchId, firstName: s.fn, lastName: s.ln, email: s.email,
      phone: s.phone, dob: new Date(ri(1975, 2002), ri(0, 11), ri(1, 28)),
      gender: chance(0.75) ? "FEMALE" : "MALE", country: s.country,
      city: s.country === "US" ? (s.branchId === branchLA.id ? "Los Angeles" : "New York") : (s.branchId === branchLDN.id ? "London" : "Manchester"),
      address: `${ri(1, 220)} ${pick(["Maple St","Kings Rd","Orchard Ave","Baker St","Sunset Dr","Park Lane"])}`,
      avatarColor: pick(["#047857", "#0d9488", "#b45309", "#be185d", "#7c3aed", "#0891b2"]),
      source: s.source, tags: s.tags, skinType: s.skin, allergies: s.allergies, medications: s.meds,
      medicalHistory: s.history, status: s.status ?? "ACTIVE", consentsSigned: chance(0.85),
      marketingOptIn: chance(0.8), joinedAt: joined, createdAt: joined,
    }});
    patients.push(p);
  }
  console.log(`   ✓ ${patients.length} patients`);
  const byBranch = (bId: string) => patients.filter((p) => p.branchId === bId);
  const provFor = (bId: string) => bId === branchLA.id ? [prov1, prov2] : bId === branchNYC.id ? [prov3] : bId === branchLDN.id ? [prov4, prov5] : [prov6];

  // ── Appointments (past 60 days + next 14 days) + derived records ──────────
  const statusesPast = ["COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","NO_SHOW","CANCELLED","COMPLETED"];
  let apptCount = 0, txCount = 0, noteCount = 0, consentCount = 0, invSeq = 0, payCount = 0;
  const appointments: { id: string; patientId: string; providerId: string; service: Svc; startsAt: Date; endsAt: Date; branchId: string; status: string; price: number; currency: string }[] = [];

  for (let offset = -60; offset <= 14; offset++) {
    const day = daysAgo(-offset, 0, 0);
    if (day.getDay() === 0) continue; // closed Sundays
    for (const b of branches) {
      const provs = provFor(b.id);
      const pats = byBranch(b.id);
      if (!pats.length) continue;
      const nAppts = ri(1, 3);
      for (const prov of provs) {
        let slotHour = 9 + ri(0, 2);
        const usedSlots = new Set<number>();
        for (let k = 0; k < nAppts; k++) {
          const svc = pick(services);
          const durH = svc.durationMin > 55 ? 1.5 : 0.5;
          let hour = slotHour + k;
          while (usedSlots.has(hour)) hour++;
          if (hour > 17) break;
          usedSlots.add(hour);
          const pat = pick(pats);
          const isPast = offset < 0;
          const isToday = offset === 0;
          const status = isPast ? (chance(0.82) ? "COMPLETED" : chance(0.5) ? "NO_SHOW" : "CANCELLED") : isToday ? (chance(0.5) ? "CHECKED_IN" : "CONFIRMED") : chance(0.75) ? "CONFIRMED" : "PENDING";
          const startsAt = new Date(day); startsAt.setHours(hour, 0, 0, 0);
          const endsAt = new Date(startsAt.getTime() + svc.durationMin * 60000);
          const price = b.currency === "GBP" ? Math.round(svc.price * 0.79) : svc.price;
          if (endsAt < new Date() && status !== "COMPLETED" && status !== "NO_SHOW" && status !== "CANCELLED") continue;
          const appt = await db.appointment.create({ data: {
            tenantId: tenant.id, branchId: b.id, patientId: pat.id, providerId: prov.id, serviceId: svc.id,
            roomId: pick(roomsByBranch[b.id]).id, startsAt, endsAt, status, source: pick(["ONLINE","ONLINE","PHONE","WALK_IN","AI_AGENT","STAFF_APP"]),
            price, depositPaid: svc.depositAmount > 0 && chance(0.8), depositAmount: b.currency === "GBP" ? Math.round(svc.depositAmount * 0.79) : svc.depositAmount,
            reminderSent: !isPast ? true : false, checkedInAt: status === "CHECKED_IN" || status === "COMPLETED" ? startsAt : null,
            notes: chance(0.2) ? pick(["First visit — wants natural look.","Sensitive skin, patch test done.","Prefers lighter pressure.","Recurring monthly client."]) : null,
          }});
          apptCount++;
          appointments.push({ id: appt.id, patientId: pat.id, providerId: prov.id, service: svc, startsAt, endsAt, branchId: b.id, status, price, currency: b.currency });

          if (status === "COMPLETED") {
            // clinical note + treatment record + consent + invoice + payment
            if (chance(0.6)) {
              await db.clinicalNote.create({ data: { tenantId: tenant.id, patientId: pat.id, authorId: prov.id,
                type: pick(["CONSULT","POST_TREATMENT","INTAKE"]),
                content: pick([
                  `Consultation completed. Assessed facial anatomy and discussed goals for ${svc.name}. Patient well-informed, realistic expectations. Photos taken (before). No contraindications.`,
                  `Treatment with ${svc.name} tolerated well. Advised aftercare: avoid heat/exercise 24h, SPF 50 daily. Review at 2 weeks.`,
                  `Annual skin review. Fitzpatrick ${pat.skinType ?? "II"}. Advised combination approach: ${pick(["microneedling + peel","laser + skincare","boosters + SPF regime"])}.`,
                ]), createdAt: endsAt } });
              noteCount++;
            }
            if (svc.requiresConsultation || chance(0.5)) {
              const form = svc.category === "Injectables" ? pick([cfBotox, cfFiller]) : svc.category === "Laser & Light" ? cfLaser : cfFacial;
              await db.signedConsent.create({ data: { tenantId: tenant.id, patientId: pat.id, formId: form.id, appointmentId: appt.id, signedAt: new Date(startsAt.getTime() - 15 * 60000), signatureData: `${pat.firstName} ${pat.lastName}`, ipAddress: "172.16.x.x" } });
              consentCount++;
            }
            const tx = await db.treatmentRecord.create({ data: {
              tenantId: tenant.id, patientId: pat.id, providerId: prov.id, appointmentId: appt.id,
              serviceName: svc.name, performedAt: endsAt,
              areaTreated: svc.category === "Injectables" ? pick(["Glabella","Crow's feet","Forehead","Lips","Cheeks","Nasolabial"]) : svc.category === "Laser & Light" ? pick(["Upper lip","Full face","Underarms","Legs","Back"]) : pick(["Full face","Neck","Décolletage","Abdomen","Flanks"]),
              unitsUsed: svc.name.includes("Botox") ? ri(20, 64) : null,
              productLot: chance(0.4) ? `LOT-${ri(10000, 99999)}` : null,
              notes: pick(["Excellent result, minimal swelling.","Patient very happy — scheduled review.","Slight redness expected for 24h.","Used conservative dosing, top-up in 2 weeks."]),
              followUpDays: pick([14, 30, 90, null, null]),
            }});
            txCount++;

            if (chance(0.94)) {
              invSeq++;
              const tax = Math.round(price * (b.taxRate / 100) * 100) / 100;
              const paid = chance(0.93);
              const refunded = paid && chance(0.03);
              const inv = await db.invoice.create({ data: {
                tenantId: tenant.id, branchId: b.id, patientId: pat.id, number: `INV-2025-${String(invSeq).padStart(4, "0")}`,
                appointmentId: appt.id, items: JSON.stringify([{ name: svc.name, qty: 1, unitPrice: price }]),
                subtotal: price, discount: 0, tax, total: Math.round((price + tax) * 100) / 100, currency: b.currency,
                status: refunded ? "REFUNDED" : paid ? "PAID" : "UNPAID", method: pick(["CARD","CARD","STRIPE","CASH"]),
                paidAt: paid ? endsAt : null, createdById: recepLA.id, createdAt: endsAt,
              }});
              await db.payment.create({ data: { tenantId: tenant.id, invoiceId: inv.id, amount: inv.total, currency: b.currency,
                type: refunded ? "REFUND" : "PAYMENT", method: inv.method ?? "CARD", status: refunded ? "REFUNDED" : "SUCCEEDED",
                transactionRef: `ch_demo_${Math.floor(rnd() * 1e12).toString(36)}`, cardBrand: pick(["visa","mastercard","amex"]),
                cardLast4: String(ri(1000, 9999)), createdAt: endsAt } });
              payCount++;
            }
            // patient stats
            await db.patient.update({ where: { id: pat.id }, data: {
              lifetimeValue: { increment: price }, visitCount: { increment: 1 }, lastVisitAt: endsAt,
              noShowCount: status === "NO_SHOW" ? { increment: 1 } : undefined,
            }});
          }
          if (status === "NO_SHOW") {
            await db.patient.update({ where: { id: pat.id }, data: { noShowCount: { increment: 1 } } });
          }
        }
      }
    }
  }
  console.log(`   ✓ ${apptCount} appointments · ${txCount} treatment records · ${noteCount} notes · ${consentCount} consents · ${payCount} payments`);

  // ── Waitlist ───────────────────────────────────────────────────────────────
  for (const b of branches.slice(0, 3)) {
    const pats = byBranch(b.id);
    if (!pats.length) continue;
    for (let i = 0; i < 2; i++) {
      const pat = pick(pats);
      await db.waitlistEntry.create({ data: { branchId: b.id, patientId: pat.id, serviceId: pick(services).id,
        preferredDate: daysAhead(ri(2, 10)), preferredTime: pick(["morning", "afternoon", "evening"]),
        notes: pick(["Wants earlier slot if cancellation occurs.", "Flexible any day.", "Requested specific provider."]) } });
    }
  }

  // ── Leads pipeline ─────────────────────────────────────────────────────────
  const leadSpecs: { name: string; email: string; phone: string; source: string; status: string; interest: string; value: number; score: number }[] = [
    { name: "Kendra Walsh", email: "kendra.walsh@example.com", phone: "+1 (310) 555-0301", source: "INSTAGRAM", status: "NEW", interest: "Laser hair removal package", value: 1400, score: 62 },
    { name: "Tom Aldridge", email: "tom.aldridge@example.com", phone: "+44 20 7946 0302", source: "GOOGLE_ADS", status: "NEW", interest: "Botox first timer", value: 300, score: 55 },
    { name: "Becca Lin", email: "becca.lin@example.com", phone: "+1 (212) 555-0303", source: "AI_AGENT", status: "NEW", interest: "HydraFacial Platinum", value: 340, score: 71 },
    { name: "Sandra Adeyemi", email: "sandra.adeyemi@example.com", phone: "+44 161 496 0304", source: "REFERRAL", status: "CONTACTED", interest: "Morpheus8 face & neck", value: 900, score: 78 },
    { name: "Mike Donovan", email: "mike.donovan@example.com", phone: "+1 (310) 555-0305", source: "WEBSITE", status: "CONTACTED", interest: "CoolSculpting flanks", value: 1400, score: 66 },
    { name: "Aisha Rahman", email: "aisha.rahman@example.com", phone: "+44 20 7946 0306", source: "INSTAGRAM", status: "QUALIFIED", interest: "Lip filler + skin boosters", value: 900, score: 84 },
    { name: "Chris Newman", email: "chris.newman@example.com", phone: "+1 (212) 555-0307", source: "WALK_IN", status: "QUALIFIED", interest: "IV drip membership", value: 260, score: 73 },
    { name: "Lauren Pace", email: "lauren.pace@example.com", phone: "+1 (310) 555-0308", source: "EVENT", status: "CONSULT_BOOKED", interest: "Botox 3 areas + IPL", value: 640, score: 88 },
    { name: "Joe Barker", email: "joe.barker@example.com", phone: "+44 161 496 0309", source: "GOOGLE_ADS", status: "CONSULT_BOOKED", interest: "PRP hair restoration", value: 490, score: 81 },
    { name: "Tanya Brooks", email: "tanya.brooks@example.com", phone: "+1 (212) 555-0310", source: "REFERRAL", status: "CONVERTED", interest: "EMSCULPT NEO package", value: 2550, score: 95 },
    { name: "Ravi Mehta", email: "ravi.mehta@example.com", phone: "+1 (310) 555-0311", source: "WEBSITE", status: "CONVERTED", interest: "Botox recurring", value: 1140, score: 91 },
    { name: "Ellie Sargent", email: "ellie.sargent@example.com", phone: "+44 20 7946 0312", source: "AI_AGENT", status: "CONVERTED", interest: "HydraFacial membership", value: 948, score: 89 },
    { name: "Dana Fox", email: "dana.fox@example.com", phone: "+1 (310) 555-0313", source: "PRINT", status: "CONVERTED", interest: "Chemical peel course", value: 720, score: 76 },
    { name: "Ollie Grant", email: "ollie.grant@example.com", phone: "+44 161 496 0314", source: "FACEBOOK", status: "LOST", interest: "Laser large area", value: 270, score: 40, },
    { name: "Megan Cho", email: "megan.cho@example.com", phone: "+1 (212) 555-0315", source: "WEBSITE", status: "LOST", interest: "CoolSculpting", value: 550, score: 35 },
    { name: "Priya Shah", email: "priya.shah@example.com", phone: "+1 (310) 555-0316", source: "INSTAGRAM", status: "NEW", interest: "Skin booster course", value: 430, score: 58 },
    { name: "Gemma Cole", email: "gemma.cole@example.com", phone: "+44 20 7946 0317", source: "REFERRAL", status: "QUALIFIED", interest: "Full facial harmonisation", value: 2200, score: 87 },
    { name: "Ryan Wells", email: "ryan.wells@example.com", phone: "+1 (212) 555-0318", source: "AI_AGENT", status: "CONTACTED", interest: "B12 + IV drips", value: 305, score: 60 },
  ];
  for (const l of leadSpecs) {
    const branch = l.name.length % 2 === 0 ? branchLA : l.source.includes("44") ? branchLDN : branchNYC;
    const lead = await db.lead.create({ data: {
      tenantId: tenant.id, branchId: branch.id, name: l.name, email: l.email, phone: l.phone,
      source: l.source, status: l.status, score: l.score, interest: l.interest, estimatedValue: l.value,
      assignedToId: pick([recepLA.id, marketer.id, mgrLA.id, admin.id]),
      lastContactAt: l.status === "NEW" ? null : daysAgo(ri(1, 12)),
      nextFollowUpAt: ["NEW", "CONTACTED", "QUALIFIED", "CONSULT_BOOKED"].includes(l.status) ? daysAhead(ri(1, 6)) : null,
      lostReason: l.status === "LOST" ? pick(["Price too high", "Chose competitor", "Not reachable"]) : null,
      createdAt: daysAgo(ri(2, 45)),
    }});
    const acts: { type: string; content: string; by: string; d: number }[] = [];
    if (l.status !== "NEW") acts.push({ type: "SMS", content: `Hi ${l.name.split(" ")[0]}! Thanks for your interest in ${l.interest} at Auralis. When would you like to come in for a free consultation?`, by: "AI_AGENT", d: 1 });
    if (["QUALIFIED", "CONSULT_BOOKED", "CONVERTED"].includes(l.status))
      acts.push({ type: "CALL", content: "Qualification call — budget confirmed, timeline within 30 days, no contraindications reported.", by: recepLA.id, d: 3 });
    if (["CONSULT_BOOKED", "CONVERTED"].includes(l.status))
      acts.push({ type: "STATUS_CHANGE", content: "Consultation booked — calendar invite + deposit link sent.", by: "AI_AGENT", d: 5 });
    if (l.status === "CONVERTED")
      acts.push({ type: "STATUS_CHANGE", content: "Converted to patient — first appointment completed, added to Glow Club nurture track.", by: marketer.id, d: 8 });
    if (l.status === "LOST")
      acts.push({ type: "NOTE", content: "Win-back sequence scheduled for 90 days.", by: "AI_AGENT", d: 6 });
    for (const a of acts) {
      await db.leadActivity.create({ data: { leadId: lead.id, type: a.type, content: a.content, createdBy: a.by, createdAt: daysAgo(a.d) } });
    }
  }
  console.log(`   ✓ ${leadSpecs.length} leads with activity trails`);

  // ── Campaigns ──────────────────────────────────────────────────────────────
  await db.campaign.create({ data: { tenantId: tenant.id, name: "Summer Glow — Email Blast", type: "EMAIL", segment: "All active patients (last 90 days)", subject: "✨ Your Summer Glow starts here — 20% off HydraFacials",
    content: "Hi {{first_name}},\n\nSummer is here and your skin deserves the spotlight. Enjoy 20% off all HydraFacial treatments booked this month at any Auralis location.\n\nBook now → {{booking_link}}\n\nThe Auralis Team ✦", status: "COMPLETED", scheduledAt: daysAgo(30), sentCount: 842, openedCount: 461, clickedCount: 128, convertedCount: 39, revenue: 12480 } });
  await db.campaign.create({ data: { tenantId: tenant.id, name: "Win-Back: 90-Day Sleepers", type: "WIN_BACK", segment: "Inactive 90+ days", subject: "We miss you! Here's £25 to come back",
    content: "Hi {{first_name}}, it's been a while! Your skin's been asking about you. Here's £25 credit towards your next visit — valid 30 days.", status: "ACTIVE", scheduledAt: daysAgo(5), aiGenerated: true, sentCount: 187, openedCount: 96, clickedCount: 34, convertedCount: 12, revenue: 4180 } });
  await db.campaign.create({ data: { tenantId: tenant.id, name: "Botox Loyalty Rebook (SMS)", type: "REBOOK", segment: "Botox patients, 12+ weeks since visit",
    content: "Hi {{first_name}}, it's been ~12 weeks since your last Botox — perfect timing for a top-up. Reply BOOK and we'll find you a slot this week. — Auralis ✦", status: "ACTIVE", scheduledAt: daysAgo(2), aiGenerated: true, sentCount: 94, openedCount: 88, clickedCount: 27, convertedCount: 11, revenue: 4180 } });
  await db.campaign.create({ data: { tenantId: tenant.id, name: "Refer-a-Friend — Both Get £25", type: "REFERRAL", segment: "All patients",
    content: "Love your results? Share the glow. When your friend books, you both get £25 credit.", status: "SCHEDULED", scheduledAt: daysAhead(4), sentCount: 0 } });
  await db.campaign.create({ data: { tenantId: tenant.id, name: "Black Friday VIP Preview (AI draft)", type: "PROMO", segment: "VIP + members", subject: "VIP early access: Black Friday aesthetics, 48h before anyone else",
    content: "{{first_name}}, you're on the VIP list. Black Friday drops Friday — but your early access starts Wednesday at 9am. Packages up to 30% off. Priority slots are first-come.", status: "DRAFT", aiGenerated: true } });

  // ── Message logs ───────────────────────────────────────────────────────────
  const msgPairs = [
    ["SMS", "OUTBOUND", "Reminder: your HydraFacial tomorrow at 2:00 PM. Reply R to reschedule.", "DELIVERED"],
    ["EMAIL", "OUTBOUND", "Your treatment plan & aftercare guide", "SENT"],
    ["SMS", "INBOUND", "Can I move my Botox to Friday afternoon?", "DELIVERED"],
    ["EMAIL", "OUTBOUND", "Welcome to Auralis — what to expect at your first visit", "SENT"],
    ["CALL", "OUTBOUND", "Follow-up call post-treatment — no concerns reported.", "COMPLETED"],
    ["CHAT", "INBOUND", "Do you offer Klarna?", "ANSWERED"],
    ["SMS", "OUTBOUND", "Happy birthday! 🎉 Enjoy £15 credit this month.", "DELIVERED"],
    ["EMAIL", "INBOUND", "Re: Invoice INV-2025-0012 — receipt requested", "SENT"],
  ] as const;
  for (let i = 0; i < msgPairs.length; i++) {
    const [channel, direction, body, status] = msgPairs[i];
    const pat = pick(patients);
    await db.messageLog.create({ data: { tenantId: tenant.id, channel, direction, patientId: pat.id,
      subject: channel === "EMAIL" ? pick(["Your appointment confirmation", "Aftercare instructions", "Exclusive member offer"]) : null,
      body, status, createdAt: daysAgo(ri(0, 20)) } });
  }

  // ── Memberships ────────────────────────────────────────────────────────────
  const planSilver = await db.membershipPlan.create({ data: { tenantId: tenant.id, name: "Glow Club Silver", description: "One Signature HydraFacial per month + 10% off retail", price: 99, currency: "USD", billingCycle: "MONTHLY", perksValue: 149, benefits: "1x HydraFacial Signature monthly,10% off skincare retail,Priority booking window,Birthday treatment upgrade" } });
  const planGold = await db.membershipPlan.create({ data: { tenantId: tenant.id, name: "Glow Club Gold", description: "$350 monthly treatment credit + VIP perks", price: 199, currency: "USD", billingCycle: "MONTHLY", perksValue: 350, benefits: "$350 monthly credit,15% off all injectables,Free B12 shot monthly,Bring-a-friend free pass,Priority AI booking" } });
  const planAnnualUK = await db.membershipPlan.create({ data: { tenantId: tenant.id, name: "Radiance Annual — UK", description: "Full-year plan with quarterly skin reviews", price: 1499, currency: "GBP", billingCycle: "ANNUAL", perksValue: 2000, benefits: "4x quarterly skin reviews,20% off treatments all year,2x free LED sessions,Unlimited patch tests" } });
  const memberPatients = patients.filter((p) => (p.tags ?? "").includes("Member"));
  for (const p of memberPatients) {
    const plan = p.country === "UK" ? planAnnualUK : pick([planSilver, planGold]);
    await db.membership.create({ data: { planId: plan.id, patientId: p.id, branchId: p.branchId, status: chance(0.9) ? "ACTIVE" : "PAUSED", startedAt: daysAgo(ri(30, 300)), renewsAt: daysAhead(ri(3, 30)), pricePaid: plan.price } });
  }

  // ── Packages & gift cards ──────────────────────────────────────────────────
  const pkg3Hydra = await db.servicePackage.create({ data: { tenantId: tenant.id, name: "3x HydraFacial Bundle", serviceIds: "", sessions: 3, price: 561, currency: "USD", expiryDays: 365 } });
  const pkg6Laser = await db.servicePackage.create({ data: { tenantId: tenant.id, name: "6-Session Laser Hair Removal", serviceIds: "", sessions: 6, price: 918, currency: "USD", expiryDays: 365 } });
  for (let i = 0; i < 6; i++) {
    const p = pick(patients);
    const pkg = chance(0.5) ? pkg3Hydra : pkg6Laser;
    const used = ri(0, pkg.sessions);
    await db.patientPackage.create({ data: { patientId: p.id, name: pkg.name, sessionsTotal: pkg.sessions, sessionsUsed: used, price: pkg.price, purchasedAt: daysAgo(ri(20, 200)), expiresAt: daysAhead(ri(30, 300)) } });
  }
  for (let i = 0; i < 5; i++) {
    const amt = pick([100, 150, 250, 500]);
    await db.giftCard.create({ data: { tenantId: tenant.id, code: `GC-${ri(10000, 99999)}-${pick(["AURA", "GLOW", "LUXE"])}`, initialAmount: amt, balance: pick([0, amt, Math.round(amt / 2)]), currency: "USD", buyerPatientId: pick(patients).id, status: pick(["ACTIVE", "ACTIVE", "REDEEMED"]), expiryAt: daysAhead(ri(30, 400)), createdAt: daysAgo(ri(10, 300)) } });
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  const products: [string, string, string, number, number, number, number, string | null, number | null][] = [
    ["Botox OnabotulinumtoxinA 100u", "RX-BTX-100", "Injectables", 550, 0, 12, 8, "LOT-88121", 45],
    ["Juvederm Voluma 1ml", "RX-JVD-1ML", "Injectables", 320, 0, 9, 6, "LOT-77213", 60],
    ["Juvederm Ultra Plus 1ml", "RX-JUP-1ML", "Injectables", 290, 0, 5, 6, "LOT-77450", 60],
    ["SkinPen Precision Cartridge", "CN-SKN-CRT", "Consumables", 28, 95, 42, 20, "LOT-91002", 30],
    ["HydraFacial Serum — DermaBuild", "CN-HYD-SRM", "Consumables", 48, 0, 17, 10, "LOT-55219", 90],
    ["IPL Handpiece Filter 560nm", "EQ-IPL-560", "Consumables", 210, 0, 4, 4, "LOT-33017", 120],
    ["ZO Gentle Cleanser 200ml", "RT-ZO-CLN", "Retail", 22, 45, 31, 12, null, 200],
    ["ZO Daily Power Defense 30ml", "RT-ZO-DPD", "Retail", 78, 155, 14, 10, null, 200],
    ["Alastin Regenerating Skin Nectar", "RT-ALS-RSN", "Retail", 92, 195, 8, 8, null, 200],
    ["Obagi Vitamin C 15%", "RT-OBG-VC15", "Retail", 55, 120, 11, 8, null, 200],
    ["Sterile gauze packs (box)", "CN-GAUZ-BX", "Consumables", 9, 0, 64, 25, null, 150],
    ["Nitrile gloves M (box)", "CN-GLV-M", "Consumables", 12, 0, 38, 20, null, 150],
    ["Prinovix PRP tubes (10)", "CN-PRP-TB10", "Consumables", 85, 0, 7, 6, "LOT-22055", 75],
    ["CoolSculpting applicator cup", "EQ-CSA-CUP", "Consumables", 140, 0, 6, 4, "LOT-44120", 90],
    ["IV Glow drip kit", "CN-IVG-KIT", "Consumables", 34, 0, 22, 12, "LOT-66031", 60],
    ["LED mask sheet (box)", "CN-LED-BX", "Consumables", 18, 0, 3, 8, null, 120],
  ];
  for (const [name, sku, category, cost, retail, qty, low, lot, expDays] of products) {
    await db.product.create({ data: { tenantId: tenant.id, name, sku, category,
      supplier: pick(["Allergan Direct", "Aesthetics Supply Co", "MedWholesale UK", "Croma Pharma"]),
      costPrice: cost, retailPrice: retail, stockQty: qty, lowStockThreshold: low, unit: "unit",
      lotNumber: lot, expiryAt: expDays ? daysAhead(expDays) : null, branchId: chance(0.7) ? null : pick(branches).id } });
  }
  await db.purchaseOrder.create({ data: { tenantId: tenant.id, branchId: branchLA.id, supplier: "Allergan Direct", items: JSON.stringify([{ name: "Botox 100u", qty: 10, unitCost: 550 }, { name: "Juvederm Voluma", qty: 6, unitCost: 320 }]), total: 7420, status: "ORDERED", orderedAt: daysAgo(4) } });
  await db.purchaseOrder.create({ data: { tenantId: tenant.id, branchId: branchLDN.id, supplier: "MedWholesale UK", items: JSON.stringify([{ name: "SkinPen cartridges", qty: 30, unitCost: 28 }]), total: 840, status: "RECEIVED", orderedAt: daysAgo(15), receivedAt: daysAgo(9) } });
  await db.purchaseOrder.create({ data: { tenantId: tenant.id, supplier: "Aesthetics Supply Co", items: JSON.stringify([{ name: "Nitrile gloves M", qty: 50, unitCost: 12 }]), total: 600, status: "DRAFT" } });

  // ── Reviews & referrals ────────────────────────────────────────────────────
  const reviews: [number, string, string, string, string | null, string][] = [
    [5, "GOOGLE", "Best medspa in LA — Dr. Nair is an artist with Botox. Natural results every time.", null, null, "PUBLISHED"],
    [5, "GOOGLE", "HydraFacial Platinum is worth every penny. My skin has never looked better.", null, null, "PUBLISHED"],
    [5, "INTERNAL", "Smooth booking, zero waiting, lovely clinic. The deposit system made me commit and I'm glad!", null, null, "PUBLISHED"],
    [4, "GOOGLE", "Great results with laser hair removal after 3 sessions. Parking was tricky.", null, "Thanks for the feedback — we've added valet validation for patients!", "PUBLISHED"],
    [5, "INTERNAL", "The AI assistant booked me at 11pm for a next-day slot. Wild.", null, null, "PUBLISHED"],
    [5, "TRUSTPILOT", "Mayfair clinic is immaculate. Dr. Hartley explained everything.", null, null, "PUBLISHED"],
    [5, "GOOGLE", "Morpheus8 changed my jawline. Staff are wonderful, pricing transparent.", null, null, "PUBLISHED"],
    [4, "INTERNAL", "Loving the membership — free B12 shot is a nice touch.", null, null, "PUBLISHED"],
    [5, "GOOGLE", "PRP hair treatment showing real growth after 2 sessions.", null, null, "PUBLISHED"],
    [4, "GOOGLE", "EMSCULPT is intense but effective. Reception could answer calls faster.", null, "We've added our AI receptionist for 24/7 call answering — try us again!", "PUBLISHED"],
    [3, "GOOGLE", "Booked laser but room was double-booked and waited 30 min.", "FLAGGED", "We're so sorry — scheduling error fully resolved with our team and a complimentary session.", "RESPONDED"],
    [5, "INTERNAL", "Manchester branch: Grace is the best injector in the North West, hands down.", null, null, "PUBLISHED"],
  ];
  for (const [rating, platform, comment, flag, response, status] of reviews) {
    const pat = pick(patients);
    await db.review.create({ data: { tenantId: tenant.id, branchId: pat.branchId, patientId: pat.id, rating, comment, platform, status, response, createdAt: daysAgo(ri(1, 60)) } });
  }
  for (let i = 0; i < 4; i++) {
    const ref = pick(patients);
    await db.referral.create({ data: { tenantId: tenant.id, referrerPatientId: ref.id,
      referredName: pick(["Jess M.", "Tom H.", "Alice W.", "Ben C.", "Lucy P.", "Sam T."]),
      referredContact: pick(["+1 (310) 555-04xx", "+44 20 7946 04xx"]),
      status: pick(["INVITED", "VISITED", "CONVERTED", "REWARDED"]), rewardAmount: pick([25, 50]), createdAt: daysAgo(ri(5, 90)) } });
  }

  // ── Notifications, audit, tickets, AI interactions, settings ───────────────
  const notifs: [string, string, string][] = [
    ["Low stock alert", "Botox OnabotulinumtoxinA 100u is at 12 units (threshold 8) at Beverly Hills.", "ALERT"],
    ["New 5-star review", "“Best medspa in LA — Dr. Nair is an artist with Botox.” — Google", "INFO"],
    ["AI booking", "AI Front Desk booked Sarah M. for HydraFacial tomorrow 11:00 (from Instagram DM).", "AI"],
    ["Deposit received", "£100 deposit paid for Morpheus8 — London Mayfair, next Tuesday.", "PAYMENT"],
    ["Lead assigned", "High-score lead Gemma Cole (87) assigned to Ella Brooks.", "LEAD"],
    ["Waitlist opportunity", "Cancellation at 2:00 PM today — 3 waitlist matches for Laser Small Area.", "APPOINTMENT"],
    ["Membership renewal", "Glow Club Gold renews for Ava Thompson in 3 days.", "INFO"],
    ["Churn risk detected", "Jackson Reed hasn't rebooked in 120 days — Loyalty Agent drafted a win-back SMS.", "AI"],
  ];
  for (const [title, body, type] of notifs) {
    await db.notification.create({ data: { tenantId: tenant.id, title, body, type, isRead: chance(0.3), createdAt: daysAgo(ri(0, 7)) } });
  }
  const audits: [string, string, string][] = [
    ["LOGIN", "User", "Successful login with MFA"],
    ["CREATE_PATIENT", "Patient", "New patient record created via reception desk"],
    ["UPDATE_APPOINTMENT", "Appointment", "Rescheduled — provider change"],
    ["REFUND", "Invoice", "Partial refund issued — goodwill, manager approved"],
    ["EXPORT_DATA", "Report", "Monthly revenue report exported (CSV)"],
    ["VIEW_EMR", "Patient", "Clinical notes viewed (role: PROVIDER)"],
    ["CONSENT_SIGNED", "SignedConsent", "Botox consent v2 signed digitally"],
    ["DELETE_LEAD", "Lead", "Duplicate lead merged and archived"],
    ["PRICE_UPDATE", "Service", "HydraFacial Signature price £175 → £179 (Mayfair)"],
    ["LOGIN", "User", "AI agent service account authenticated (scoped token)"],
  ];
  for (const [action, entity, details] of audits) {
    await db.auditLog.create({ data: { tenantId: tenant.id, userId: pick([owner.id, admin.id, recepLA.id, prov1.id]), action, entity, details, ipAddress: "10.0.x.x", createdAt: daysAgo(ri(0, 14)) } });
  }
  await db.supportTicket.create({ data: { tenantId: tenant.id, subject: "Stripe payout reconciliation for March", message: "Payout timestamps don't match invoice paid dates for 4 transactions. Can finance review?", status: "PENDING", priority: "NORMAL", createdBy: admin.id, createdAt: daysAgo(3) } });
  await db.supportTicket.create({ data: { tenantId: tenant.id, subject: "Request: VAT invoice template for UK branches", message: "Need VAT number + company registry details printed on UK invoices for HMRC compliance.", status: "OPEN", priority: "HIGH", createdBy: prov4.id, createdAt: daysAgo(1) } });
  const aiLogs: [string, string, string][] = [
    ["FRONT_DESK", "Hi! Do you have any Botox slots this Saturday morning in Mayfair?", "Yes! Dr. Hartley has 9:30 and 11:00 available this Saturday at our Mayfair clinic. A £50 deposit secures the slot — shall I hold 9:30 for you?"],
    ["BOOKING", "Book laser hair removal for Ava Thompson next Tuesday afternoon", "Booked: Laser Hair Removal — Small Area, Tuesday 14:00 with James Whitfield at Beverly Hills. Confirmation sent via SMS. Deposit link attached."],
    ["ENGAGEMENT", "Draft a follow-up for lead Kendra Walsh (laser package, viewed pricing twice)", "Kendra, quick heads-up — our laser packages are 15% off until Friday and I've reserved a consultation slot for you Thursday at 5:30pm. Want me to keep it?"],
    ["LOYALTY", "Which patients are at churn risk this month?", "2 patients flagged: Jackson Reed (120 days inactive, was 3x/year) and Emily Baxter (95 days, membership lapsing next month). Drafted personalised win-back offers for both."],
    ["DISCOVERY", "Write a blog intro about autumn skin recovery", "As autumn settles in, your skin is quietly recovering from a summer of sun, salt and SPF fatigue. This is the perfect window for corrective treatments — here's how our medical team recommends rebuilding your glow before the party season…"],
  ];
  for (const [agent, input, output] of aiLogs) {
    await db.aiInteraction.create({ data: { tenantId: tenant.id, agent, input, output, tokensUsed: ri(300, 900), createdAt: daysAgo(ri(0, 10)) } });
  }
  await db.setting.create({ data: { tenantId: tenant.id, key: "booking_policy", value: JSON.stringify({ depositRequiredOver: 300, cancellationWindowHours: 24, noShowFee: 50, onlineBookingEnabled: true, aiBookingEnabled: true }) } });
  await db.setting.create({ data: { tenantId: tenant.id, key: "compliance", value: JSON.stringify({ hipaaMode: true, ukGdprMode: true, dataRetentionMonths: 84, baaStatus: "INTERNAL_ONLY_DEMO" }) } });

  console.log(`   ✓ memberships, packages, gift cards, inventory, reviews, ops`);
  console.log(`\n🌸 Seeded successfully:`);
  console.log(`   tenant=1 branches=4 users=11 patients=${patients.length}`);
  console.log(`   appointments=${apptCount} treatments=${txCount} invoices=${invSeq}`);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
