import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const suggestions = [
    t('chat.suggestedTechnicalDiff'),
    t('chat.suggestedCompatible'),
    t('chat.suggestedOtherEquiv'),
    t('chat.suggestedAdvantages'),
    t('chat.suggestedTempRange'),
    t('chat.suggestedTechSheet'),
    t('chat.suggestedPackaging'),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {suggestions.map((q) => (
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
  },
});
