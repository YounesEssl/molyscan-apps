import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ScoreIndicator } from '@/components/ui/ScoreIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';

export interface ScanEquivalent {
  name: string;
  family: string;
  compatibility: number;
  reason: string;
}

interface ScanEquivalentsListProps {
  equivalents: ScanEquivalent[];
}

export function ScanEquivalentsList({
  equivalents,
}: ScanEquivalentsListProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (equivalents.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="label" color={colors.ink2} style={styles.title}>
        {t('product.allEquivalents')}
      </Text>
      {equivalents.map((eq, i) => (
        <Card
          key={`${eq.name}-${i}`}
          variant={i === 0 ? 'elevated' : 'outlined'}
          accentColor={i === 0 ? colors.red : undefined}
          style={styles.card}
        >
          <View style={styles.row}>
            <View style={styles.info}>
              <Text variant="label" color={i === 0 ? colors.red : colors.ink2}>
                {i === 0 ? t('scanner.bestEquivalent') : t('scanner.alternative')}
              </Text>
              <Text variant="subheading" color={i === 0 ? colors.red : colors.ink}>
                {eq.name}
              </Text>
              {eq.family ? (
                <Text variant="caption" color={colors.ink2}>
                  {eq.family}
                </Text>
              ) : null}
            </View>
            <ScoreIndicator score={eq.compatibility} size="sm" showLabel={false} />
          </View>
          {eq.reason ? (
            <Text variant="caption" color={colors.ink2} style={styles.reason}>
              {eq.reason}
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.section,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  reason: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
