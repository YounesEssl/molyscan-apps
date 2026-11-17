// Seed isolé des affectations département → commerciaux — sûr en production.
// Additif uniquement : connecte les commerciaux listés dans
// data/department-commercials.ts à leurs départements, sans jamais retirer une
// affectation existante (utiliser PUT /api/admin/departments/:id/commercials
// pour remplacer la liste d'un département).
//
//   npm run prisma:seed:department-commercials

import { PrismaClient, UserRole } from '@prisma/client';
import { DEPARTMENT_COMMERCIALS } from './data/department-commercials';

const prisma = new PrismaClient();

async function main() {
  const entries = Object.entries(DEPARTMENT_COMMERCIALS);
  if (entries.length === 0) {
    console.log('ℹ️  Aucune affectation définie dans data/department-commercials.ts.');
    return;
  }

  let linked = 0;
  const problems: string[] = [];
  for (const [key, emails] of entries) {
    const department = await prisma.department.findFirst({
      where: { OR: [{ code: key }, { name: key }] },
    });
    if (!department) {
      problems.push(`département introuvable : ${key}`);
      continue;
    }
    for (const email of emails) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' } },
      });
      if (!user || user.role !== UserRole.commercial) {
        problems.push(`${email} : compte introuvable ou non commercial (${key})`);
        continue;
      }
      await prisma.department.update({
        where: { id: department.id },
        data: { users: { connect: { id: user.id } } },
      });
      linked++;
    }
  }

  console.log(`✅ ${linked} affectation(s) appliquée(s).`);
  if (problems.length) {
    console.warn(`⚠️  ${problems.length} problème(s) :\n - ${problems.join('\n - ')}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed affectations échoué:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
