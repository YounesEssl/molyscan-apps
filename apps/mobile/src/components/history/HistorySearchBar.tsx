import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Magnifer } from 'react-native-solar-icons/icons/bold-duotone';
import { Filter } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface HistorySearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  onFilterPress?: () => void;
  placeholder?: string;
}

export function HistorySearchBar({
  value,
  onChangeText,
  onFilterPress,
  placeholder = 'Référence, client, date…',
}: HistorySearchBarProps): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Magnifer size={16} color={colors.ink2} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.ink2}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity activeOpacity={0.7} onPress={onFilterPress}>
          <Filter size={16} color={colors.ink2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.section,
    marginTop: 14,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink4,
    paddingHorizontal: 16,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 0,
  },
});
