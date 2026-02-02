import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

const SUGGESTIONS = [
  'Quelles différences techniques ?',
  'Compatible avec mon application ?',
  'Existe-t-il un autre équivalent ?',
  'Avantages par rapport au concurrent ?',
  'Quelle est la plage de température ?',
  'Fiche technique détaillée ?',
  'Conditionnements disponibles ?',
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.container}
  >
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
  </ScrollView>
);

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
  },
});
