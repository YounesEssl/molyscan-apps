import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { DangerCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ChatRoundDots } from 'react-native-solar-icons/icons/bold-duotone';
import { Camera } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button, Card } from '@/components/ui';
import { ScoreIndicator } from '@/components/ui/ScoreIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { scanService } from '@/services/scan.service';
import { chatFreeService } from '@/services/chatFree.service';
import { formatFullDate } from '@/utils/date';

interface ScanDetail {
  id: string;
  scannedProduct: { name: string; brand: string; category: string } | null;
  molydalMatch: { name: string; reference: string; category: string; confidence: number } | null;
  equivalents: Array<{ name: string; family: string; compatibility: number; reason: string }>;
  analysisText: string | null;
  identifiedSpecs: string | null;
  status: string;
  scannedAt: string;
  scanMethod: string;
  location: { lat: number; lng: number; label?: string } | null;
}

const METHOD_LABELS: Record<string, string> = {
  image: 'Photo',
  barcode: 'Code-barres',
  label: 'Étiquette',
  voice: 'Vocal',
};

export default function ProductDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        setLoading(true);
        scanService.getById(id).then((s) => setScan(s as any ?? null)).catch(() => {}).finally(() => setLoading(false));
      }
    }, [id]),
  );

  const handleAskAI = async () => {
    if (!scan?.scannedProduct || creatingChat) return;
    setCreatingChat(true);
    try {
      const bestEquiv = scan.equivalents?.[0];
      const conv = await chatFreeService.createProductConversation({
        scannedName: scan.scannedProduct.name,
        scannedBrand: scan.scannedProduct.brand,
        molydalName: bestEquiv?.name || scan.molydalMatch?.name || 'À déterminer',
      });
      router.push(`/chat/${conv.id}`);
    } catch {
      const conv = await chatFreeService.createConversation(scan.scannedProduct.name);
      router.push(`/chat/${conv.id}`);
    } finally {
      setCreatingChat(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Détail du scan" showBack />
        <View style={styles.centered}>
          <Text variant="body" color={colors.textMuted}>Chargement...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!scan) {
    return (
      <ScreenWrapper>
        <Header title="Détail du scan" showBack />
        <View style={styles.centered}>
          <Text variant="body" color={colors.textSecondary}>Scan introuvable</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const hasEquivalents = scan.equivalents && scan.equivalents.length > 0;
  const noProduct = !scan.scannedProduct?.name;

  return (
    <ScreenWrapper scroll padded={false}>
      <Header title="Détail du scan" showBack />

      <View style={styles.content}>
        {/* Status header */}
        <View style={styles.statusSection}>
          {hasEquivalents ? (
            <CheckCircle size={40} color={colors.matched} />
          ) : (
            <DangerCircle size={40} color={noProduct ? colors.warning : colors.error} />
          )}
          <Text variant="heading" style={styles.statusTitle}>
            {noProduct
              ? 'Aucun produit détecté'
              : hasEquivalents
                ? 'Équivalent trouvé'
                : 'Pas d\'équivalent'}
          </Text>
        </View>

        {/* Scan meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text variant="caption" color={colors.textSecondary}>
              {formatFullDate(scan.scannedAt)}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text variant="caption" color={colors.textSecondary}>
              {METHOD_LABELS[scan.scanMethod] || scan.scanMethod}
            </Text>
          </View>
          {scan.location?.label && (
            <View style={styles.metaChip}>
              <Text variant="caption" color={colors.textSecondary}>
                {scan.location.label}
              </Text>
            </View>
          )}
        </View>

        {/* Identified product */}
        {scan.scannedProduct && (
          <Card variant="outlined" style={styles.card}>
            <Text variant="label" color={colors.textMuted}>Produit identifié</Text>
            <Text variant="subheading">{scan.scannedProduct.name}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {scan.scannedProduct.brand} · {scan.scannedProduct.category}
            </Text>
            {scan.identifiedSpecs && (
              <Text variant="caption" color={colors.textMuted} style={styles.specs}>
                {scan.identifiedSpecs}
              </Text>
            )}
          </Card>
        )}

        {/* All equivalents */}
        {hasEquivalents && (
          <View style={styles.equivalentsSection}>
            <Text variant="label" style={styles.sectionTitle}>
              Équivalents Molydal ({scan.equivalents.length})
            </Text>
            {scan.equivalents.map((eq, i) => (
              <Card
                key={`${eq.name}-${i}`}
                variant={i === 0 ? 'elevated' : 'outlined'}
                accentColor={i === 0 ? colors.red : undefined}
                style={styles.card}
              >
                <View style={styles.eqHeader}>
                  <View style={styles.eqInfo}>
                    {i === 0 && (
                      <Text variant="caption" color={colors.red} style={styles.bestLabel}>
                        MEILLEUR MATCH
                      </Text>
                    )}
                    <Text
                      variant="subheading"
                      color={i === 0 ? colors.red : colors.textPrimary}
                    >
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
          </View>
        )}

        {/* Analysis text */}
        {scan.analysisText && (
          <Card variant="outlined" style={styles.card}>
            <Text variant="label" color={colors.textMuted}>Analyse détaillée</Text>
            <Text variant="caption" color={colors.textPrimary} style={styles.analysisText}>
              {scan.analysisText}
            </Text>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {scan.scannedProduct && (
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
            label="Retour au scanner"
            variant="secondary"
            icon={<Camera size={18} color={colors.textPrimary} />}
            onPress={() => router.push('/(tabs)/scanner')}
            fullWidth
          />
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.section,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  statusTitle: {
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  metaChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  card: {
    gap: spacing.xs,
  },
  specs: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  equivalentsSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
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
  bestLabel: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  reason: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  analysisText: {
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: 48,
  },
});
