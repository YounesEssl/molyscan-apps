import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { DangerCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Camera } from 'react-native-solar-icons/icons/bold-duotone';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { Text, Button, Card } from '@/components/ui';
import { ScoreIndicator } from '@/components/ui/ScoreIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { chatFreeService } from '@/services/chatFree.service';

interface AnalysisResult {
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

export const ImageAnalysisResult: React.FC<ImageAnalysisResultProps> = ({
  result,
  onScanAgain,
}) => {
  const router = useRouter();
  const [creatingChat, setCreatingChat] = useState(false);
  const hasMatch = result.equivalents.length > 0;
  const noProduct = !result.identified.name || result.identified.name === 'null';

  const handleAskAI = async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const bestEquiv = result.equivalents[0];
      const conv = await chatFreeService.createProductConversation({
        scannedName: result.identified.name,
        scannedBrand: result.identified.brand,
        molydalName: bestEquiv?.name || 'To be determined',
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
          ? 'No product detected'
          : hasMatch
            ? 'Equivalent found'
            : 'No equivalent'}
      </Text>

      {noProduct ? (
        <Card variant="outlined" style={styles.card}>
          <Text variant="caption" color={colors.ink2} style={styles.analysisText}>
            {result.analysis || 'No lubricant product was identified. Try taking a closer photo of the label or packaging.'}
          </Text>
        </Card>
      ) : (
        <Card variant="outlined" style={styles.card}>
          <Text variant="label" color={colors.ink2}>
            Identified product
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
      {result.equivalents.map((eq, i) => (
        <Card
          key={eq.name}
          variant={i === 0 ? 'elevated' : 'outlined'}
          accentColor={i === 0 ? colors.red : undefined}
          style={styles.card}
        >
          <View style={styles.eqHeader}>
            <View style={styles.eqInfo}>
              <Text variant="label" color={i === 0 ? colors.red : colors.ink2}>
                {i === 0 ? 'Best Molydal equivalent' : 'Alternative'}
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
        </Card>
      ))}

      {/* Analysis */}
      {result.analysis ? (
        <Card variant="outlined" style={styles.card}>
          <Text variant="label" color={colors.ink2}>
            Detailed analysis
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
            label={creatingChat ? 'Opening...' : 'Ask the AI'}
            variant="primary"
            icon={<ChatRoundDots size={18} color={colors.textOnRed} />}
            onPress={handleAskAI}
            disabled={creatingChat}
            fullWidth
          />
        )}
        <Button
          label="Scan another product"
          variant={noProduct ? 'primary' : 'secondary'}
          icon={<Camera size={18} color={noProduct ? colors.textOnRed : colors.ink} />}
          onPress={onScanAgain}
          fullWidth
        />
      </View>
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
});
