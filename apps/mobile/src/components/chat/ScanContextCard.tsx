import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AltArrowDown } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowUp } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ScoreIndicator } from '@/components/ui/ScoreIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import type { ScanContext } from '@/services/chatFree.service';

interface ScanContextCardProps {
  context: ScanContext;
}

export function ScanContextCard({ context }: ScanContextCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const hasEquivalents = context.equivalents.length > 0;
  const bestEquiv = context.equivalents[0];

  return (
    <Card variant="outlined" style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={t('chat.scanContextToggle')}
      >
        <View style={styles.headerLeft}>
          {context.photoUrl ? (
            <Image
              source={{ uri: context.photoUrl }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
          <View style={styles.headerText}>
            <Text variant="label" color={colors.ink2}>
              {t('chat.scanContextTitle')}
            </Text>
            <Text variant="subheading" numberOfLines={1}>
              {context.identifiedName || t('chat.scanContextUnknown')}
            </Text>
            {context.identifiedBrand ? (
              <Text variant="caption" color={colors.ink2} numberOfLines={1}>
                {context.identifiedBrand}
                {context.identifiedType ? ` · ${context.identifiedType}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
        {expanded ? (
          <AltArrowUp size={18} color={colors.ink3} />
        ) : (
          <AltArrowDown size={18} color={colors.ink3} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {context.identifiedSpecs ? (
            <Text variant="caption" color={colors.ink2} style={styles.specs}>
              {context.identifiedSpecs}
            </Text>
          ) : null}

          {hasEquivalents ? (
            <View style={styles.equivalentsSection}>
              <Text variant="label" color={colors.ink2} style={styles.sectionLabel}>
                {t('chat.scanContextEquivalents')}
              </Text>
              {context.equivalents.map((eq, i) => (
                <View key={`${eq.name}-${i}`} style={styles.equivRow}>
                  <View style={styles.equivInfo}>
                    <Text
                      variant="caption"
                      color={i === 0 ? colors.red : colors.ink}
                      style={styles.equivName}
                    >
                      {i === 0 ? '★ ' : ''}
                      {eq.name}
                    </Text>
                    {eq.family ? (
                      <Text variant="caption" color={colors.ink3}>
                        {eq.family}
                      </Text>
                    ) : null}
                  </View>
                  <ScoreIndicator score={eq.compatibility} size="sm" showLabel={false} />
                </View>
              ))}
            </View>
          ) : null}

          {context.analysisText ? (
            <View style={styles.analysisSection}>
              <Text variant="label" color={colors.ink2} style={styles.sectionLabel}>
                {t('chat.scanContextAnalysis')}
              </Text>
              <Text variant="caption" color={colors.ink2} style={styles.analysisText}>
                {context.analysisText}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        /* Collapsed summary line */
        hasEquivalents ? (
          <View style={styles.collapsedSummary}>
            <Text variant="caption" color={colors.red} style={styles.summaryName}>
              → {bestEquiv.name}
            </Text>
            <ScoreIndicator score={bestEquiv.compatibility} size="sm" showLabel={false} />
          </View>
        ) : null
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.section,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.paper1,
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.paper1,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  body: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,20,16,0.06)',
    paddingTop: spacing.sm,
  },
  specs: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  equivalentsSection: {
    gap: 6,
  },
  equivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  equivInfo: {
    flex: 1,
    gap: 1,
  },
  equivName: {
    fontWeight: '600',
  },
  analysisSection: {
    gap: 4,
  },
  analysisText: {
    lineHeight: 18,
  },
  collapsedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  summaryName: {
    flex: 1,
  },
});
