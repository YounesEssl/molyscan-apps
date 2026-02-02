import type { VoiceNote } from '@/schemas/voice-note.schema';

export const MOCK_VOICE_NOTES: VoiceNote[] = [
  {
    id: 'vn-001',
    duration: 45,
    transcription: "Visite chez Airbus Marseille. Le responsable maintenance, M. Bertrand, est intéressé par notre gamme hydraulique. Il utilise actuellement du Shell Tellus S2 MX 46. Volume estimé : 200L/mois. Rappeler avant vendredi pour le devis.",
    clientName: 'Airbus Marseille',
    relatedScanId: 'scan-003',
    tags: ['hydraulique', 'prospect-chaud', 'devis'],
    createdAt: '2025-01-26T17:15:00.000Z',
  },
  {
    id: 'vn-002',
    duration: 30,
    transcription: "Appel avec Jean Bernard de LubriTech. Il demande nos délais de livraison pour la zone Sud-Ouest. Confirmer sous 48h. Potentiel renouvellement contrat annuel.",
    clientName: 'LubriTech Distribution',
    tags: ['logistique', 'contrat-annuel'],
    createdAt: '2025-01-25T11:00:00.000Z',
  },
  {
    id: 'vn-003',
    duration: 60,
    transcription: "Salon industriel Lyon. Rencontré 3 prospects : Renault Trucks (graisses EP), SNCF Maintenance (huiles compresseurs), Michelin Clermont (huiles process). Envoyer catalogues personnalisés la semaine prochaine.",
    clientName: 'Prospects Salon Lyon',
    tags: ['salon', 'prospects', 'suivi'],
    createdAt: '2025-01-22T18:00:00.000Z',
  },
];
