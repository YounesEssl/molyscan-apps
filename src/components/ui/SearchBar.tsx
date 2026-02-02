import React from 'react';
import { View, TextInput, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Rechercher...',
  style,
}) => (
  <View style={[styles.container, SHADOW.sm as ViewStyle, style]}>
    <View style={styles.iconBox}>
      <Ionicons name="search" size={16} color={COLORS.textMuted} />
    </View>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      value={value}
      onChangeText={onChangeText}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    paddingVertical: 0,
    fontWeight: '500',
  },
});
