import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { QrCode } from 'react-native-solar-icons/icons/bold-duotone';
import { Letter } from 'react-native-solar-icons/icons/bold-duotone';
import { Lock } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, Button, Input } from '@/components/ui';
import { COLORS, GRADIENTS, SPACING, SHADOW } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('auth.loginError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Logo area */}
          <View style={styles.logoArea}>
            <LinearGradient
              colors={[...GRADIENTS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoCircle, SHADOW.primary as ViewStyle]}
            >
              <QrCode size={36} color={COLORS.surface} />
            </LinearGradient>
            <Text variant="title" color={COLORS.primary}>
              MolyScan
            </Text>
            <Text variant="caption" style={styles.tagline}>
              {t('auth.tagline')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label={t('auth.email')}
              icon={<Letter size={18} color={COLORS.textMuted} />}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label={t('auth.password')}
              icon={<Lock size={18} color={COLORS.textMuted} />}
              placeholder={t('auth.passwordPlaceholder')}
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            {error ? (
              <Text variant="caption" color={COLORS.danger} style={styles.errorText}>
                {error}
              </Text>
            ) : null}
            <Button
              title={t('auth.login')}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              style={styles.loginButton}
            />
            <Text variant="caption" style={styles.forgotPassword}>
              {t('auth.forgotPassword')}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 260,
  },
  form: {
    gap: SPACING.md,
  },
  errorText: {
    textAlign: 'center',
  },
  loginButton: {
    marginTop: SPACING.sm,
  },
  forgotPassword: {
    textAlign: 'center',
    color: COLORS.accent,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
});
