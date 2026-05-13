import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { DangerCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Camera } from 'react-native-solar-icons/icons/bold-duotone';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { Like } from 'react-native-solar-icons/icons/bold-duotone';
import { Dislike } from 'react-native-solar-icons/icons/bold-duotone';
import { Text, Button, Card } from '@/components/ui';
import { ScoreIndicator } from '@/components/ui/ScoreIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';
import { chatFreeService } from '@/services/chatFree.service';
import { scanService } from '@/services/scan.service';
import { haptic } from '@/lib/haptics';
import { logger } from '@/lib/logger';

interface AnalysisResult {
  id?: string;
  identified: { name: string; brand: string; type: string; specs: string };
  equivalents: Array<{
    name: string;
    family: string;
    compatibility: number;
    reason: string;
  }>;
  analysis: string;
  sources: string[];
}

interface ImageAnalysisResultProps {
  result: AnalysisResult;
  onScanAgain: () => void;
}

type Vote = 'up' | 'down';
type FeedbackState = Record<string, { vote: Vote; submitted: boolean }>;

export const ImageAnalysisResult: React.FC<ImageAnalysisResultProps> = ({
  result,
  onScanAgain,
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [creatingChat, setCreatingChat] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [pendingDownEq, setPendingDownEq] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const hasMatch = result.equivalents.length > 0;
  const noProduct = !result.identified.name || result.identified.name === 'null';

  const canSubmitFeedback = Boolean(result.id);

  const handleVote = async (eqName: string, vote: Vote): Promise<void> => {
    if (!canSubmitFeedback || feedback[eqName]?.submitted) return;
    haptic.light();
    if (vote === 'down') {
      setSuggestedName('');
      setPendingDownEq(eqName);
      return;
    }
    setFeedback((prev) => ({ ...prev, [eqName]: { vote: 'up', submitted: false } }));
    try {
      await scanService.submitEquivalentFeedback(result.id!, {
        equivalentName: eqName,
        vote: 'up',
      });
      setFeedback((prev) => ({ ...prev, [eqName]: { vote: 'up', submitted: true } }));
    } catch (error) {
      logger.error('[feedback] up vote failed', error);
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[eqName];
        return next;
      });
    }
  };

  const handleSubmitDownVote = async (): Promise<void> => {
    if (!pendingDownEq || !canSubmitFeedback) return;
    const trimmed = suggestedName.trim();
    if (!trimmed) return;
    setSubmittingFeedback(true);
    try {
      await scanService.submitEquivalentFeedback(result.id!, {
        equivalentName: pendingDownEq,
        vote: 'down',
        suggestedName: trimmed,
      });
      setFeedback((prev) => ({
        ...prev,
        [pendingDownEq]: { vote: 'down', submitted: true },
      }));
      setPendingDownEq(null);
      setSuggestedName('');
    } catch (error) {
      logger.error('[feedback] down vote failed', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleAskAI = async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const bestEquiv = result.equivalents[0];
      const conv = await chatFreeService.createProductConversation({
        scannedName: result.identified.name,
        scannedBrand: result.identified.brand,
        molydalName: bestEquiv?.name || t('product.toBeDetermined'),
        scanId: result.id,
      });
      onScanAgain(); // close the bottom sheet
      router.push(`/chat/${conv.id}`);
    } catch {
      // fallback: create a free conversation
      const conv = await chatFreeService.createConversation(
        `${result.identified.name} — ${result.identified.brand}`,
      );
      onScanAgain();
      router.push(`/chat/${conv.id}`);
    } finally {
      setCreatingChat(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Status */}
      <View style={styles.statusIcon}>
        {noProduct ? (
          <DangerCircle size={48} color={colors.warn} />
        ) : hasMatch ? (
          <CheckCircle size={48} color={colors.ok} />
        ) : (
          <DangerCircle size={48} color={colors.red} />
        )}
      </View>
      <Text variant="heading" style={styles.statusTitle}>
        {noProduct
          ? t('scanner.statusNoProduct')
          : hasMatch
            ? t('scanner.statusEquivalent')
            : t('scanner.statusNoEquivalent')}
      </Text>

      {noProduct ? (
        <Card variant="outlined" style={styles.card}>
          <Text variant="caption" color={colors.ink2} style={styles.analysisText}>
            {result.analysis || t('scanner.noLubricantIdentified')}
          </Text>
        </Card>
      ) : (
        <Card variant="outlined" style={styles.card}>
          <Text variant="label" color={colors.ink2}>
            {t('scanner.identifiedProduct')}
          </Text>
          <Text variant="subheading">{result.identified.name}</Text>
          <Text variant="caption" color={colors.ink2}>
            {result.identified.brand} · {result.identified.type}
          </Text>
          {result.identified.specs ? (
            <Text variant="caption" color={colors.ink3} style={styles.specs}>
              {result.identified.specs}
            </Text>
          ) : null}
        </Card>
      )}

      {/* Equivalents */}
      {result.equivalents.map((eq, i) => {
        const fb = feedback[eq.name];
        return (
          <Card
            key={eq.name}
            variant={i === 0 ? 'elevated' : 'outlined'}
            accentColor={i === 0 ? colors.red : undefined}
            style={styles.card}
          >
            <View style={styles.eqHeader}>
              <View style={styles.eqInfo}>
                <Text variant="label" color={i === 0 ? colors.red : colors.ink2}>
                  {i === 0 ? t('scanner.bestEquivalent') : t('scanner.alternative')}
                </Text>
                <Text variant="subheading" color={i === 0 ? colors.red : colors.ink}>
                  {eq.name}
                </Text>
                <Text variant="caption" color={colors.ink2}>
                  {eq.family}
                </Text>
              </View>
              <ScoreIndicator score={eq.compatibility} size="sm" showLabel={false} />
            </View>
            <Text variant="caption" color={colors.ink2} style={styles.reason}>
              {eq.reason}
            </Text>

            {canSubmitFeedback ? (
              <View style={styles.feedbackRow}>
                {fb?.submitted ? (
                  <Text variant="caption" color={colors.ink3}>
                    {fb.vote === 'up'
                      ? t('scanner.feedbackThanksUp')
                      : t('scanner.feedbackThanksDown')}
                  </Text>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => handleVote(eq.name, 'up')}
                      style={[
                        styles.voteBtn,
                        fb?.vote === 'up' && styles.voteBtnActiveUp,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('scanner.feedbackApprove')}
                    >
                      <Like size={18} color={fb?.vote === 'up' ? colors.ok : colors.ink2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleVote(eq.name, 'down')}
                      style={[
                        styles.voteBtn,
                        fb?.vote === 'down' && styles.voteBtnActiveDown,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('scanner.feedbackReject')}
                    >
                      <Dislike size={18} color={fb?.vote === 'down' ? colors.red : colors.ink2} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}
          </Card>
        );
      })}

      {/* Analysis */}
      {result.analysis ? (
        <Card variant="outlined" style={styles.card}>
          <Text variant="label" color={colors.ink2}>
            {t('scanner.detailedAnalysis')}
          </Text>
          <Text variant="caption" color={colors.ink} style={styles.analysisText}>
            {result.analysis}
          </Text>
        </Card>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {!noProduct && (
          <Button
            label={creatingChat ? t('scanner.askAIOpening') : t('scanner.askAI')}
            variant="primary"
            icon={<ChatRoundDots size={18} color={colors.textOnRed} />}
            onPress={handleAskAI}
            disabled={creatingChat}
            fullWidth
          />
        )}
        <Button
          label={t('scanner.scanAnotherProduct')}
          variant={noProduct ? 'primary' : 'secondary'}
          icon={<Camera size={18} color={noProduct ? colors.textOnRed : colors.ink} />}
          onPress={onScanAgain}
          fullWidth
        />
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={pendingDownEq !== null}
        onRequestClose={() => {
          if (!submittingFeedback) setPendingDownEq(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text variant="subheading">{t('scanner.suggestTitle')}</Text>
            <Text variant="caption" color={colors.ink2} style={styles.modalSubtitle}>
              {t('scanner.suggestPrompt', { name: pendingDownEq ?? '' })}
            </Text>
            <TextInput
              value={suggestedName}
              onChangeText={setSuggestedName}
              placeholder={t('scanner.suggestPlaceholder')}
              placeholderTextColor={colors.ink3}
              style={styles.modalInput}
              autoFocus
              editable={!submittingFeedback}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <Button
                label={t('scanner.suggestCancel')}
                variant="secondary"
                onPress={() => {
                  if (!submittingFeedback) setPendingDownEq(null);
                }}
                disabled={submittingFeedback}
              />
              <Button
                label={
                  submittingFeedback
                    ? t('scanner.suggestSending')
                    : t('scanner.suggestSend')
                }
                variant="primary"
                onPress={handleSubmitDownVote}
                disabled={submittingFeedback || suggestedName.trim().length === 0}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  statusIcon: {
    marginTop: spacing.sm,
  },
  statusTitle: {
    textAlign: 'center',
  },
  card: {
    width: '100%',
    gap: spacing.xs,
  },
  specs: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  eqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eqInfo: {
    flex: 1,
    gap: 2,
  },
  reason: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  analysisText: {
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  voteBtn: {
    width: 40,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper1,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
  },
  voteBtnActiveUp: {
    backgroundColor: 'rgba(52,199,89,0.10)',
    borderColor: 'rgba(52,199,89,0.30)',
  },
  voteBtnActiveDown: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderColor: 'rgba(255,59,48,0.30)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.paper2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalSubtitle: {
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.15)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
