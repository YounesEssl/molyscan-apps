import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Shop2 } from 'react-native-solar-icons/icons/bold-duotone';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Button, Input } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';
import { crmService } from '@/services/crm.service';
import { haptic } from '@/lib/haptics';
import { logger } from '@/lib/logger';

export default function CrmCredentialsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savedLogin, setSavedLogin] = useState<string | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    crmService
      .getStatus()
      .then((s) => {
        setConfigured(s.configured);
        setSavedLogin(s.login);
        if (s.login) setLogin(s.login);
      })
      .catch((e) => logger.error('CRM status failed', e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!login.trim() || !password) return;
    setSaving(true);
    try {
      const status = await crmService.saveCredentials(login.trim(), password);
      haptic.success();
      setConfigured(status.configured);
      setEditing(false);
      setSavedLogin(status.login ?? login.trim());
      setPassword('');
      Alert.alert(t('crmCredentials.successTitle'), t('crmCredentials.successBody'));
    } catch (e: any) {
      haptic.error();
      const status = e?.response?.status;
      Alert.alert(
        t('crmCredentials.errorTitle'),
        status === 401
          ? t('crmCredentials.errorInvalid')
          : t('crmCredentials.errorGeneric'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      t('crmCredentials.disconnectTitle'),
      t('crmCredentials.disconnectBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('crmCredentials.disconnect'),
          style: 'destructive',
          onPress: async () => {
            try {
              await crmService.deleteCredentials();
              haptic.success();
              setConfigured(false);
              setEditing(false);
              setSavedLogin(null);
              setLogin('');
              setPassword('');
            } catch (e) {
              haptic.error();
              logger.error('CRM disconnect failed', e);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title={t('crmCredentials.title')} showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Shop2 size={30} color={COLORS.primary} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>{t('crmCredentials.eyebrow')}</Text>
              <Text style={styles.title}>{t('crmCredentials.title')}</Text>
              <Text variant="body" color={COLORS.textSecondary} style={styles.intro}>
                {t('crmCredentials.intro')}
              </Text>
            </View>
          </View>

          {configured && savedLogin && !editing && (
            <Card variant="outlined" style={styles.statusCard}>
              <View style={styles.statusContent}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusIcon}>
                    <CheckCircle size={18} color={COLORS.success} />
                  </View>
                  <View style={styles.statusText}>
                    <Text style={styles.statusTitle}>{t('crmCredentials.connected')}</Text>
                    <Text variant="caption" color={COLORS.textSecondary}>
                      {t('crmCredentials.connectedAs', { login: savedLogin })}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusActions}>
                  <Button
                    title={t('crmCredentials.editCredentials')}
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      haptic.light();
                      setEditing(true);
                    }}
                  />
                  <Button
                    title={t('crmCredentials.disconnect')}
                    variant="ghost"
                    size="sm"
                    onPress={handleDisconnect}
                  />
                </View>
              </View>
            </Card>
          )}

          {(!configured || editing) && (
            <Card style={styles.formCard}>
              <View style={styles.formContent}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {configured ? t('crmCredentials.updateTitle') : t('crmCredentials.connectTitle')}
                  </Text>
                  <Text variant="caption" color={COLORS.textSecondary}>
                    {configured ? t('crmCredentials.updateHint') : t('crmCredentials.formHint')}
                  </Text>
                </View>

                <View style={styles.fields}>
                  <Input
                    label={t('crmCredentials.login')}
                    value={login}
                    onChangeText={setLogin}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t('crmCredentials.loginPlaceholder')}
                    editable={!loading && !saving}
                  />
                  <Input
                    label={t('crmCredentials.password')}
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    textContentType="password"
                    placeholder={t('crmCredentials.passwordPlaceholder')}
                    editable={!loading && !saving}
                  />
                </View>

                <View style={styles.actions}>
                  <Button
                    title={configured ? t('crmCredentials.saveNewCredentials') : t('crmCredentials.connect')}
                    variant="primary"
                    loading={saving}
                    disabled={!login.trim() || !password}
                    onPress={handleSave}
                    style={styles.button}
                  />
                  {configured && (
                    <Button
                      title={t('common.cancel')}
                      variant="secondary"
                      disabled={saving}
                      onPress={() => {
                        setEditing(false);
                        setPassword('');
                        if (savedLogin) setLogin(savedLogin);
                      }}
                      style={styles.button}
                    />
                  )}
                </View>
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  hero: {
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '18',
  },
  heroText: {
    gap: SPACING.xs,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: typography.fonts.display,
    color: colors.ink,
  },
  intro: {
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: colors.paper2,
  },
  statusContent: {
    gap: SPACING.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '16',
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  statusActions: {
    gap: SPACING.sm,
  },
  statusTitle: {
    fontSize: 14,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
  },
  formCard: {
    borderRadius: radius.lg,
  },
  formContent: {
    gap: SPACING.lg,
  },
  formHeader: {
    gap: 4,
  },
  fields: {
    gap: SPACING.md,
  },
  actions: {
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  formTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
  },
  button: {
    width: '100%',
  },
});
