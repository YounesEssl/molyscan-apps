import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CloudWaterdrop } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

export function HistoryEmpty(): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <View style={styles.icon}>
        <CloudWaterdrop size={32} color={colors.ink3} />
      </View>
      <Text variant="body" color={colors.ink2}>
        Aucun scan enregistré
      </Text>
      <Text variant="caption">Photographiez un produit pour commencer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ink4,
  },
});
