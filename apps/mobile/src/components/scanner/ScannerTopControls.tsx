import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AltArrowLeft } from 'react-native-solar-icons/icons/bold';
import { Flashlight } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { haptic } from '@/lib/haptics';

interface ScannerTopControlsProps {
  flashEnabled: boolean;
  onClose: () => void;
  onToggleFlash: () => void;
}

export function ScannerTopControls({
  flashEnabled,
  onClose,
  onToggleFlash,
}: ScannerTopControlsProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.glassBtn}
          onPress={() => {
            haptic.light();
            onClose();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Fermer le scanner"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AltArrowLeft size={20} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.glassBtn, flashEnabled ? styles.glassBtnActive : null]}
          onPress={() => {
            haptic.light();
            onToggleFlash();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={flashEnabled ? 'Désactiver le flash' : 'Activer le flash'}
          accessibilityState={{ selected: flashEnabled }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Flashlight size={18} color={flashEnabled ? colors.red : colors.ink} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GLASS_SHADOW = {
  shadowColor: '#3c2814',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.section,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,253,248,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...GLASS_SHADOW,
  },
  glassBtnActive: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
  },
});
