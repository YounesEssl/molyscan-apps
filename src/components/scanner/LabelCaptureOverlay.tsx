import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

const { width } = Dimensions.get('window');
const FRAME_WIDTH = width * 0.85;
const FRAME_HEIGHT = FRAME_WIDTH * 0.65;
const CORNER_LENGTH = 28;
const CORNER_WIDTH = 3;

interface LabelCaptureOverlayProps {
  onCapture: () => void;
  isAnalyzing: boolean;
}

export const LabelCaptureOverlay: React.FC<LabelCaptureOverlayProps> = ({ onCapture, isAnalyzing }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Frame area */}
      <View style={styles.frameContainer}>
        <Animated.View style={[styles.frame, { opacity: pulseAnim }]}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </Animated.View>
      </View>

      {/* Help text */}
      <View style={styles.helpContainer}>
        <Text variant="body" color={COLORS.surface} style={styles.helpText}>
          {isAnalyzing ? 'Analyse de l\'étiquette en cours...' : 'Cadrez l\'étiquette du produit'}
        </Text>
      </View>

      {/* Capture button */}
      <View style={styles.captureContainer}>
        {isAnalyzing ? (
          <View style={styles.captureButton}>
            <ActivityIndicator size="large" color={COLORS.surface} />
          </View>
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={onCapture} activeOpacity={0.7}>
            <View style={styles.captureInner}>
              <Ionicons name="camera" size={28} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: COLORS.accent,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: COLORS.accent,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: COLORS.accent,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  helpContainer: {
    position: 'absolute',
    bottom: 160,
    alignItems: 'center',
  },
  helpText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    fontSize: 14,
    fontWeight: '600',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
