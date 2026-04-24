import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AddCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface ChatHubHeaderProps {
  onNewPress: () => void;
  disabled?: boolean;
  title?: string;
}

export function ChatHubHeader({
  onNewPress,
  disabled = false,
  title = 'Assistant IA',
}: ChatHubHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <RNText style={styles.title}>{title}</RNText>

      <View style={styles.newButtonShadow}>
        <TouchableOpacity
          style={styles.newButton}
          onPress={onNewPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.redVivid, colors.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.newBtnGradient}
          >
            <AddCircle size={16} color="#fff" />
            <RNText style={styles.newBtnText}>Nouveau</RNText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  // Outer wrapper — carries the shadow (no overflow, opaque background).
  newButtonShadow: {
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Inner pressable — carries the clipping.
  newButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  newBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  newBtnText: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 12,
    color: '#fff',
  },
});
