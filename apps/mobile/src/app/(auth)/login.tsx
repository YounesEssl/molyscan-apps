import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text as RNText,
  Alert,
  TextInput,
  ScrollView,
  useWindowDimensions,
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
        behavior="height"
        enabled={Platform.OS === 'android'}
      >
        <SafeAreaView style={styles.inner}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
          >
            {/*
                Keep the hero in normal document flow. On iOS, Password AutoFill
                can emit several keyboard frame changes for a single focus. The
                previous animated maxHeight reacted to each event and left Fabric
                with stale/clipped views (including a fragment in the top-left).
              */}
            <View style={styles.hero}>
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
                  <RNText style={styles.headlineItalicRed}>
                    {t('auth.headlineBrand')}
                  </RNText>
                  {t('auth.headlineLine2')}
                </RNText>
              </View>
              <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
            </View>

            {/* The native iOS scroll inset keeps focused fields above the keyboard. */}
            <View style={styles.formGroup}>
              <Input
                containerStyle={styles.fieldBlock}
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
              <Input
                ref={passwordRef}
                containerStyle={styles.fieldBlock}
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => {
                  haptic.light();
                  router.push('/(auth)/forgot-password');
                }}
                accessibilityRole="link"
                accessibilityLabel={t('auth.forgotPassword')}
              >
                <RNText style={styles.linkAccent}>
                  {t('auth.forgotPassword')}
                </RNText>
              </TouchableOpacity>
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
                  <RNText style={styles.primaryBtnText}>
                    {t('auth.signInButton')}
                  </RNText>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => {
                  haptic.light();
                  router.push('/(auth)/register');
                }}
                accessibilityRole="link"
                accessibilityLabel={t('auth.requestAccess')}
              >
                <RNText style={styles.linkMuted}>{t('auth.noAccount')} </RNText>
                <RNText style={styles.linkAccent}>
                  {t('auth.requestAccess')}
                </RNText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
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
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  hero: {
    flexShrink: 0,
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
    width: '100%',
    flexShrink: 0,
    marginTop: 'auto',
    paddingTop: 36,
    gap: 12,
  },
  fieldBlock: {
    width: '100%',
    minHeight: 76,
    flexShrink: 0,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -2,
    paddingVertical: 4,
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  linkMuted: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    color: colors.ink2,
  },
  linkAccent: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 14,
    color: colors.red,
  },
});
