/**
 * Seed script — currently empty.
 *
 * Marea runs against a clean database. Users are created via
 * `POST /api/auth/register` and configure their accounts, cards, etc.
 * through the onboarding wizard.
 *
 * If you want development fixtures, add them inside main() below and
 * run `npm run seed`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌊 No seed data inserted. Database stays clean.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
