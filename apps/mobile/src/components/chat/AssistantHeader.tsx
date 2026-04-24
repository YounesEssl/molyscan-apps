import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { AltArrowLeft } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface AssistantHeaderProps {
  title: string;
  onBack: () => void;
}

export function AssistantHeader({
  title,
  onBack,
}: AssistantHeaderProps): React.JSX.Element {
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

      {/* Spacer to balance the back button width so the title stays centered */}
      <View style={styles.spacer} />
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
  spacer: {
    width: 38,
    height: 38,
  },
});
