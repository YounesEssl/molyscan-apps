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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Logo3 } from '@/components/ui/Wordmark';
import { Aura } from '@/components/ui/Aura';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { radius } from '@/design/tokens/radius';
import { authService } from '@/services/auth.service';
import { haptic } from '@/lib/haptics';

type Phase = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('request');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const goToLogin = (): void => {
    router.replace('/(auth)/login');
  };

  const handleRequest = async (): Promise<void> => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      haptic.warning();
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword({ email: trimmed });
      haptic.success();
      setPhase('reset');
    } catch {
      // Réponse générique : on avance quand même (pas d'énumération).
      setPhase('reset');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    if (code.trim().length !== 6) {
      haptic.warning();
      Alert.alert(t('common.error'), t('auth.codeRequired'));
      return;
    }
    if (password.length < 6) {
      haptic.warning();
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      haptic.warning();
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        email: email.trim(),
        code: code.trim(),
        password,
      });
      haptic.success();
      setPhase('done');
    } catch (e: unknown) {
      haptic.error();
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t('auth.resetError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  if (phase === 'done') {
    return (
      <View style={styles.root}>
        <Aura
          width={420}
          height={420}
          color="#7bd88f"
          opacity={0.22}
          style={{ top: -120, left: -80 }}
        />
        <SafeAreaView style={styles.successInner}>
          <CheckCircle width={72} height={72} color={colors.ok} />
          <Text variant="title" style={styles.successTitle}>
            {t('auth.resetSuccessTitle')}
          </Text>
          <Text style={styles.successMessage}>
            {t('auth.resetSuccessMessage')}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtnWrapper}
            onPress={() => {
              haptic.medium();
              goToLogin();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('auth.backToLogin')}
          >
            <LinearGradient
              colors={['#ff5b50', '#d4251c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <RNText style={styles.primaryBtnText}>
                {t('auth.backToLogin')}
              </RNText>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const isReset = phase === 'reset';

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
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Logo3 size={44} />
              <Text variant="title" style={styles.title}>
                {isReset ? t('auth.resetTitle') : t('auth.forgotTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {isReset ? t('auth.resetSubtitle') : t('auth.forgotSubtitle')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              {!isReset ? (
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
                  returnKeyType="done"
                  onSubmitEditing={handleRequest}
                />
              ) : (
                <>
                  <Input
                    label={t('auth.codeLabel')}
                    placeholder={t('auth.codePlaceholder')}
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <Input
                    ref={passwordRef}
                    label={t('auth.newPassword')}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                    textContentType="newPassword"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <Input
                    ref={confirmRef}
                    label={t('auth.confirmPassword')}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={handleReset}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.primaryBtnWrapper}
                onPress={() => {
                  haptic.medium();
                  void (isReset ? handleReset() : handleRequest());
                }}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                <LinearGradient
                  colors={['#ff5b50', '#d4251c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtn}
                >
                  <RNText style={styles.primaryBtnText}>
                    {isReset ? t('auth.resetCta') : t('auth.forgotSendCode')}
                  </RNText>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={goToLogin}
                accessibilityRole="link"
                accessibilityLabel={t('auth.backToLogin')}
              >
                <RNText style={styles.linkAccent}>{t('auth.backToLogin')}</RNText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper1, overflow: 'hidden' },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
  hero: { marginBottom: 28 },
  title: { marginTop: 24 },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    marginTop: 10,
    maxWidth: 320,
    lineHeight: 21,
  },
  formGroup: { gap: 12 },
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
    paddingHorizontal: 36,
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
    marginTop: 16,
    paddingVertical: 8,
  },
  linkAccent: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 14,
    color: colors.red,
  },
  successInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  successTitle: { marginTop: 24, textAlign: 'center' },
  successMessage: {
    fontSize: 15,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: 320,
  },
});
