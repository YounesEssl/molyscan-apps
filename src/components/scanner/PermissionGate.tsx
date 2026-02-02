import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '@/components/ui';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '@/constants/theme';

interface PermissionGateProps {
  onRequestPermission: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  onRequestPermission,
}) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...GRADIENTS.primary]}
        style={[styles.iconWrapper, SHADOW.primary as ViewStyle]}
      >
        <Ionicons name="camera-outline" size={48} color={COLORS.surface} />
      </LinearGradient>
      <Text variant="heading" style={styles.title}>
        Accès caméra requis
      </Text>
      <Text variant="body" style={styles.description}>
        MolyScan utilise votre caméra pour scanner les codes-barres des produits
        concurrents et identifier l'équivalent Molydal.
      </Text>
      <Button
        title="Autoriser la caméra"
        variant="accent"
        icon="camera"
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
