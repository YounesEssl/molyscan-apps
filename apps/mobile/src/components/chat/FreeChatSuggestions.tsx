import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface FreeChatSuggestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTIONS = [
  'Quelle graisse pour des roulements haute température ?',
  'Quel lubrifiant alimentaire NSF H1 pour engrenages ?',
  'Produit pour chaîne de convoyeur en environnement humide ?',
  'Graisse biodégradable pour industrie agroalimentaire ?',
];

export const FreeChatSuggestions: React.FC<FreeChatSuggestionsProps> = ({
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      {SUGGESTIONS.map((q) => (
        <TouchableOpacity
          key={q}
          style={styles.chip}
          onPress={() => onSelect(q)}
          activeOpacity={0.7}
        >
          <Text variant="caption" color={COLORS.primary} style={styles.chipText}>
            {q}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  chip: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  chipText: {
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
});
