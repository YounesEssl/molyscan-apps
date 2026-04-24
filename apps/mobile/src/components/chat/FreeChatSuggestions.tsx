import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface FreeChatSuggestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTIONS = [
  'Which grease for high-temperature bearings?',
  'Which NSF H1 food-grade lubricant for gears?',
  'Product for conveyor chains in humid environments?',
  'Biodegradable grease for food processing industry?',
];

export function FreeChatSuggestions(
  props: FreeChatSuggestionsProps,
): React.JSX.Element {
  const { onSelect } = props;

  return (
    <View style={styles.container}>
      {SUGGESTIONS.map((q) => (
        <TouchableOpacity
          key={q}
          style={styles.chip}
          onPress={() => {
            haptic.light();
            onSelect(q);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={q}
        >
          <Text style={styles.chipText}>{q}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.section,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.paper2,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
  },
  chipText: {
    fontFamily: typography.fonts.sansMedium,
    fontSize: 12,
    color: colors.red,
  },
});
