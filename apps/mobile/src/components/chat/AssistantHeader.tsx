import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { AltArrowLeft, Flag } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface AssistantHeaderProps {
  title: string;
  onBack: () => void;
  onSubmitForAnalysis?: () => void;
  submitting?: boolean;
  submitted?: boolean;
}

export function AssistantHeader({
  title,
  onBack,
  onSubmitForAnalysis,
  submitting = false,
  submitted = false,
}: AssistantHeaderProps): React.JSX.Element {
  const submitDisabled = submitting || submitted || !onSubmitForAnalysis;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <AltArrowLeft size={18} color={colors.ink} />
      </TouchableOpacity>

      <RNText style={styles.title} numberOfLines={1}>
        {title}
      </RNText>

      <TouchableOpacity
        style={[styles.submitBtn, submitted && styles.submitBtnDone]}
        onPress={onSubmitForAnalysis}
        disabled={submitDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          submitted ? 'Conversation envoyée pour analyse' : 'Envoyer pour analyse'
        }
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.ink} />
        ) : (
          <Flag
            size={16}
            color={submitted ? colors.purple : colors.ink}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26,20,16,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  submitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26,20,16,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDone: {
    backgroundColor: 'rgba(91,45,255,0.10)',
    borderColor: 'rgba(91,45,255,0.30)',
  },
});
