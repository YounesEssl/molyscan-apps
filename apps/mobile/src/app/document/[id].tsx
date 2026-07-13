import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ProductDetailHeader } from '@/components/product/ProductDetailHeader';
import { API_CONFIG, ENDPOINTS } from '@/constants/api';
import { storage } from '@/lib/storage';
import { colors } from '@/design/tokens/colors';

export default function PimDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { void storage.getToken().then(setToken); }, []);
  const uri = `${API_CONFIG.baseURL}${ENDPOINTS.products.pimDocumentContent(id)}`;
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ProductDetailHeader onBack={() => router.back()} />
      {!token ? <View style={styles.loading}><ActivityIndicator color={colors.red} /></View> : (
        <WebView source={{ uri, headers:{ Authorization:`Bearer ${token}` } }} style={styles.web} startInLoadingState renderLoading={() => <View style={styles.loading}><ActivityIndicator color={colors.red} /></View>} />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ container:{ flex:1,backgroundColor:colors.paper1 }, web:{ flex:1,backgroundColor:colors.paper1 }, loading:{ ...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',backgroundColor:colors.paper1 } });
