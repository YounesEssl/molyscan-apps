import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text as RNText,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  Animated,
  Easing,
  type KeyboardEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo3 } from '@/components/ui/Wordmark';
import { Aura } from '@/components/ui/Aura';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { radius } from '@/design/tokens/radius';
import { useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/haptics';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

  // Responsive headline size: "instantanément" (14 chars) must fit on one
  // line across iPhone SE (320w) → iPhone 17 Pro Max (430w).
  const headlineFontSize = Math.min(48, Math.max(30, (width - 68) / 8));

  // Smoothly collapse the hero (logo + headline + subtitle) when the keyboard
  // appears so the form becomes the visual focus.
  const heroAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateTo = (toValue: number, event?: KeyboardEvent) => {
      const duration = event?.duration ?? 250;
      Animated.timing(heroAnim, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvt, (e) => animateTo(0, e));
    const hideSub = Keyboard.addListener(hideEvt, (e) => animateTo(1, e));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [heroAnim]);

  const heroOpacity = heroAnim;
  const heroScale = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const heroTranslate = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 0],
  });
  // Collapse height of hero section from its natural height down to 0
  const heroHeight = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password) {
      haptic.warning();
      Alert.alert(t('common.error'), t('auth.requiredFields'));
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      haptic.success();
      router.replace('/(tabs)');
    } catch (e: unknown) {
      haptic.error();
      const msg =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (e as { message?: string })?.message ||
        t('auth.loginError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Aura
        width={420}
        height={420}
        color="#ff5b50"
        opacity={0.25}
        style={{ top: -120, left: -80 }}
      />
      <Aura
        width={380}
        height={380}
        color="#ffc878"
        opacity={0.22}
        style={{ bottom: -80, right: -80 }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <SafeAreaView style={styles.inner}>
            <View style={styles.content}>
              {/* Hero — collapses smoothly when keyboard appears */}
              <Animated.View
                style={[
                  styles.hero,
                  {
                    opacity: heroOpacity,
                    transform: [
                      { scale: heroScale },
                      { translateY: heroTranslate },
                    ],
                    // scaleY of the whole section via height multiplier
                    maxHeight: heroHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 400],
                    }),
                  },
                ]}
              >
                <Logo3 size={52} />
                <View style={styles.headlineWrap}>
                  <RNText
                    style={[
                      styles.headline,
                      {
                        fontSize: headlineFontSize,
                        lineHeight: headlineFontSize * 1.05,
                      },
                    ]}
                    allowFontScaling={false}
                    adjustsFontSizeToFit
                    numberOfLines={3}
                    minimumFontScale={0.6}
                  >
                    {t('auth.headlineLine1')}
                    <RNText style={styles.headlineItalicRed}>{t('auth.headlineBrand')}</RNText>
                    {t('auth.headlineLine2')}
                  </RNText>
                </View>
                <Text style={styles.subtitle}>
                  {t('auth.subtitle')}
                </Text>
              </Animated.View>

              {/* Form — stays pinned, becomes the focus on keyboard open */}
              <View style={styles.formGroup}>
                <Input
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <Input
                  ref={passwordRef}
                  label={t('auth.password')}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.primaryBtnWrapper}
                  onPress={() => {
                    haptic.medium();
                    void handleLogin();
                  }}
                  disabled={loading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.signInA11y')}
                  accessibilityState={{ disabled: loading, busy: loading }}
                >
                  <LinearGradient
                    colors={['#ff5b50', '#d4251c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryBtn}
                  >
                    <RNText style={styles.primaryBtnText}>{t('auth.signInButton')}</RNText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper1,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  inner: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    overflow: 'hidden',
  },
  headlineWrap: {
    marginTop: 32,
  },
  headline: {
    fontFamily: typography.fonts.display,
    color: colors.ink,
    letterSpacing: -1.5,
  },
  headlineItalicRed: {
    fontFamily: typography.fonts.displayItalic,
    color: colors.red,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    marginTop: 18,
    maxWidth: 280,
    lineHeight: 21,
  },
  formGroup: {
    gap: 12,
  },
  primaryBtnWrapper: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
    marginTop: 8,
  },
  primaryBtn: {
    height: 58,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: -0.2,
  },
});
