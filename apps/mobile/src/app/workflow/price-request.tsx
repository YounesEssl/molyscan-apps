import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Shop } from 'react-native-solar-icons/icons/bold-duotone';
import { TestTube } from 'react-native-solar-icons/icons/bold-duotone';
import { Tag } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button, Input, Card } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { scanService } from '@/services/scan.service';
import { workflowService } from '@/services/workflow.service';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useOutboxStore } from '@/stores/outbox.store';
import { enqueueWorkflowCreate } from '@/lib/outbox/enqueue';
import { haptic } from '@/lib/haptics';
import type { ScanRecord } from '@/schemas/scan.schema';
import type { WorkflowCreatePayload } from '@/lib/outbox/types';

export default function PriceRequestScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const addWorkflow = useWorkflowStore((s) => s.addWorkflow);
  const [scan, setScan] = useState<ScanRecord | null>(null);

  const quantityRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);

  useEffect(() => {
    if (scanId) {
      scanService.getById(scanId).then((s) => setScan(s ?? null)).catch(() => {});
    }
  }, [scanId]);

  const [clientName, setClientName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const queueOffline = async (payload: WorkflowCreatePayload): Promise<void> => {
    const id = await enqueueWorkflowCreate(payload);
    const now = new Date().toISOString();
    addWorkflow({
      id,
      ...payload,
      status: 'submitted',
      steps: [{ status: 'submitted', date: now, actor: 'You' }],
      createdAt: now,
      updatedAt: now,
    });
    setLoading(false);
    haptic.success();
    Alert.alert(t('common.success'), t('workflow.queuedOffline'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!clientName.trim() || !quantity.trim()) {
      haptic.warning();
      Alert.alert(t('common.error'), t('workflow.validationError'));
      return;
    }
    setLoading(true);

    const payload: WorkflowCreatePayload = {
      scanId: scanId ?? '',
      productName: scan?.molydalMatch?.name ?? '',
      molydalRef: scan?.molydalMatch?.reference ?? '',
      clientName: clientName.trim(),
      quantity: parseInt(quantity, 10) || 0,
      unit: 'L',
      requestedPrice: price ? parseFloat(price) : undefined,
    };

    if (!useOutboxStore.getState().isOnline) {
      await queueOffline(payload);
      return;
    }

    try {
      const wf = await workflowService.create(payload);
      addWorkflow(wf);
      setLoading(false);
      haptic.success();
      Alert.alert(t('common.success'), t('workflow.submitSuccess'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      // Lost connectivity mid-request → queue instead of failing.
      if (axios.isAxiosError(error) && !error.response) {
        await queueOffline(payload);
        return;
      }
      setLoading(false);
      haptic.error();
      Alert.alert(t('common.error'), t('workflow.submitError'));
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title={t('workflow.priceRequest')} showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                {scan?.molydalMatch && (
                  <Card style={styles.productInfo}>
                    <Text variant="body" style={styles.bold}>{scan.molydalMatch.name}</Text>
                    <Text variant="caption" color={COLORS.textSecondary}>
                      Ref. {scan.molydalMatch.reference} — {scan.molydalMatch.category}
                    </Text>
                  </Card>
                )}
                <Input
                  label={t('workflow.clientName')}
                  icon={<Shop size={18} color={COLORS.textMuted} />}
                  placeholder={t('workflow.clientPlaceholder')}
                  value={clientName}
                  onChangeText={setClientName}
                  autoCapitalize="words"
                  autoComplete="organization"
                  textContentType="organizationName"
                  returnKeyType="next"
                  onSubmitEditing={() => quantityRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <Input
                  ref={quantityRef}
                  label={t('workflow.quantity')}
                  icon={<TestTube size={18} color={COLORS.textMuted} />}
                  placeholder={t('workflow.quantityPlaceholder')}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  returnKeyType="next"
                  onSubmitEditing={() => priceRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <Input
                  ref={priceRef}
                  label={t('workflow.desiredPrice')}
                  icon={<Tag size={18} color={COLORS.textMuted} />}
                  placeholder={t('workflow.optional')}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <Button
                  title={t('workflow.submitRequest')}
                  variant="primary"
                  size="lg"
                  loading={loading}
                  onPress={handleSubmit}
                  style={styles.submit}
                />
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: SPACING.xl,
  },
  content: {
    gap: SPACING.md,
  },
  productInfo: {
    gap: SPACING.xs,
  },
  bold: {
    fontWeight: '700',
  },
  submit: {
    marginTop: SPACING.md,
  },
});
