import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { FileText } from 'lucide-react-native';
import { ProductDetailHeader } from '@/components/product/ProductDetailHeader';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { productService } from '@/services/product.service';
import { colors } from '@/design/tokens/colors';

export default function PimDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'download' | 'viewer' | 'share' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState(false);

  const openPdf = useCallback(async (fileUri: string) => {
    setOpening(true);
    setError(null);
    try {
      const contentUri = await getContentUriAsync(fileUri);
      await startActivityAsync('android.intent.action.VIEW', {
        data: contentUri, type: 'application/pdf', flags: 1, // temporary read permission
      });
    } catch {
      setError('viewer');
    } finally {
      setOpening(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    setUri(null);
    void productService.downloadPimDocument(id)
      .then((fileUri) => {
        if (!current) return;
        setUri(fileUri);
        if (Platform.OS === 'android') void openPdf(fileUri);
      })
      .catch(() => { if (current) setError('download'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, attempt, openPdf]);

  const sharePdf = async () => {
    if (!uri) return;
    setOpening(true);
    setError(null);
    try {
      if (!await Sharing.isAvailableAsync()) throw new Error('Sharing unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('documents.saveOrShare') });
    } catch { setError('share'); }
    finally { setOpening(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProductDetailHeader onBack={() => router.back()} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.red} />
          <Text variant="body" color={colors.ink2}>{t('documents.loading')}</Text>
        </View>
      ) : uri && Platform.OS === 'ios' && error !== 'viewer' ? (
        <WebView
          source={{ uri }} style={styles.web} originWhitelist={['file://*']}
          allowingReadAccessToURL={uri.slice(0, uri.lastIndexOf('/') + 1)}
          onShouldStartLoadWithRequest={(request) => request.url === uri || request.url === 'about:blank'}
          onError={() => setError('viewer')} javaScriptEnabled={false}
        />
      ) : (
        <View style={styles.centered}>
          <FileText size={42} color={colors.red} />
          <Text variant="subheading" style={styles.centerText}>{t(error ? `documents.${error}Error` : 'documents.ready')}</Text>
          {error === 'viewer' ? <Text variant="body" color={colors.ink2} style={styles.centerText}>{t('documents.readerHelp')}</Text> : null}
          {!uri ? <Button label={t('documents.retry')} onPress={() => setAttempt((value) => value + 1)} /> : null}
          {uri && Platform.OS === 'android' ? <Button label={t('documents.openPdf')} loading={opening} onPress={() => void openPdf(uri)} /> : null}
        </View>
      )}
      {uri ? (
        <View style={styles.actions}>
          {error === 'share' && Platform.OS === 'ios' ? <Text variant="caption" color={colors.red}>{t('documents.shareError')}</Text> : null}
          <Button label={t('documents.saveOrShare')} variant="secondary" loading={opening} onPress={() => void sharePdf()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper1 },
  web: { flex: 1, backgroundColor: colors.paper1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  centerText: { textAlign: 'center' },
  actions: { padding: 20, gap: 8 },
});
