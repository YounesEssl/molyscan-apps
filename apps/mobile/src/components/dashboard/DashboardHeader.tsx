import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'react-native-solar-icons/icons/bold-duotone';
import { Wordmark3 } from '@/components/ui/Wordmark';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { haptic } from '@/lib/haptics';

interface DashboardHeaderProps {
  onBellPress: () => void;
  hasNotifications?: boolean;
}

export function DashboardHeader({
  onBellPress,
  hasNotifications = true,
}: DashboardHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Wordmark3 size={18} />
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => {
          haptic.light();
          onBellPress();
        }}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.a11yOpenNotifications')}
      >
        <Bell size={19} color={colors.ink} />
        {hasNotifications ? <View style={styles.bellDot} /> : null}
      </TouchableOpacity>
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
    paddingBottom: 4,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.ink4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
});
