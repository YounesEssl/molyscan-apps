import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface AssistantAvatarProps {
  name?: string;
  subtitle?: string;
}

export function AssistantAvatar({
  name = 'Assistant Molydal',
  subtitle = 'Contextualisé sur le catalogue',
}: AssistantAvatarProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[colors.purpleVivid, colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <Stars size={16} color="#fff" />
      </LinearGradient>
      <View>
        <RNText style={styles.name}>{name}</RNText>
        <RNText style={styles.sub}>{subtitle}</RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.section,
    paddingBottom: spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b2dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  name: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 12,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    color: colors.ink2,
  },
});
