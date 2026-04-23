import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Document } from 'react-native-solar-icons/icons/bold-duotone';
import { ShieldCheck } from 'react-native-solar-icons/icons/bold-duotone';
import { Text, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import i18n from '@/i18n';
import type { MolydalMatch } from '@/schemas/scan.schema';

interface TechnicalSheetProps {
  match: MolydalMatch;
}

// Mock technical data per product reference
function getTechnicalData(reference: string): TechnicalSpec {
  const specs: Record<string, Partial<TechnicalSpec>> = {
    'MOL-GR-002': {
      description: i18n.t('technicalSheet.greaseLithiumDescription'),
      application: i18n.t('technicalSheet.greaseLithiumApplication'),
      temperature: '-20°C à +130°C',
      nlgiGrade: '2',
      baseOilViscosity: '150 mm²/s à 40°C',
      dropping: '185°C',
      certifications: ['DIN 51825 KP2K-30', 'ISO 6743-9'],
    },
    'MOL-HI-220': {
      description: i18n.t('technicalSheet.gearOilDescription'),
      application: i18n.t('technicalSheet.gearOilApplication'),
      temperature: '-10°C à +100°C',
      viscosity40: '220 mm²/s',
      viscosity100: '19 mm²/s',
      vi: '95',
      certifications: ['ISO 12925-1 CKD', 'DIN 51517-3 CLP'],
    },
    'MOL-HY-046': {
      description: i18n.t('technicalSheet.hydraulicOilDescription'),
      application: i18n.t('technicalSheet.hydraulicOilApplication'),
      temperature: '-25°C à +90°C',
      viscosity40: '46 mm²/s',
      viscosity100: '6.8 mm²/s',
      vi: '105',
      certifications: ['ISO 11158 HM', 'DIN 51524-2 HLP', 'Denison HF-0'],
    },
  };

  const base: TechnicalSpec = {
    description: i18n.t('technicalSheet.defaultDescription'),
    application: i18n.t('technicalSheet.defaultApplication'),
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
  const { t } = useTranslation();
  const spec = getTechnicalData(match.reference);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Document size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text variant="subheading">{match.name}</Text>
          <Text variant="caption" color={COLORS.textMuted}>{match.reference}</Text>
        </View>
      </View>

      {/* Description */}
      <Card style={styles.card}>
        <Text variant="label">{t('technicalSheet.description')}</Text>
        <Text variant="body" color={COLORS.textSecondary}>{spec.description}</Text>
      </Card>

      {/* Application */}
      <Card style={styles.card}>
        <Text variant="label">{t('technicalSheet.applicationDomains')}</Text>
        <Text variant="body" color={COLORS.textSecondary}>{spec.application}</Text>
      </Card>

      {/* Specifications */}
      <Card style={styles.card}>
        <Text variant="label">{t('technicalSheet.technicalSpecs')}</Text>
        <SpecRow label={t('technicalSheet.temperatureRange')} value={spec.temperature} />
        {spec.nlgiGrade && <SpecRow label={t('technicalSheet.nlgiGrade')} value={spec.nlgiGrade} />}
        {spec.baseOilViscosity && <SpecRow label={t('technicalSheet.baseOilViscosity')} value={spec.baseOilViscosity} />}
        {spec.dropping && <SpecRow label={t('technicalSheet.droppingPoint')} value={spec.dropping} />}
        {spec.viscosity40 && <SpecRow label={t('technicalSheet.viscosity40')} value={spec.viscosity40} />}
        {spec.viscosity100 && <SpecRow label={t('technicalSheet.viscosity100')} value={spec.viscosity100} />}
        {spec.vi && <SpecRow label={t('technicalSheet.viscosityIndex')} value={spec.vi} />}
      </Card>

      {/* Certifications */}
      <Card style={styles.card}>
        <Text variant="label">{t('technicalSheet.certifications')}</Text>
        <View style={styles.certList}>
          {spec.certifications.map((cert) => (
            <View key={cert} style={styles.certBadge}>
              <ShieldCheck size={14} color={COLORS.success} />
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
