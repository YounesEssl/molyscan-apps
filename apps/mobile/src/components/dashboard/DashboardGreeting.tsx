import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
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
  return (
    <View style={styles.greeting}>
      <Text style={styles.greetingSub}>
        {firstName ? `Hi ${firstName},` : 'Hello,'}
      </Text>
      <RNText style={styles.greetingTitle}>
        {'Ready to '}
        <RNText style={styles.greetingItalic}>scan</RNText>
        {'?'}
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
