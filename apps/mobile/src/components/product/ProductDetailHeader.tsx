import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AltArrowLeft } from 'react-native-solar-icons/icons/bold';
import { MenuDots } from 'react-native-solar-icons/icons/bold-duotone';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface ProductDetailHeaderProps {
  title?: string;
  onBack: () => void;
  onMenu?: () => void;
}

export function ProductDetailHeader({
  title,
  onBack,
  onMenu,
}: ProductDetailHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          haptic.light();
          onBack();
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('product.a11yBack')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <AltArrowLeft size={18} color={colors.ink} />
      </TouchableOpacity>
      <RNText style={styles.title}>{title ?? t('product.headerDefaultTitle')}</RNText>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          haptic.light();
          onMenu?.();
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('product.a11yMenu')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MenuDots size={18} color={colors.ink} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 1,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
});
