import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gallery } from 'react-native-solar-icons/icons/bold-duotone';
import { colors } from '@/design/tokens/colors';
import { haptic } from '@/lib/haptics';

// LinearGradient is still used by the inner capture button, keep the import.

interface ScannerBottomControlsProps {
  isAnalyzing: boolean;
  bottom: number;
  onCapture: () => void;
  onPickFromGallery: () => void;
}

export function ScannerBottomControls({
  isAnalyzing,
  bottom,
  onCapture,
  onPickFromGallery,
}: ScannerBottomControlsProps): React.JSX.Element {
  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      <View style={styles.captureRow}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            haptic.light();
            onPickFromGallery();
          }}
          disabled={isAnalyzing}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Choisir une photo depuis la galerie"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Gallery size={18} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureOuter}
          onPress={() => {
            haptic.heavy();
            onCapture();
          }}
          disabled={isAnalyzing}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Capturer une photo"
          accessibilityState={{ busy: isAnalyzing, disabled: isAnalyzing }}
        >
          <LinearGradient
            colors={[colors.redVivid, colors.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.captureInner}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : null}
          </LinearGradient>
        </TouchableOpacity>

        {/* Spacer to keep the capture button visually centered */}
        <View style={styles.sideBtnSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 28,
    alignItems: 'center',
    zIndex: 10,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,253,248,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3c2814',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sideBtnSpacer: {
    width: 44,
    height: 44,
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.paper2,
    padding: 5,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 15,
    elevation: 8,
  },
  captureInner: {
    flex: 1,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
