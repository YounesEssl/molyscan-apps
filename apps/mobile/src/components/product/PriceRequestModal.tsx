import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Tag, CheckCircle2, X } from 'lucide-react-native';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { radius } from '@/design/tokens/radius';
import { workflowService } from '@/services/workflow.service';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useOutboxStore } from '@/stores/outbox.store';
import { enqueueWorkflowCreate } from '@/lib/outbox/enqueue';
import { haptic } from '@/lib/haptics';
import type { WorkflowCreatePayload } from '@/lib/outbox/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  scanId: string;
  product: { name: string; ref: string };
}

type Phase = 'confirm' | 'sending' | 'sent';

export function PriceRequestModal({
  visible,
  onClose,
  scanId,
  product,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const addWorkflow = useWorkflowStore((s) => s.addWorkflow);
  const [phase, setPhase] = useState<Phase>('confirm');
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    if (visible) {
      setPhase('confirm');
      setQueued(false);
    }
  }, [visible]);

  const buildPayload = (): WorkflowCreatePayload => ({
    scanId,
    productName: product.name,
    molydalRef: product.ref,
  });

  const queueOffline = async (payload: WorkflowCreatePayload): Promise<void> => {
    const id = await enqueueWorkflowCreate(payload);
    const now = new Date().toISOString();
    addWorkflow({
      id,
      ...payload,
      unit: payload.unit ?? 'L',
      status: 'submitted',
      steps: [{ status: 'submitted', date: now, actor: 'You' }],
      createdAt: now,
      updatedAt: now,
    });
    setQueued(true);
    setPhase('sent');
    haptic.success();
  };

  const handleConfirm = async (): Promise<void> => {
    const payload = buildPayload();
    setPhase('sending');

    if (!useOutboxStore.getState().isOnline) {
      await queueOffline(payload);
      return;
    }

    try {
      const wf = await workflowService.create(payload);
      addWorkflow(wf);
      setPhase('sent');
      haptic.success();
    } catch (error) {
      // Perte de connexion en cours de requête → on met en file plutôt qu'échouer.
      if (axios.isAxiosError(error) && !error.response) {
        await queueOffline(payload);
        return;
      }
      setPhase('confirm');
      haptic.error();
    }
  };

  const dismissable = phase !== 'sending';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => dismissable && onClose()}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => dismissable && onClose()}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {phase === 'sent' ? (
          <View style={styles.body}>
            <View style={[styles.iconCircle, styles.iconCircleOk]}>
              <CheckCircle2 width={30} height={30} color={colors.ok} />
            </View>
            <RNText style={styles.title}>{t('workflow.sentTitle')}</RNText>
            <RNText style={styles.subtitle}>
              {queued ? t('workflow.queuedOffline') : t('workflow.sentBody')}
            </RNText>
            <TouchableOpacity
              style={styles.primaryWrap}
              activeOpacity={0.85}
              onPress={() => {
                haptic.medium();
                onClose();
              }}
            >
              <LinearGradient
                colors={[colors.redVivid, colors.red]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <RNText style={styles.primaryText}>{t('common.close')}</RNText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.iconCircle}>
              <Tag width={26} height={26} color={colors.red} />
            </View>
            <RNText style={styles.title}>{t('workflow.confirmTitle')}</RNText>
            <RNText style={styles.subtitle}>{t('workflow.confirmBody')}</RNText>

            {!!product.name && (
              <View style={styles.productCard}>
                <RNText style={styles.productName} numberOfLines={2}>
                  {product.name}
                </RNText>
                {!!product.ref && (
                  <RNText style={styles.productRef}>
                    {t('common.ref')} {product.ref}
                  </RNText>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryWrap}
              activeOpacity={0.85}
              disabled={phase === 'sending'}
              onPress={() => {
                haptic.medium();
                void handleConfirm();
              }}
            >
              <LinearGradient
                colors={[colors.redVivid, colors.red]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                {phase === 'sending' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <RNText style={styles.primaryText}>
                    {t('workflow.confirmCta')}
                  </RNText>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              disabled={phase === 'sending'}
              onPress={onClose}
            >
              <RNText style={styles.ghostText}>{t('common.cancel')}</RNText>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.closeIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={!dismissable}
          onPress={onClose}
          accessibilityLabel={t('common.close')}
        >
          <X width={22} height={22} color={colors.ink3} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,20,16,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink4,
    marginBottom: 18,
  },
  closeIcon: { position: 'absolute', top: 18, right: 18 },
  body: { alignItems: 'center', gap: 0 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleOk: { backgroundColor: colors.okBg },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink2,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  productCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.paper2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.ink4,
    padding: 16,
    marginTop: 20,
    gap: 4,
  },
  productName: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: colors.ink,
  },
  productRef: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    color: colors.ink3,
  },
  primaryWrap: {
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtn: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  primaryText: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: -0.2,
  },
  ghostBtn: {
    alignSelf: 'stretch',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ghostText: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: colors.ink2,
  },
});
