import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const url = process.env.TURSO_DATABASE_URL!.replace("libsql://", "https://");
const token = process.env.TURSO_AUTH_TOKEN!;

const adapter = new PrismaLibSQL({ url, authToken: token } as never);
const prisma = new PrismaClient({ adapter } as never);
const count = await prisma.appointment.count();
console.log("1. count OK:", count);
const appt = await prisma.appointment.findFirst({ include: { patient: true, service: true, branch: true } });
console.log("2. include OK:", appt?.patient.firstName, "→", appt?.service.name, "@", appt?.branch.name);
const tx = await prisma.$transaction([prisma.patient.count(), prisma.invoice.count()]);
console.log("3. $transaction OK:", tx);
const tenant = await prisma.tenant.findFirstOrThrow();
const created = await prisma.auditLog.create({ data: { tenantId: tenant.id, action: "ADAPTER_TEST", details: "turso write test" } });
console.log("4. write OK:", created.id.slice(0, 8));
await prisma.auditLog.delete({ where: { id: created.id } });
console.log("✅ TURSO ADAPTER FULLY WORKING");
