import React, { useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { TAB_BAR } from '@/constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Inner-content bottom padding so the last buttons clear the floating
  // tab bar and home indicator, even when scrolled to the bottom.
  const contentBottomPadding =
    TAB_BAR.height + TAB_BAR.bottomOffset + insets.bottom + 8;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  // Modal renders at the native root level — guarantees the sheet appears
  // above the floating tab bar (which lives in the tabs layout).
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
          >
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              // Horizontal padding lives on the CONTENT (not the sheet) so
              // child shadows can render into that horizontal space without
              // being clipped by the ScrollView's viewport bounds.
              contentContainerStyle={{
                paddingHorizontal: SPACING.lg,
                paddingBottom: contentBottomPadding,
              }}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl + 8,
    borderTopRightRadius: RADIUS.xxl + 8,
    paddingTop: SPACING.sm,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
});
