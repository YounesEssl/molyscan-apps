import React from 'react';
import { StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text } from '@/components/ui';
import { SPACING } from '@/constants/theme';

export default function RegisterScreen(): React.JSX.Element {
  return (
    <ScreenWrapper style={styles.container}>
      <Text variant="heading">Inscription</Text>
      <Text variant="body">L'inscription sera disponible prochainement.</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
});
