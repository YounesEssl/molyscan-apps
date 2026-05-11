import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { FreeChatSuggestions } from '@/components/chat/FreeChatSuggestions';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface ChatEmptyStateProps {
  onSuggestionSelect: (text: string) => void;
}

export function ChatEmptyState({
  onSuggestionSelect,
}: ChatEmptyStateProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.purpleVivid, colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <Stars size={28} color="#fff" />
      </LinearGradient>
      <RNText style={styles.title}>{t('chat.emptyTitle')}</RNText>
      <RNText style={styles.subtitle}>{t('chat.emptySubtitle')}</RNText>
      <FreeChatSuggestions onSelect={onSuggestionSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 40,
    gap: spacing.sm,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#5b2dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    color: colors.ink2,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },
});
