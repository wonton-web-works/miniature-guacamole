/**
 * seed.ts — Development seed for the enterprise auth/licensing schema.
 *
 * Creates:
 *  - Organization: Wonton Web Works
 *  - Admin user:   byazaki@wontonwebworks.com
 *  - License:      enterprise tier, all features, 10 seats, 1 year from today
 *  - Session:      a deterministic test bearer token
 *
 * Usage:
 *   npx ts-node dashboard/prisma/seed.ts
 *   # or via package.json prisma.seed config:
 *   npx prisma db seed
 *
 * Safe to re-run: all upserts use skipDuplicates or upsert semantics.
 *
 * NOTE: This seed is for local development and CI only.
 * Never run against production. The password hash below corresponds to the
 * plaintext "seed-password-change-me" — rotate before any real usage.
 */

import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";
const LICENSE_ID = "00000000-0000-0000-0000-000000000003";
const SESSION_ID = "00000000-0000-0000-0000-000000000004";

// bcrypt hash for "seed-password-change-me" (cost 12)
// Generated offline — do not rely on this for production.
const SEED_PASSWORD_HASH =
  "$2b$12$wonton.seed.hash.placeholder.for.dev.only.do.not.use.X";

// Deterministic test token — never use a static token in production.
const TEST_SESSION_TOKEN = crypto
  .createHash("sha256")
  .update("wonton-web-works-dev-seed-token-2026")
  .digest("hex");

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const ALL_ENTERPRISE_FEATURES = [
  "sage",
  "selective-routing",
  "session-management",
  "research-specialists",
  "drift-enforcement",
  "cmo-enterprise",
  "cfo-enterprise",
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Seeding database...\n");

  // -- Organization ----------------------------------------------------------
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    create: {
      id: ORG_ID,
      name: "Wonton Web Works",
      slug: "wonton-web-works",
    },
    update: {
      name: "Wonton Web Works",
      slug: "wonton-web-works",
    },
  });
  console.log(`Organization:  ${org.name} (${org.id})`);

  // -- Admin user ------------------------------------------------------------
  const user = await prisma.user.upsert({
    where: { id: USER_ID },
    create: {
      id: USER_ID,
      email: "byazaki@wontonwebworks.com",
      name: "B. Yazaki",
      passwordHash: SEED_PASSWORD_HASH,
      orgId: ORG_ID,
      role: "admin",
    },
    update: {
      name: "B. Yazaki",
      role: "admin",
    },
  });
  console.log(`User:          ${user.email} (role: ${user.role})`);

  // -- Enterprise license ----------------------------------------------------
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ONE_YEAR_MS);

  const license = await prisma.license.upsert({
    where: { id: LICENSE_ID },
    create: {
      id: LICENSE_ID,
      orgId: ORG_ID,
      tier: "enterprise",
      seats: 10,
      features: ALL_ENTERPRISE_FEATURES,
      issuedAt,
      expiresAt,
      active: true,
    },
    update: {
      tier: "enterprise",
      seats: 10,
      features: ALL_ENTERPRISE_FEATURES,
      expiresAt,
      active: true,
      revokedAt: null,
      revokeReason: null,
    },
  });
  console.log(
    `License:       ${license.tier} tier, ${license.seats} seats, expires ${license.expiresAt.toISOString()}`
  );
  console.log(`               features: ${license.features.join(", ")}`);

  // -- Test session ----------------------------------------------------------
  const sessionExpiresAt = new Date(issuedAt.getTime() + ONE_YEAR_MS);

  const session = await prisma.session.upsert({
    where: { id: SESSION_ID },
    create: {
      id: SESSION_ID,
      userId: USER_ID,
      token: TEST_SESSION_TOKEN,
      machineId: "dev-seed-machine",
      userAgent: "teo/0.4.0-seed darwin-arm64",
      expiresAt: sessionExpiresAt,
    },
    update: {
      expiresAt: sessionExpiresAt,
      revokedAt: null,
    },
  });
  console.log(`Session:       token=${session.token.substring(0, 16)}...`);

  // -- Audit log entry -------------------------------------------------------
  await prisma.auditLog.create({
    data: {
      userId: USER_ID,
      orgId: ORG_ID,
      action: "license_issued",
      details: {
        tier: "enterprise",
        seats: 10,
        features: ALL_ENTERPRISE_FEATURES,
        seededAt: issuedAt.toISOString(),
      },
      ip: "127.0.0.1",
      machineId: "dev-seed-machine",
    },
  });
  console.log(`AuditLog:      license_issued event recorded`);

  console.log("\nSeed complete.");
  console.log(
    "\nWARNING: The password hash in this seed is a placeholder."
  );
  console.log(
    "         Replace SEED_PASSWORD_HASH with a real bcrypt hash before any non-local use.\n"
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
