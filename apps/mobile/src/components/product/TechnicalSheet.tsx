import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import type { MolydalMatch } from '@/schemas/scan.schema';

interface TechnicalSheetProps {
  match: MolydalMatch;
}

// Mock technical data per product reference
function getTechnicalData(reference: string): TechnicalSpec {
  const specs: Record<string, Partial<TechnicalSpec>> = {
    'MOL-GR-002': {
      description: 'Graisse au lithium EP multi-usage hautes performances.',
      application: 'Roulements, paliers, engrenages ouverts, mécanismes divers.',
      temperature: '-20°C à +130°C',
      nlgiGrade: '2',
      baseOilViscosity: '150 mm²/s à 40°C',
      dropping: '185°C',
      certifications: ['DIN 51825 KP2K-30', 'ISO 6743-9'],
    },
    'MOL-HI-220': {
      description: 'Huile pour engrenages industriels sous charges sévères.',
      application: 'Réducteurs, engrenages fermés, paliers sous charge.',
      temperature: '-10°C à +100°C',
      viscosity40: '220 mm²/s',
      viscosity100: '19 mm²/s',
      vi: '95',
      certifications: ['ISO 12925-1 CKD', 'DIN 51517-3 CLP'],
    },
    'MOL-HY-046': {
      description: 'Huile hydraulique anti-usure haute performance.',
      application: 'Systèmes hydrauliques haute pression, pompes à pistons et palettes.',
      temperature: '-25°C à +90°C',
      viscosity40: '46 mm²/s',
      viscosity100: '6.8 mm²/s',
      vi: '105',
      certifications: ['ISO 11158 HM', 'DIN 51524-2 HLP', 'Denison HF-0'],
    },
  };

  const base: TechnicalSpec = {
    description: 'Lubrifiant industriel haute performance Molydal.',
    application: 'Applications industrielles générales.',
    temperature: '-20°C à +120°C',
    certifications: ['ISO 6743'],
  };

  return { ...base, ...specs[reference] };
}

interface TechnicalSpec {
  description: string;
  application: string;
  temperature: string;
  nlgiGrade?: string;
  baseOilViscosity?: string;
  dropping?: string;
  viscosity40?: string;
  viscosity100?: string;
  vi?: string;
  certifications: string[];
}

export const TechnicalSheet: React.FC<TechnicalSheetProps> = ({ match }) => {
  const spec = getTechnicalData(match.reference);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text variant="subheading">{match.name}</Text>
          <Text variant="caption" color={COLORS.textMuted}>{match.reference}</Text>
        </View>
      </View>

      {/* Description */}
      <Card style={styles.card}>
        <Text variant="label">Description</Text>
        <Text variant="body" color={COLORS.textSecondary}>{spec.description}</Text>
      </Card>

      {/* Application */}
      <Card style={styles.card}>
        <Text variant="label">Domaines d'application</Text>
        <Text variant="body" color={COLORS.textSecondary}>{spec.application}</Text>
      </Card>

      {/* Specifications */}
      <Card style={styles.card}>
        <Text variant="label">Caractéristiques techniques</Text>
        <SpecRow label="Plage de température" value={spec.temperature} />
        {spec.nlgiGrade && <SpecRow label="Grade NLGI" value={spec.nlgiGrade} />}
        {spec.baseOilViscosity && <SpecRow label="Viscosité huile de base" value={spec.baseOilViscosity} />}
        {spec.dropping && <SpecRow label="Point de goutte" value={spec.dropping} />}
        {spec.viscosity40 && <SpecRow label="Viscosité à 40°C" value={spec.viscosity40} />}
        {spec.viscosity100 && <SpecRow label="Viscosité à 100°C" value={spec.viscosity100} />}
        {spec.vi && <SpecRow label="Indice de viscosité" value={spec.vi} />}
      </Card>

      {/* Certifications */}
      <Card style={styles.card}>
        <Text variant="label">Certifications & normes</Text>
        <View style={styles.certList}>
          {spec.certifications.map((cert) => (
            <View key={cert} style={styles.certBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text variant="caption" style={styles.certText}>{cert}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
};

const SpecRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.specRow}>
    <Text variant="caption" color={COLORS.textSecondary} style={styles.specLabel}>{label}</Text>
    <Text variant="caption" style={styles.specValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  card: {
    gap: SPACING.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  specLabel: {
    flex: 1,
  },
  specValue: {
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'right',
  },
  certList: {
    gap: SPACING.xs,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  certText: {
    fontWeight: '600',
    color: COLORS.text,
  },
});
