/**
 * Supprime tous les scans, conversations et données liées pour un utilisateur.
 * Usage : npx ts-node prisma/cleanup-user.ts <email>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node prisma/cleanup-user.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Utilisateur "${email}" introuvable.`);
    process.exit(1);
  }

  console.log(`\nUtilisateur : ${user.email} (${user.id})`);

  // Compter avant suppression
  const [scans, conversations] = await Promise.all([
    prisma.scan.count({ where: { userId: user.id } }),
    prisma.aIConversation.count({ where: { userId: user.id } }),
  ]);
  console.log(`  Scans       : ${scans}`);
  console.log(`  Conversations : ${conversations}`);
  console.log('');

  // 1. Détacher les notes vocales (FK nullable)
  const voiceNotesUpdated = await prisma.voiceNote.updateMany({
    where: { userId: user.id, relatedScanId: { not: null } },
    data: { relatedScanId: null },
  });
  console.log(`✓ Notes vocales détachées : ${voiceNotesUpdated.count}`);

  // 2. Supprimer les workflows de prix liés aux scans
  const userScanIds = (
    await prisma.scan.findMany({ where: { userId: user.id }, select: { id: true } })
  ).map((s) => s.id);

  const workflowsDeleted = await prisma.priceWorkflow.deleteMany({
    where: { scanId: { in: userScanIds } },
  });
  console.log(`✓ Workflows supprimés : ${workflowsDeleted.count}`);

  // 3. Supprimer les conversations (cascade → messages + submissions)
  const convsDeleted = await prisma.aIConversation.deleteMany({
    where: { userId: user.id },
  });
  console.log(`✓ Conversations supprimées : ${convsDeleted.count}`);

  // 4. Supprimer les scans (cascade → feedbacks)
  const scansDeleted = await prisma.scan.deleteMany({
    where: { userId: user.id },
  });
  console.log(`✓ Scans supprimés : ${scansDeleted.count}`);

  console.log('\nTerminé.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
