import React from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ring } from '@/components/ui/Ring';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface ProductMainCardProps {
  productName: string;
  competitorName: string;
  confidence: number;
  matchTitle?: string;
  matchDescription?: string;
  category?: string;
}

export function ProductMainCard({
  productName,
  competitorName,
  confidence,
  matchTitle,
  matchDescription,
  category,
}: ProductMainCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasMatchText = Boolean(matchTitle || matchDescription);
  const resolvedCategory = category ?? t('product.categoryDefault');

  return (
    <View style={[styles.cardShadow, shadows.card as ViewStyle]}>
      <View style={styles.card}>
        <Pill variant="accent" size="sm">
          {resolvedCategory}
        </Pill>

        <RNText style={styles.productName}>{productName}</RNText>
        <RNText style={styles.replaces}>{t('product.replaces', { name: competitorName })}</RNText>

        <View
          style={[
            styles.ringRow,
            !hasMatchText && styles.ringRowCentered,
          ]}
        >
          <Ring value={confidence} size={96} stroke={8} />
          {hasMatchText ? (
            <View style={styles.ringDesc}>
              {matchTitle ? (
                <RNText style={styles.matchTitle}>{matchTitle}</RNText>
              ) : null}
              {matchDescription ? (
                <RNText style={styles.matchSub}>{matchDescription}</RNText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer wrapper: carries the shadow + backgroundColor. No overflow clipping.
  cardShadow: {
    marginHorizontal: spacing.section,
    marginTop: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
  } as ViewStyle,
  // Inner: clipping + border + padding.
  card: {
    padding: 22,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    overflow: 'hidden',
  } as ViewStyle,
  productName: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1.2,
    lineHeight: 34,
    marginTop: 14,
  },
  replaces: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 6,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 20,
  },
  ringRowCentered: {
    justifyContent: 'center',
  },
  ringDesc: {
    flex: 1,
  },
  matchTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  matchSub: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 4,
    lineHeight: 17,
  },
});
