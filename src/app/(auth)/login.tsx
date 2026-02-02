import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, Button, Input } from '@/components/ui';
import { Toggle } from '@/components/ui/Toggle';
import { COLORS, GRADIENTS, SPACING, SHADOW } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth.store';
import { MOCK_COMMERCIAL, MOCK_DISTRIBUTOR, MOCK_ADMIN } from '@/mocks/user.mock';
import type { UserRole } from '@/schemas/auth.schema';

const ROLE_USERS = {
  commercial: MOCK_COMMERCIAL,
  distributor: MOCK_DISTRIBUTOR,
  admin: MOCK_ADMIN,
};

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('commercial');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setUser(ROLE_USERS[role]);
      setLoading(false);
      router.replace('/(tabs)');
    }, 800);
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
              <Ionicons name="scan" size={36} color={COLORS.surface} />
            </LinearGradient>
            <Text variant="title" color={COLORS.primary}>
              MolyScan
            </Text>
            <Text variant="caption" style={styles.tagline}>
              Identifiez les équivalents Molydal instantanément
            </Text>
          </View>

          {/* Role selector */}
          <Toggle
            options={[
              { label: 'Commercial', value: 'commercial' },
              { label: 'Distributeur', value: 'distributor' },
              { label: 'Admin', value: 'admin' },
            ]}
            value={role}
            onChange={(v) => setRole(v as UserRole)}
          />

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              icon="mail-outline"
              placeholder="prenom.nom@molydal.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Mot de passe"
              icon="lock-closed-outline"
              placeholder="Votre mot de passe"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            <Button
              title="Se connecter"
              variant="accent"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              style={styles.loginButton}
            />
            <Text variant="caption" style={styles.forgotPassword}>
              Mot de passe oublié ?
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
