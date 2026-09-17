import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { productService, selectTechnicalSheet } from '@/services/product.service';

export function TechnicalSheetButton({ productName, showProductName = false }: { productName: string; showProductName?: boolean }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data, isError, refetch } = useQuery({
    queryKey: ['pim-documents', productName],
    queryFn: () => productService.getPimDocuments(productName),
    enabled: !!productName,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const document = selectTechnicalSheet(data ?? [], i18n.language);
  if (!document && !isError) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(isError ? 'documents.retryLookup' : 'documents.consultTechnicalSheet')} — ${productName}`}
      onPress={() => document ? router.push(`/document/${document.id}`) : void refetch()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <FileText size={18} color={colors.red} />
      <View style={styles.copy}>
        <Text variant="caption" color={colors.red}>{t(isError ? 'documents.retryLookup' : 'documents.consultTechnicalSheet')}</Text>
        {showProductName ? <Text variant="caption" color={colors.ink2}>{productName}</Text> : null}
      </View>
      {document ? <Text variant="caption" color={colors.ink3}>{document.language.toUpperCase()}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  pressed: { opacity: 0.65 },
  copy: { flex: 1, gap: 2 },
});
