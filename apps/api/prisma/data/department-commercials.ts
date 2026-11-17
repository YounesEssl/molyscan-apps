// Affectations département → commerciaux Molydal, utilisées pour router les
// demandes d'inscription client (lien d'approbation par email), les demandes
// de prix et les mails de scan.
//
// ⚠️ La liste réelle n'est pas encore connue : à compléter avant d'exécuter
// `npm run prisma:seed:department-commercials`. Clé = code du département
// (cf. data/departments.ts, ex. '69') ou nom exact pour les zones sans code ;
// valeur = emails de comptes commerciaux existants (rôle commercial).
//
// Exemple :
//   '69': ['prenom.nom@molydal.com'],
//   '01': ['prenom.nom@molydal.com', 'autre.commercial@molydal.com'],

export const DEPARTMENT_COMMERCIALS: Record<string, string[]> = {};
