import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button, Input, Card } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { MOCK_SCANS } from '@/mocks/scans.mock';
import { useWorkflowStore } from '@/stores/workflow.store';

export default function PriceRequestScreen(): React.JSX.Element {
  const router = useRouter();
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const addWorkflow = useWorkflowStore((s) => s.addWorkflow);
  const scan = MOCK_SCANS.find((s) => s.id === scanId);

  const [clientName, setClientName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!clientName.trim() || !quantity.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le client et la quantité.');
      return;
    }
    setLoading(true);
    const now = new Date().toISOString();
    addWorkflow({
      id: `wf-${Date.now()}`,
      scanId: scanId ?? '',
      productName: scan?.molydalMatch?.name ?? '',
      molydalRef: scan?.molydalMatch?.reference ?? '',
      clientName: clientName.trim(),
      quantity: parseInt(quantity, 10) || 0,
      unit: 'L',
      requestedPrice: price ? parseFloat(price) : undefined,
      status: 'submitted',
      steps: [
        { status: 'draft', date: now, actor: 'Vous' },
        { status: 'submitted', date: now, actor: 'Vous' },
      ],
      createdAt: now,
      updatedAt: now,
    });
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Succès', 'Demande de prix envoyée.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }, 600);
  };

  return (
    <ScreenWrapper scroll>
      <Header title="Demande de prix" showBack />
      <View style={styles.content}>
        {scan?.molydalMatch && (
          <Card style={styles.productInfo}>
            <Text variant="body" style={styles.bold}>{scan.molydalMatch.name}</Text>
            <Text variant="caption" color={COLORS.textSecondary}>
              Réf. {scan.molydalMatch.reference} — {scan.molydalMatch.category}
            </Text>
          </Card>
        )}
        <Input label="Nom du client" icon="business-outline" placeholder="Ex: Airbus Toulouse" value={clientName} onChangeText={setClientName} />
        <Input label="Quantité (L)" icon="beaker-outline" placeholder="Ex: 200" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
        <Input label="Prix souhaité (€/L)" icon="pricetag-outline" placeholder="Optionnel" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <Button title="Envoyer la demande" variant="accent" size="lg" loading={loading} onPress={handleSubmit} style={styles.submit} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
