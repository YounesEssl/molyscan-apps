// Seed isolé des départements — sûr à exécuter en production.
// Contrairement à seed.ts, il ne crée AUCUNE donnée de démo (utilisateurs,
// produits, scans…) : il se contente d'upsert la liste de référence des
// départements. Idempotent (upsert par nom).
//
//   npx prisma db execute  ❌  (SQL only)
//   npm run prisma:seed:departments  ✅

import { PrismaClient } from '@prisma/client';
import { DEPARTMENTS } from './data/departments';

const prisma = new PrismaClient();

async function main() {
  console.log(`🌱 Seeding ${DEPARTMENTS.length} départements…`);
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: { code: dept.code },
      create: { code: dept.code, name: dept.name },
    });
  }
  console.log(`✅ ${DEPARTMENTS.length} départements upsertés.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed départements échoué:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
