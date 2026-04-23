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
        molydalName: bestEquiv?.name || 'À déterminer',
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
          <DangerCircle size={48} color={colors.warning} />
        ) : hasMatch ? (
          <CheckCircle size={48} color={colors.matched} />
        ) : (
          <DangerCircle size={48} color={colors.error} />
        )}
      </View>
      <Text variant="heading" style={styles.statusTitle}>
        {noProduct
          ? 'Aucun produit détecté'
          : hasMatch
            ? 'Équivalent trouvé'
            : 'Aucun équivalent'}
      </Text>

      {noProduct ? (
        <Card variant="outlined" style={styles.card}>
          <Text variant="caption" color={colors.textSecondary} style={styles.analysisText}>
            {result.analysis || "Aucun produit lubrifiant n'a été identifié. Essayez de photographier l'étiquette ou l'emballage de plus près."}
          </Text>
        </Card>
      ) : (
        <Card variant="outlined" style={styles.card}>
          <Text variant="label" color={colors.textSecondary}>
            Produit identifié
          </Text>
          <Text variant="subheading">{result.identified.name}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {result.identified.brand} · {result.identified.type}
          </Text>
          {result.identified.specs ? (
            <Text variant="caption" color={colors.textMuted} style={styles.specs}>
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
              <Text variant="label" color={i === 0 ? colors.red : colors.textSecondary}>
                {i === 0 ? 'Meilleur équivalent Molydal' : 'Alternative'}
              </Text>
              <Text variant="subheading" color={i === 0 ? colors.red : colors.textPrimary}>
                {eq.name}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {eq.family}
              </Text>
            </View>
            <ScoreIndicator score={eq.compatibility} size="sm" showLabel={false} />
          </View>
          <Text variant="caption" color={colors.textSecondary} style={styles.reason}>
            {eq.reason}
          </Text>
        </Card>
      ))}

      {/* Analysis */}
      {result.analysis ? (
        <Card variant="outlined" style={styles.card}>
          <Text variant="label" color={colors.textSecondary}>
            Analyse détaillée
          </Text>
          <Text variant="caption" color={colors.textPrimary} style={styles.analysisText}>
            {result.analysis}
          </Text>
        </Card>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {!noProduct && (
          <Button
            label={creatingChat ? 'Ouverture...' : 'Poser une question à l\'IA'}
            variant="primary"
            icon={<ChatRoundDots size={18} color={colors.textOnRed} />}
            onPress={handleAskAI}
            disabled={creatingChat}
            fullWidth
          />
        )}
        <Button
          label="Scanner un autre produit"
          variant={noProduct ? 'primary' : 'secondary'}
          icon={<Camera size={18} color={noProduct ? colors.textOnRed : colors.textPrimary} />}
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
