import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface DashboardGreetingProps {
  firstName?: string;
}

export function DashboardGreeting({
  firstName,
}: DashboardGreetingProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.greeting}>
      <Text style={styles.greetingSub}>
        {firstName
          ? t('dashboard.greetingNamed', { name: firstName })
          : t('dashboard.greeting')}
      </Text>
      <RNText style={styles.greetingTitle}>
        {t('dashboard.readyTitlePart1')}
        <RNText style={styles.greetingItalic}>{t('dashboard.readyTitlePart2')}</RNText>
        {t('dashboard.readyTitlePart3')}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    paddingHorizontal: spacing.section,
    marginTop: 28,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 13,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    letterSpacing: -0.1,
  },
  greetingTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -1.5,
    lineHeight: 42,
    marginTop: 4,
  },
  greetingItalic: {
    fontFamily: typography.fonts.displayItalic,
    color: colors.red,
  },
});
