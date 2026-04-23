import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, subtitle, action }) => (
  <View style={styles.container}>
    <View style={styles.iconCircle}>
      {typeof icon === 'string' ? (
        <Text variant="body" color={colors.textMuted}>{icon}</Text>
      ) : (
        icon
      )}
    </View>
    <Text variant="subheading" color={colors.textPrimary}>
      {title}
    </Text>
    {(description || subtitle) && (
      <Text variant="caption" color={colors.textMuted} style={styles.description}>
        {description ?? subtitle}
      </Text>
    )}
    {action && (
      <Button
        label={action.label}
        variant="secondary"
        size="sm"
        onPress={action.onPress}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
});
