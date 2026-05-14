/**
 * Seed script — actualmente vacío.
 *
 * Marea opera contra una base de datos limpia. Los usuarios se crean vía
 * `POST /api/auth/register` y configuran sus cuentas, tarjetas y demás
 * desde el wizard de onboarding.
 *
 * Si quieres datos de prueba para desarrollo, agrégalos aquí dentro de la
 * función main() y corre `npm run seed`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌊 No se sembraron datos. La BD queda limpia.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
