import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { useAuthStore } from '@/stores/auth.store';
import {
  grantAiDataConsent,
  hasAiDataConsent,
  revokeAiDataConsent,
} from '@/lib/aiDataConsent';
import { purgeQueuedAiScans } from '@/lib/outbox/enqueue';

const PRIVACY_POLICY_URL = 'https://admin.molyscan.fr/privacy';

interface AiDataConsentContextValue {
  consentGranted: boolean;
  requestConsent: () => Promise<boolean>;
  revokeConsent: () => Promise<void>;
}

const AiDataConsentContext = createContext<AiDataConsentContextValue | null>(null);

interface PendingRequest {
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
}

export function AiDataConsentProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const [consentGranted, setConsentGranted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef<PendingRequest | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setConsentGranted(false);
      return () => {
        active = false;
      };
    }

    void hasAiDataConsent().then((granted) => {
      if (active) setConsentGranted(granted);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const finishRequest = useCallback((result: boolean): void => {
    setVisible(false);
    pendingRef.current?.resolve(result);
    pendingRef.current = null;
  }, []);

  const requestConsent = useCallback(async (): Promise<boolean> => {
    if (await hasAiDataConsent()) {
      setConsentGranted(true);
      return true;
    }

    if (pendingRef.current) return pendingRef.current.promise;

    let resolveRequest: (value: boolean) => void = () => {};
    const promise = new Promise<boolean>((resolve) => {
      resolveRequest = resolve;
    });
    pendingRef.current = { promise, resolve: resolveRequest };
    setVisible(true);
    return promise;
  }, []);

  const accept = useCallback(async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      await grantAiDataConsent();
      setConsentGranted(true);
      finishRequest(true);
    } finally {
      setSaving(false);
    }
  }, [finishRequest, saving]);

  const decline = useCallback((): void => {
    if (saving) return;
    setConsentGranted(false);
    finishRequest(false);
  }, [finishRequest, saving]);

  const revokeConsent = useCallback(async (): Promise<void> => {
    await revokeAiDataConsent();
    await purgeQueuedAiScans();
    setConsentGranted(false);
  }, []);

  const value = useMemo(
    () => ({ consentGranted, requestConsent, revokeConsent }),
    [consentGranted, requestConsent, revokeConsent],
  );

  return (
    <AiDataConsentContext.Provider value={value}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={decline}
      >
        <View style={styles.backdrop}>
          <View style={styles.card} accessibilityViewIsModal>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <Text variant="heading" style={styles.title}>
                {t('aiConsent.title')}
              </Text>
              <Text variant="body" color={colors.ink2}>
                {t('aiConsent.intro')}
              </Text>

              <View style={styles.providerList}>
                <ProviderRow
                  name="Google Gemini"
                  description={t('aiConsent.googleDescription')}
                />
                <ProviderRow
                  name="OpenAI"
                  description={t('aiConsent.openAiDescription')}
                />
              </View>

              <Text variant="caption" color={colors.ink2}>
                {t('aiConsent.protection')}
              </Text>
              <Text variant="caption" color={colors.ink2}>
                {t('aiConsent.choice')}
              </Text>

              <Pressable
                onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
                accessibilityRole="link"
                accessibilityLabel={t('aiConsent.privacyPolicy')}
              >
                <Text variant="caption" color={colors.red} style={styles.link}>
                  {t('aiConsent.privacyPolicy')}
                </Text>
              </Pressable>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={styles.declineButton}
                onPress={decline}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text variant="body" color={colors.ink}>
                  {t('aiConsent.decline')}
                </Text>
              </Pressable>
              <Button
                title={t('aiConsent.accept')}
                onPress={() => void accept()}
                disabled={saving}
                style={styles.acceptButton}
              />
              {saving ? (
                <ActivityIndicator color={colors.red} style={styles.saving} />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </AiDataConsentContext.Provider>
  );
}

function ProviderRow({
  name,
  description,
}: {
  name: string;
  description: string;
}): React.JSX.Element {
  return (
    <View style={styles.providerRow}>
      <View style={styles.dot} />
      <View style={styles.providerText}>
        <Text variant="body" style={styles.providerName}>
          {name}
        </Text>
        <Text variant="caption" color={colors.ink2}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export function useAiDataConsent(): AiDataConsentContextValue {
  const context = useContext(AiDataConsentContext);
  if (!context) {
    throw new Error('useAiDataConsent must be used inside AiDataConsentProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.section,
    backgroundColor: 'rgba(26,20,16,0.55)',
  },
  card: {
    maxHeight: '86%',
    borderRadius: radius.xl,
    backgroundColor: colors.paper1,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    gap: 14,
  },
  title: {
    color: colors.ink,
  },
  providerList: {
    gap: 12,
    paddingVertical: 4,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.paper2,
  },
  dot: {
    width: 8,
    height: 8,
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  providerText: {
    flex: 1,
    gap: 3,
  },
  providerName: {
    color: colors.ink,
  },
  link: {
    textDecorationLine: 'underline',
    paddingVertical: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,20,16,0.08)',
    backgroundColor: colors.paper2,
  },
  declineButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.14)',
  },
  acceptButton: {
    flex: 1,
  },
  saving: {
    position: 'absolute',
    right: 28,
  },
});
