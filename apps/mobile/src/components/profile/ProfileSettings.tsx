import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { Bell } from 'react-native-solar-icons/icons/bold-duotone';
import { Settings } from 'react-native-solar-icons/icons/bold-duotone';
import { Eye } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Logout2 } from 'react-native-solar-icons/icons/bold';
import { shadows } from '@/design/tokens/shadows';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface IconComponent {
  (props: { size?: number; color?: string }): React.JSX.Element;
}

interface SettingsItem {
  key: string;
  label: string;
  sub?: string;
  icon: IconComponent;
  onPress?: () => void;
  danger?: boolean;
}

interface ProfileSettingsProps {
  onLogout: () => void;
  onItemPress?: (key: string) => void;
}

const ITEMS: Omit<SettingsItem, 'onPress' | 'danger'>[] = [
  { key: 'notifications', label: 'Notifications', sub: 'Push, email, SMS', icon: Bell },
  { key: 'language', label: 'Langue', sub: 'Français', icon: Settings },
  { key: 'privacy', label: 'Confidentialité', sub: 'RGPD, données', icon: Eye },
];

export function ProfileSettings({
  onLogout,
  onItemPress,
}: ProfileSettingsProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <RNText style={styles.sectionTitle}>Paramètres</RNText>
      <View style={[styles.list, shadows.card as ViewStyle]}>
        {ITEMS.map((item) => (
          <SettingsRow
            key={item.key}
            label={item.label}
            sub={item.sub}
            icon={item.icon}
            onPress={() => onItemPress?.(item.key)}
          />
        ))}
        <SettingsRow
          label="Se déconnecter"
          icon={Logout2}
          danger
          onPress={onLogout}
        />
      </View>
    </View>
  );
}

interface SettingsRowProps {
  label: string;
  sub?: string;
  icon: IconComponent;
  danger?: boolean;
  onPress?: () => void;
}

function SettingsRow({
  label,
  sub,
  icon: Icon,
  danger,
  onPress,
}: SettingsRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => {
        if (danger) {
          haptic.medium();
        } else {
          haptic.light();
        }
        onPress?.();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      <View style={[styles.iconBox, danger ? styles.iconDanger : null]}>
        <Icon size={16} color={danger ? colors.red : colors.ink} />
      </View>
      <View style={styles.text}>
        <RNText
          style={[styles.label, danger ? { color: colors.red } : null]}
        >
          {label}
        </RNText>
        {sub ? <RNText style={styles.sub}>{sub}</RNText> : null}
      </View>
      <AltArrowRight size={14} color={colors.ink3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.section,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    overflow: 'hidden',
  } as ViewStyle,
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,20,16,0.06)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.paper1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: {
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  text: {
    flex: 1,
  },
  label: {
    fontFamily: typography.fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    color: colors.ink2,
    marginTop: 2,
  },
});
