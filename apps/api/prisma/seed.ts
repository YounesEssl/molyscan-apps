import { PrismaClient, UserRole, ScanStatus, ScanMethod, WorkflowStatus, NotificationType, ExportFormat, ExportStatus, PricingTier } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── USERS ──────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const marc = await prisma.user.upsert({
    where: { email: 'marc.dupont@molydal.com' },
    update: { avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg' },
    create: {
      id: 'usr-001',
      email: 'marc.dupont@molydal.com',
      passwordHash,
      firstName: 'Marc',
      lastName: 'Dupont',
      role: UserRole.commercial,
      company: 'Molydal',
      phone: '+33 6 12 34 56 78',
      avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      createdAt: new Date('2024-01-15T09:00:00.000Z'),
    },
  });

  const sophie = await prisma.user.upsert({
    where: { email: 'sophie.martin@lubritech.fr' },
    update: {},
    create: {
      id: 'usr-002',
      email: 'sophie.martin@lubritech.fr',
      passwordHash,
      firstName: 'Sophie',
      lastName: 'Martin',
      role: UserRole.distributor,
      company: 'LubriTech Distribution',
      phone: '+33 6 98 76 54 32',
      createdAt: new Date('2024-02-10T14:30:00.000Z'),
    },
  });

  const pierre = await prisma.user.upsert({
    where: { email: 'pierre.leroy@molydal.com' },
    update: {},
    create: {
      id: 'usr-003',
      email: 'pierre.leroy@molydal.com',
      passwordHash,
      firstName: 'Pierre',
      lastName: 'Leroy',
      role: UserRole.admin,
      company: 'Molydal',
      phone: '+33 6 55 44 33 22',
      createdAt: new Date('2023-11-01T08:00:00.000Z'),
    },
  });

  const guillaume = await prisma.user.upsert({
    where: { email: 'lepage@molydal.com' },
    update: {},
    create: {
      id: 'usr-004',
      email: 'lepage@molydal.com',
      passwordHash,
      firstName: 'Guillaume',
      lastName: 'Le Page',
      role: UserRole.commercial,
      company: 'Molydal',
      phone: '+33 6 11 22 33 44',
      createdAt: new Date(),
    },
  });

  console.log('✅ Users created');

  // ─── COMPETITOR PRODUCTS ────────────────────────
  const competitorProducts = [
    { id: 'cp-001', barcode: '3456789012345', name: 'Mobilux EP 2', brand: 'Mobil', category: 'Graisses', subcategory: 'EP Lithium' },
    { id: 'cp-002', barcode: '4567890123456', name: 'Total Carter EP 220', brand: 'TotalEnergies', category: 'Huiles industrielles', subcategory: 'Engrenages' },
    { id: 'cp-003', barcode: '5678901234567', name: 'Shell Tellus S2 MX 46', brand: 'Shell', category: 'Huiles hydrauliques', subcategory: 'Anti-usure' },
    { id: 'cp-004', barcode: '6789012345678', name: 'Castrol Hyspin AWH-M 68', brand: 'Castrol', category: 'Huiles hydrauliques', subcategory: 'Anti-usure' },
    { id: 'cp-005', barcode: '7890123456789', name: 'Fuchs Renolin B 15', brand: 'Fuchs', category: 'Huiles hydrauliques', subcategory: 'Standard' },
    { id: 'cp-006', barcode: '8901234567890', name: 'Klüber Isoflex NBU 15', brand: 'Klüber', category: 'Graisses', subcategory: 'Haute vitesse' },
    { id: 'cp-007', barcode: '9012345678901', name: 'BP Energol GR-XP 320', brand: 'BP', category: 'Huiles industrielles', subcategory: 'Engrenages' },
    { id: 'cp-008', barcode: '0123456789012', name: 'Petronas Tutela MR 3', brand: 'Petronas', category: 'Graisses', subcategory: 'Multi-usage' },
    { id: 'cp-009', barcode: '1234567890124', name: 'Total Nevastane XMF', brand: 'TotalEnergies', category: 'Huiles alimentaires', subcategory: 'NSF H1' },
    { id: 'cp-010', barcode: '2345678901235', name: 'Shell Corena S3 R 46', brand: 'Shell', category: 'Huiles compresseurs', subcategory: 'Rotatif' },
    { id: 'cp-011', barcode: '3456789012346', name: 'Mobil DTE 25', brand: 'Mobil', category: 'Huiles hydrauliques', subcategory: 'Anti-usure' },
    { id: 'cp-012', barcode: '4567890123457', name: 'Castrol Optigear BM 150', brand: 'Castrol', category: 'Huiles industrielles', subcategory: 'Engrenages' },
  ];

  for (const cp of competitorProducts) {
    await prisma.competitorProduct.upsert({
      where: { barcode: cp.barcode },
      update: {},
      create: cp,
    });
  }
  console.log('✅ Competitor products created');

  // ─── MOLYDAL PRODUCTS ───────────────────────────
  const molydalProducts = [
    { id: 'mol-001', reference: 'MOL-GR-002', name: 'Molyduval Soraja G2', category: 'Graisses', pricingTier: PricingTier.standard, advantages: ['Plage température élargie -40°C à +180°C', 'Résistance oxydation supérieure', 'Intervalles regraissage +20-30%'] },
    { id: 'mol-002', reference: 'MOL-HI-220', name: 'Molyduval Cartex 220', category: 'Huiles industrielles', pricingTier: PricingTier.standard, advantages: ['Validé réducteurs SEW', 'Excellente protection anti-usure'] },
    { id: 'mol-003', reference: 'MOL-HY-046', name: 'Molyduval Hydran 46', category: 'Huiles hydrauliques', pricingTier: PricingTier.premium, advantages: ['Haute performance anti-usure', 'Stabilité thermique supérieure'] },
    { id: 'mol-004', reference: 'MOL-HY-068', name: 'Molyduval Hydran 68', category: 'Huiles hydrauliques', pricingTier: PricingTier.premium, advantages: ['Viscosité optimale haute charge', 'Protection anti-corrosion renforcée'] },
    { id: 'mol-005', reference: 'MOL-HY-015', name: 'Molyduval Hydran 15', category: 'Huiles hydrauliques', pricingTier: PricingTier.standard, advantages: ['Faible viscosité', 'Circuits hydrauliques précision'] },
    { id: 'mol-006', reference: 'MOL-GR-NBU', name: 'Molyduval Sifax NBU', category: 'Graisses', pricingTier: PricingTier.enterprise, advantages: ['Haute vitesse roulements', 'Base ester synthétique + polyurée'] },
    { id: 'mol-007', reference: 'MOL-HI-320', name: 'Molyduval Cartex 320', category: 'Huiles industrielles', pricingTier: PricingTier.standard, advantages: ['Approuvé SEW-Eurodrive', 'Protection EP renforcée'] },
    { id: 'mol-008', reference: 'MOL-GR-MR3', name: 'Molyduval Soraja MR', category: 'Graisses', pricingTier: PricingTier.standard, advantages: ['Multi-usage', 'Polyvalence applications'] },
    { id: 'mol-009', reference: 'MOL-AL-XMF', name: 'Molyduval Alima XMF', category: 'Huiles alimentaires', pricingTier: PricingTier.enterprise, advantages: ['Certification NSF H1', 'Contact alimentaire autorisé'] },
    { id: 'mol-010', reference: 'MOL-CO-046', name: 'Molyduval Compex 46', category: 'Huiles compresseurs', pricingTier: PricingTier.premium, advantages: ['Compresseurs rotatifs', 'Durée de vie prolongée'] },
    { id: 'mol-011', reference: 'MOL-HY-025', name: 'Molyduval Hydran 25', category: 'Huiles hydrauliques', pricingTier: PricingTier.standard, advantages: ['Anti-usure haute performance', 'Excellente filtrabilité'] },
  ];

  for (const mp of molydalProducts) {
    await prisma.molydalProduct.upsert({
      where: { reference: mp.reference },
      update: {},
      create: mp,
    });
  }
  console.log('✅ Molydal products created');

  // ─── PRODUCT EQUIVALENCES ──────────────────────
  const equivalences = [
    { competitorProductId: 'cp-001', molydalProductId: 'mol-001', confidenceScore: 94 },
    { competitorProductId: 'cp-002', molydalProductId: 'mol-002', confidenceScore: 91 },
    { competitorProductId: 'cp-003', molydalProductId: 'mol-003', confidenceScore: 88 },
    { competitorProductId: 'cp-004', molydalProductId: 'mol-004', confidenceScore: 85 },
    { competitorProductId: 'cp-005', molydalProductId: 'mol-005', confidenceScore: 72 },
    { competitorProductId: 'cp-006', molydalProductId: 'mol-006', confidenceScore: 67 },
    { competitorProductId: 'cp-007', molydalProductId: 'mol-007', confidenceScore: 90 },
    { competitorProductId: 'cp-008', molydalProductId: 'mol-008', confidenceScore: 82 },
    { competitorProductId: 'cp-009', molydalProductId: 'mol-009', confidenceScore: 96 },
    { competitorProductId: 'cp-010', molydalProductId: 'mol-010', confidenceScore: 87 },
    { competitorProductId: 'cp-011', molydalProductId: 'mol-011', confidenceScore: 89 },
  ];

  for (const eq of equivalences) {
    await prisma.productEquivalence.upsert({
      where: {
        competitorProductId_molydalProductId: {
          competitorProductId: eq.competitorProductId,
          molydalProductId: eq.molydalProductId,
        },
      },
      update: {},
      create: eq,
    });
  }
  console.log('✅ Product equivalences created');

  // ─── SCANS ─────────────────────────────────────
  const scans = [
    { id: 'scan-001', barcode: '3456789012345', status: ScanStatus.matched, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-001', locationLat: 48.8566, locationLng: 2.3522, locationLabel: 'Usine PSA Poissy', scannedAt: new Date('2025-01-28T14:30:00.000Z') },
    { id: 'scan-002', barcode: '4567890123456', status: ScanStatus.matched, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-002', locationLat: 45.764, locationLng: 4.8357, locationLabel: 'Renault Trucks Lyon', scannedAt: new Date('2025-01-27T10:15:00.000Z') },
    { id: 'scan-003', barcode: '5678901234567', status: ScanStatus.matched, scanMethod: ScanMethod.voice, userId: 'usr-001', competitorProductId: 'cp-003', locationLat: 43.2965, locationLng: 5.3698, locationLabel: 'Airbus Marseille', scannedAt: new Date('2025-01-26T16:45:00.000Z') },
    { id: 'scan-004', barcode: '6789012345678', status: ScanStatus.partial, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-004', locationLat: 47.2184, locationLng: -1.5536, locationLabel: 'STX Nantes', scannedAt: new Date('2025-01-25T09:00:00.000Z') },
    { id: 'scan-005', barcode: '7890123456789', status: ScanStatus.partial, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-005', scannedAt: new Date('2025-01-24T11:30:00.000Z') },
    { id: 'scan-006', barcode: '8901234567890', status: ScanStatus.partial, scanMethod: ScanMethod.voice, userId: 'usr-002', competitorProductId: 'cp-006', locationLat: 48.5734, locationLng: 7.7521, locationLabel: 'Strasbourg Industriel', scannedAt: new Date('2025-01-23T08:20:00.000Z') },
    { id: 'scan-007', barcode: '9012345678901', status: ScanStatus.matched, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-007', locationLat: 43.6047, locationLng: 1.4442, locationLabel: 'Airbus Toulouse', scannedAt: new Date('2025-01-22T15:10:00.000Z') },
    { id: 'scan-008', barcode: '0123456789012', status: ScanStatus.matched, scanMethod: ScanMethod.barcode, userId: 'usr-002', competitorProductId: 'cp-008', scannedAt: new Date('2025-01-21T13:45:00.000Z') },
    { id: 'scan-009', barcode: '1234567890124', status: ScanStatus.no_match, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-009', locationLat: 48.8566, locationLng: 2.3522, locationLabel: 'Danone Paris', scannedAt: new Date('2025-01-20T10:00:00.000Z') },
    { id: 'scan-010', barcode: '2345678901235', status: ScanStatus.matched, scanMethod: ScanMethod.voice, userId: 'usr-001', competitorProductId: 'cp-010', locationLat: 44.8378, locationLng: -0.5792, locationLabel: 'Dassault Bordeaux', scannedAt: new Date('2025-01-19T17:30:00.000Z') },
    { id: 'scan-011', barcode: '3456789012346', status: ScanStatus.matched, scanMethod: ScanMethod.barcode, userId: 'usr-001', competitorProductId: 'cp-011', locationLat: 48.8566, locationLng: 2.3522, locationLabel: 'Safran Paris', scannedAt: new Date('2025-01-18T09:20:00.000Z') },
    { id: 'scan-012', barcode: '4567890123457', status: ScanStatus.no_match, scanMethod: ScanMethod.barcode, userId: 'usr-002', competitorProductId: 'cp-012', scannedAt: new Date('2025-01-17T14:00:00.000Z') },
  ];

  for (const scan of scans) {
    await prisma.scan.upsert({
      where: { id: scan.id },
      update: {},
      create: scan,
    });
  }
  console.log('✅ Scans created');

  // ─── WORKFLOWS ─────────────────────────────────
  // wf-001: approved
  await prisma.priceWorkflow.upsert({
    where: { id: 'wf-001' },
    update: {},
    create: {
      id: 'wf-001', scanId: 'scan-003', molydalProductId: 'mol-003', clientName: 'Airbus Marseille',
      quantity: 200, unit: 'L', requestedPrice: 8.50, approvedPrice: 8.20,
      status: WorkflowStatus.approved, userId: 'usr-001', reviewedById: 'usr-003',
      reviewComment: 'Prix compétitif validé.',
      createdAt: new Date('2025-01-26T17:00:00.000Z'), updatedAt: new Date('2025-01-27T11:00:00.000Z'),
      steps: {
        create: [
          { status: WorkflowStatus.draft, actor: 'Marc Dupont', date: new Date('2025-01-26T17:00:00.000Z') },
          { status: WorkflowStatus.submitted, actor: 'Marc Dupont', date: new Date('2025-01-26T17:05:00.000Z') },
          { status: WorkflowStatus.under_review, actor: 'Pierre Leroy', date: new Date('2025-01-27T09:00:00.000Z') },
          { status: WorkflowStatus.approved, actor: 'Pierre Leroy', date: new Date('2025-01-27T11:00:00.000Z'), comment: 'Prix compétitif validé.' },
        ],
      },
    },
  });

  // wf-002: under_review
  await prisma.priceWorkflow.upsert({
    where: { id: 'wf-002' },
    update: {},
    create: {
      id: 'wf-002', scanId: 'scan-007', molydalProductId: 'mol-007', clientName: 'Airbus Toulouse',
      quantity: 500, unit: 'L', requestedPrice: 6.80,
      status: WorkflowStatus.under_review, userId: 'usr-001',
      createdAt: new Date('2025-01-22T15:30:00.000Z'), updatedAt: new Date('2025-01-23T08:00:00.000Z'),
      steps: {
        create: [
          { status: WorkflowStatus.draft, actor: 'Marc Dupont', date: new Date('2025-01-22T15:30:00.000Z') },
          { status: WorkflowStatus.submitted, actor: 'Marc Dupont', date: new Date('2025-01-22T15:35:00.000Z') },
          { status: WorkflowStatus.under_review, actor: 'Pierre Leroy', date: new Date('2025-01-23T08:00:00.000Z'), comment: 'Volume important, vérification marge en cours.' },
        ],
      },
    },
  });

  // wf-003: submitted
  await prisma.priceWorkflow.upsert({
    where: { id: 'wf-003' },
    update: {},
    create: {
      id: 'wf-003', scanId: 'scan-001', molydalProductId: 'mol-001', clientName: 'PSA Poissy',
      quantity: 50, unit: 'kg', requestedPrice: 12.00,
      status: WorkflowStatus.submitted, userId: 'usr-001',
      createdAt: new Date('2025-01-28T14:45:00.000Z'), updatedAt: new Date('2025-01-28T14:50:00.000Z'),
      steps: {
        create: [
          { status: WorkflowStatus.draft, actor: 'Marc Dupont', date: new Date('2025-01-28T14:45:00.000Z') },
          { status: WorkflowStatus.submitted, actor: 'Marc Dupont', date: new Date('2025-01-28T14:50:00.000Z') },
        ],
      },
    },
  });

  // wf-004: rejected
  await prisma.priceWorkflow.upsert({
    where: { id: 'wf-004' },
    update: {},
    create: {
      id: 'wf-004', scanId: 'scan-004', molydalProductId: 'mol-004', clientName: 'STX Nantes',
      quantity: 100, unit: 'L', requestedPrice: 9.20,
      status: WorkflowStatus.rejected, userId: 'usr-001', reviewedById: 'usr-003',
      reviewComment: 'Prix trop bas pour cette référence premium.',
      createdAt: new Date('2025-01-25T09:30:00.000Z'), updatedAt: new Date('2025-01-25T16:00:00.000Z'),
      steps: {
        create: [
          { status: WorkflowStatus.draft, actor: 'Marc Dupont', date: new Date('2025-01-25T09:30:00.000Z') },
          { status: WorkflowStatus.submitted, actor: 'Marc Dupont', date: new Date('2025-01-25T09:35:00.000Z') },
          { status: WorkflowStatus.under_review, actor: 'Pierre Leroy', date: new Date('2025-01-25T14:00:00.000Z') },
          { status: WorkflowStatus.rejected, actor: 'Pierre Leroy', date: new Date('2025-01-25T16:00:00.000Z'), comment: 'Prix trop bas pour cette référence premium.' },
        ],
      },
    },
  });

  // wf-005: draft
  await prisma.priceWorkflow.upsert({
    where: { id: 'wf-005' },
    update: {},
    create: {
      id: 'wf-005', scanId: 'scan-010', molydalProductId: 'mol-010', clientName: 'Dassault Bordeaux',
      quantity: 300, unit: 'L',
      status: WorkflowStatus.draft, userId: 'usr-001',
      createdAt: new Date('2025-01-28T18:00:00.000Z'), updatedAt: new Date('2025-01-28T18:00:00.000Z'),
      steps: {
        create: [
          { status: WorkflowStatus.draft, actor: 'Marc Dupont', date: new Date('2025-01-28T18:00:00.000Z') },
        ],
      },
    },
  });

  console.log('✅ Workflows created');

  // ─── AI CONVERSATIONS ──────────────────────────
  await prisma.aIConversation.upsert({
    where: { id: 'conv-001' },
    update: {},
    create: {
      id: 'conv-001', scanId: 'scan-001', userId: 'usr-001',
      scannedName: 'Mobilux EP 2', scannedBrand: 'Mobil',
      molydalName: 'Molyduval Soraja G2', molydalReference: 'MOL-GR-002',
      createdAt: new Date('2025-01-28T14:35:00.000Z'), updatedAt: new Date('2025-01-28T14:36:10.000Z'),
      messages: {
        create: [
          { id: 'msg-001', role: 'user', text: 'Quelles sont les principales différences techniques ?', sources: [], timestamp: new Date('2025-01-28T14:35:00.000Z') },
          { id: 'msg-002', role: 'assistant', text: "Le Molyduval Soraja G2 offre une plage de température élargie (-40°C à +180°C vs -30°C à +160°C pour le Mobilux EP 2). Sa formulation au savon lithium complexe de dernière génération assure une meilleure résistance à l'oxydation, prolongeant les intervalles de regraissage de 20 à 30%. De plus, sa compatibilité avec les joints élastomères courants est supérieure.", sources: ['FT-MOL-GR-002', 'Guide équivalences Molydal 2024'], timestamp: new Date('2025-01-28T14:35:08.000Z') },
          { id: 'msg-003', role: 'user', text: 'Compatible avec des roulements à forte charge ?', sources: [], timestamp: new Date('2025-01-28T14:36:00.000Z') },
          { id: 'msg-004', role: 'assistant', text: "Oui, le Molyduval Soraja G2 est spécifiquement formulé pour les roulements industriels fortement chargés. Ses additifs EP (Extrême Pression) offrent une capacité de charge Timken > 25 kg, ce qui le place au niveau des meilleures graisses du marché pour cette application. Il est particulièrement recommandé pour les paliers et roulements soumis à des charges radiales et axiales élevées.", sources: ['FT-MOL-GR-002'], timestamp: new Date('2025-01-28T14:36:10.000Z') },
        ],
      },
    },
  });

  await prisma.aIConversation.upsert({
    where: { id: 'conv-002' },
    update: {},
    create: {
      id: 'conv-002', scanId: 'scan-007', userId: 'usr-001',
      scannedName: 'BP Energol GR-XP 320', scannedBrand: 'BP',
      molydalName: 'Molyduval Cartex 320', molydalReference: 'MOL-HI-320',
      createdAt: new Date('2025-01-22T15:15:00.000Z'), updatedAt: new Date('2025-01-22T15:16:12.000Z'),
      messages: {
        create: [
          { id: 'msg-005', role: 'user', text: "Le client utilise ça dans des réducteurs SEW. C'est compatible ?", sources: [], timestamp: new Date('2025-01-22T15:15:00.000Z') },
          { id: 'msg-006', role: 'assistant', text: "Le Molyduval Cartex 320 est validé pour les réducteurs SEW-Eurodrive. Il figure dans la liste des lubrifiants approuvés SEW depuis 2022. Vous pouvez retrouver la certification dans la fiche technique référence FT-MOL-HI-320.", sources: ['FT-MOL-HI-320', 'Certifications OEM Molydal'], timestamp: new Date('2025-01-22T15:15:09.000Z') },
          { id: 'msg-007', role: 'user', text: 'Quel conditionnement proposer pour une commande de 600L ?', sources: [], timestamp: new Date('2025-01-22T15:16:00.000Z') },
          { id: 'msg-008', role: 'assistant', text: "Pour 600L, je recommande 3 fûts de 200L (référence MOL-HI-320-F200). C'est le format le plus économique pour cette quantité. Des IBC de 1000L sont aussi disponibles si le client prévoit d'augmenter sa consommation.", sources: ['Catalogue conditionnements Molydal'], timestamp: new Date('2025-01-22T15:16:12.000Z') },
        ],
      },
    },
  });

  await prisma.aIConversation.upsert({
    where: { id: 'conv-003' },
    update: {},
    create: {
      id: 'conv-003', scanId: 'scan-006', userId: 'usr-002',
      scannedName: 'Klüber Isoflex NBU 15', scannedBrand: 'Klüber',
      molydalName: 'Molyduval Sifax NBU', molydalReference: 'MOL-GR-NBU',
      createdAt: new Date('2025-01-23T08:25:00.000Z'), updatedAt: new Date('2025-01-23T08:25:11.000Z'),
      messages: {
        create: [
          { id: 'msg-009', role: 'user', text: "C'est une graisse, pas une huile. Le match est bon ?", sources: [], timestamp: new Date('2025-01-23T08:25:00.000Z') },
          { id: 'msg-010', role: 'assistant', text: "Bonne remarque. Le Klüber Isoflex NBU 15 est effectivement une graisse synthétique pour roulements à haute vitesse. Le Molyduval Sifax NBU est bien l'équivalent recommandé — c'est une graisse à base d'huile ester synthétique avec épaississant polyurée, conçue pour les mêmes applications haute vitesse. Le score de confiance de 67% reflète une différence de viscosité d'huile de base (15 mm²/s vs 18 mm²/s pour le Sifax), mais les performances en service sont comparables.", sources: ['FT-MOL-GR-NBU', 'Matrice équivalences graisses'], timestamp: new Date('2025-01-23T08:25:11.000Z') },
        ],
      },
    },
  });

  console.log('✅ AI Conversations created');

  // ─── NOTIFICATIONS ─────────────────────────────
  const notifications = [
    { id: 'notif-001', type: NotificationType.price_approved, title: 'Prix validé', body: 'Votre demande de prix pour Molyduval Hydran 46 (Airbus Marseille) a été approuvée à 8.20€/L.', read: false, relatedId: 'wf-001', userId: 'usr-001', createdAt: new Date('2025-01-27T11:00:00.000Z') },
    { id: 'notif-002', type: NotificationType.price_rejected, title: 'Prix refusé', body: 'Votre demande pour Molyduval Hydran 68 (STX Nantes) a été refusée. Motif : prix trop bas.', read: false, relatedId: 'wf-004', userId: 'usr-001', createdAt: new Date('2025-01-25T16:00:00.000Z') },
    { id: 'notif-003', type: NotificationType.ai_response, title: 'Réponse IA disponible', body: "L'assistant a répondu à votre question sur Molyduval Soraja G2.", read: false, relatedId: 'conv-001', userId: 'usr-001', createdAt: new Date('2025-01-28T16:30:00.000Z') },
    { id: 'notif-004', type: NotificationType.scan_match, title: 'Correspondance trouvée', body: 'Mobilux EP 2 → Molyduval Soraja G2 (94% de confiance)', read: true, relatedId: 'scan-001', userId: 'usr-001', createdAt: new Date('2025-01-28T14:30:00.000Z') },
    { id: 'notif-005', type: NotificationType.workflow_update, title: "Demande en cours d'examen", body: 'Votre demande pour Cartex 320 (Airbus Toulouse) est en cours de validation.', read: true, relatedId: 'wf-002', userId: 'usr-001', createdAt: new Date('2025-01-23T08:00:00.000Z') },
    { id: 'notif-006', type: NotificationType.system, title: 'Mise à jour catalogue', body: '12 nouvelles correspondances ajoutées au catalogue Molydal.', read: true, userId: 'usr-001', createdAt: new Date('2025-01-20T09:00:00.000Z') },
    { id: 'notif-007', type: NotificationType.ai_response, title: 'Réponse IA disponible', body: "L'assistant a répondu à votre question sur Molyduval Cartex 320.", read: true, relatedId: 'conv-002', userId: 'usr-001', createdAt: new Date('2025-01-27T11:00:00.000Z') },
    { id: 'notif-008', type: NotificationType.scan_match, title: 'Correspondance trouvée', body: 'Shell Corena S3 R 46 → Molyduval Compex 46 (87%)', read: true, relatedId: 'scan-010', userId: 'usr-001', createdAt: new Date('2025-01-19T17:30:00.000Z') },
  ];

  for (const notif of notifications) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: {},
      create: notif,
    });
  }
  console.log('✅ Notifications created');

  // ─── EXPORTS ───────────────────────────────────
  const exports = [
    { id: 'exp-001', fileName: 'rapport-scans-janvier-2025.pdf', format: ExportFormat.pdf, status: ExportStatus.ready, size: '2.4 Mo', userId: 'usr-001', generatedAt: new Date('2025-01-28T18:00:00.000Z') },
    { id: 'exp-002', fileName: 'export-donnees-Q4-2024.xlsx', format: ExportFormat.xlsx, status: ExportStatus.ready, size: '1.1 Mo', userId: 'usr-001', generatedAt: new Date('2025-01-15T10:30:00.000Z') },
    { id: 'exp-003', fileName: 'scans-semaine-04.csv', format: ExportFormat.csv, status: ExportStatus.generating, size: '340 Ko', userId: 'usr-001', generatedAt: new Date('2025-01-28T20:00:00.000Z') },
  ];

  for (const exp of exports) {
    await prisma.exportRecord.upsert({
      where: { id: exp.id },
      update: {},
      create: exp,
    });
  }
  console.log('✅ Exports created');

  // ─── VOICE NOTES ───────────────────────────────
  const voiceNotes = [
    { id: 'vn-001', duration: 45, transcription: "Visite chez Airbus Marseille. Le responsable maintenance, M. Bertrand, est intéressé par notre gamme hydraulique. Il utilise actuellement du Shell Tellus S2 MX 46. Volume estimé : 200L/mois. Rappeler avant vendredi pour le devis.", clientName: 'Airbus Marseille', relatedScanId: 'scan-003', tags: ['hydraulique', 'prospect-chaud', 'devis'], userId: 'usr-001', createdAt: new Date('2025-01-26T17:15:00.000Z') },
    { id: 'vn-002', duration: 30, transcription: "Appel avec Jean Bernard de LubriTech. Il demande nos délais de livraison pour la zone Sud-Ouest. Confirmer sous 48h. Potentiel renouvellement contrat annuel.", clientName: 'LubriTech Distribution', tags: ['logistique', 'contrat-annuel'], userId: 'usr-001', createdAt: new Date('2025-01-25T11:00:00.000Z') },
    { id: 'vn-003', duration: 60, transcription: "Salon industriel Lyon. Rencontré 3 prospects : Renault Trucks (graisses EP), SNCF Maintenance (huiles compresseurs), Michelin Clermont (huiles process). Envoyer catalogues personnalisés la semaine prochaine.", clientName: 'Prospects Salon Lyon', tags: ['salon', 'prospects', 'suivi'], userId: 'usr-001', createdAt: new Date('2025-01-22T18:00:00.000Z') },
  ];

  for (const vn of voiceNotes) {
    await prisma.voiceNote.upsert({
      where: { id: vn.id },
      update: {},
      create: vn,
    });
  }
  console.log('✅ Voice notes created');

  // ─── DEPARTMENTS ───────────────────────────────
  // Départements français (code INSEE) + zones export sans code.
  const departments: { code: string | null; name: string }[] = [
    { code: '01', name: 'Ain' },
    { code: '02', name: 'Aisne' },
    { code: '03', name: 'Allier' },
    { code: '04', name: 'Alpes-de-Haute-Provence' },
    { code: '05', name: 'Hautes-Alpes' },
    { code: '06', name: 'Alpes-Maritimes' },
    { code: '07', name: 'Ardèche' },
    { code: '08', name: 'Ardennes' },
    { code: '09', name: 'Ariège' },
    { code: '10', name: 'Aube' },
    { code: '11', name: 'Aude' },
    { code: '12', name: 'Aveyron' },
    { code: '13', name: 'Bouches-du-Rhône' },
    { code: '14', name: 'Calvados' },
    { code: '15', name: 'Cantal' },
    { code: '16', name: 'Charente' },
    { code: '17', name: 'Charente-Maritime' },
    { code: '18', name: 'Cher' },
    { code: '19', name: 'Corrèze' },
    { code: '2A', name: 'Corse-du-Sud' },
    { code: '21', name: "Côte-d'Or" },
    { code: '22', name: "Côtes-d'Armor" },
    { code: '23', name: 'Creuse' },
    { code: '24', name: 'Dordogne' },
    { code: '25', name: 'Doubs' },
    { code: '26', name: 'Drôme' },
    { code: '27', name: 'Eure' },
    { code: '28', name: 'Eure-et-Loir' },
    { code: '29', name: 'Finistère' },
    { code: '30', name: 'Gard' },
    { code: '31', name: 'Haute-Garonne' },
    { code: '32', name: 'Gers' },
    { code: '33', name: 'Gironde' },
    { code: '34', name: 'Hérault' },
    { code: '35', name: 'Ille-et-Vilaine' },
    { code: '36', name: 'Indre' },
    { code: '37', name: 'Indre-et-Loire' },
    { code: '38', name: 'Isère' },
    { code: '39', name: 'Jura' },
    { code: '40', name: 'Landes' },
    { code: '41', name: 'Loir-et-Cher' },
    { code: '42', name: 'Loire' },
    { code: '43', name: 'Haute-Loire' },
    { code: '44', name: 'Loire-Atlantique' },
    { code: '45', name: 'Loiret' },
    { code: '46', name: 'Lot' },
    { code: '47', name: 'Lot-et-Garonne' },
    { code: '48', name: 'Lozère' },
    { code: '49', name: 'Maine-et-Loire' },
    { code: '50', name: 'Manche' },
    { code: '51', name: 'Marne' },
    { code: '52', name: 'Haute-Marne' },
    { code: '53', name: 'Mayenne' },
    { code: '54', name: 'Meurthe-et-Moselle' },
    { code: '55', name: 'Meuse' },
    { code: '56', name: 'Morbihan' },
    { code: '57', name: 'Moselle' },
    { code: '58', name: 'Nièvre' },
    { code: '59', name: 'Nord' },
    { code: '60', name: 'Oise' },
    { code: '61', name: 'Orne' },
    { code: '62', name: 'Pas-de-Calais' },
    { code: '63', name: 'Puy-de-Dôme' },
    { code: '64', name: 'Pyrénées-Atlantiques' },
    { code: '65', name: 'Hautes-Pyrénées' },
    { code: '66', name: 'Pyrénées-Orientales' },
    { code: '67', name: 'Bas-Rhin' },
    { code: '68', name: 'Haut-Rhin' },
    { code: '69', name: 'Rhône' },
    { code: '70', name: 'Haute-Saône' },
    { code: '71', name: 'Saône-et-Loire' },
    { code: '72', name: 'Sarthe' },
    { code: '73', name: 'Savoie' },
    { code: '74', name: 'Haute-Savoie' },
    { code: '75', name: 'Paris' },
    { code: '76', name: 'Seine-Maritime' },
    { code: '77', name: 'Seine-et-Marne' },
    { code: '78', name: 'Yvelines' },
    { code: '79', name: 'Deux-Sèvres' },
    { code: '80', name: 'Somme' },
    { code: '81', name: 'Tarn' },
    { code: '82', name: 'Tarn-et-Garonne' },
    { code: '83', name: 'Var' },
    { code: '84', name: 'Vaucluse' },
    { code: '85', name: 'Vendée' },
    { code: '86', name: 'Vienne' },
    { code: '87', name: 'Haute-Vienne' },
    { code: '88', name: 'Vosges' },
    { code: '89', name: 'Yonne' },
    { code: '90', name: 'Territoire de Belfort' },
    { code: '91', name: 'Essonne' },
    { code: '92', name: 'Hauts-de-Seine' },
    { code: '93', name: 'Seine-Saint-Denis' },
    { code: '94', name: 'Val-de-Marne' },
    { code: '95', name: "Val-d'Oise" },
    { code: '2B', name: 'Haute-Corse' },
    { code: '20', name: 'Corse/Allemagne' },
    { code: null, name: 'Maroc' },
    { code: null, name: 'Espagne' },
    { code: null, name: 'Canada' },
    { code: null, name: 'Reste du monde' },
  ];
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: { code: dept.code },
      create: { code: dept.code, name: dept.name },
    });
  }
  console.log(`✅ Departments created (${departments.length})`);

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
