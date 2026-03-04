import React from 'react';
import { StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text } from '@/components/ui';
import { SPACING } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <ScreenWrapper style={styles.container}>
      <Text variant="heading">{t('auth.registerTitle')}</Text>
      <Text variant="body">{t('auth.registerMessage')}</Text>
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
