import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera } from 'react-native-solar-icons/icons/bold-duotone';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '@/components/ui';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '@/constants/theme';

interface PermissionGateProps {
  onRequestPermission: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  onRequestPermission,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...GRADIENTS.primary]}
        style={[styles.iconWrapper, SHADOW.primary as ViewStyle]}
      >
        <Camera size={48} color={COLORS.surface} />
      </LinearGradient>
      <Text variant="heading" style={styles.title}>
        {t('scanner.cameraRequired')}
      </Text>
      <Text variant="body" style={styles.description}>
        {t('scanner.cameraDescription')}
      </Text>
      <Button
        title={t('scanner.authorizeCamera')}
        variant="primary"
        icon={<Camera size={20} color={COLORS.surface} />}
        onPress={onRequestPermission}
        size="lg"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    maxWidth: 300,
    marginBottom: SPACING.sm,
  },
});
