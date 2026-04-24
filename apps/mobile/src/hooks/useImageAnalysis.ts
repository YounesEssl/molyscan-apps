import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/axios';
import { logger } from '@/lib/logger';
import { useLocation } from '@/hooks/useLocation';

export interface AnalysisResult {
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

const EMPTY_RESULT: AnalysisResult = {
  identified: { name: '', brand: '', type: '', specs: '' },
  equivalents: [],
  analysis: "L'analyse a échoué.",
  sources: [],
};

export interface UseImageAnalysis {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  capturedPhotoUri: string | null;
  setIsAnalyzing: (v: boolean) => void;
  analyzeBase64: (base64: string, mimeType?: string) => Promise<void>;
  analyzeFromGallery: () => Promise<void>;
  reset: () => void;
  setCapturedPhotoUri: (uri: string | null) => void;
  setFailure: () => void;
}

export function useImageAnalysis(): UseImageAnalysis {
  const { getCurrentLocation } = useLocation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const analyzeBase64 = useCallback(
    async (base64: string, mimeType = 'image/jpeg'): Promise<void> => {
      const sizeKb = Math.round((base64.length * 0.75) / 1024);
      logger.debug(`[analyze] start — ${sizeKb} Ko, mime=${mimeType}`);

      logger.debug('[analyze] fetching location…');
      const tLoc = Date.now();
      const location = await getCurrentLocation();
      logger.debug(`[analyze] location resolved in ${Date.now() - tLoc}ms`, location);

      logger.debug('[analyze] POST /scans/analyze-image…');
      const tApi = Date.now();
      const response = await api.post(
        '/scans/analyze-image',
        {
          image: base64,
          mimeType,
          locationLat: location?.lat,
          locationLng: location?.lng,
          locationLabel: location?.label,
        },
        { timeout: 90000 },
      );
      logger.debug(`[analyze] API responded in ${Date.now() - tApi}ms`);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(response.data);
    },
    [getCurrentLocation],
  );

  const analyzeFromGallery = useCallback(async (): Promise<void> => {
    if (isAnalyzing) {
      logger.debug('[gallery] already analyzing, skip');
      return;
    }
    logger.debug('[gallery] requesting permission…');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      logger.warn('[gallery] permission denied');
      Alert.alert(
        'Permission requise',
        "Veuillez autoriser l'accès à votre galerie dans les paramètres.",
      );
      return;
    }

    logger.debug('[gallery] opening picker…');
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (pickerResult.canceled) {
      logger.debug('[gallery] user canceled');
      return;
    }
    if (!pickerResult.assets?.[0]?.base64) {
      logger.warn('[gallery] no base64 in asset');
      return;
    }

    const asset = pickerResult.assets[0];
    setIsAnalyzing(true);
    if (asset.uri) setCapturedPhotoUri(asset.uri);

    try {
      await analyzeBase64(asset.base64!, asset.mimeType || 'image/jpeg');
      logger.debug('[gallery] ✓ analysis done');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      logger.error('[gallery] ✗ analysis failed', error);
      setResult(EMPTY_RESULT);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeBase64, isAnalyzing]);

  const reset = useCallback((): void => {
    setResult(null);
    setCapturedPhotoUri(null);
    setIsAnalyzing(false);
  }, []);

  const setFailure = useCallback((): void => {
    setResult(EMPTY_RESULT);
  }, []);

  return {
    isAnalyzing,
    result,
    capturedPhotoUri,
    setIsAnalyzing,
    analyzeBase64,
    analyzeFromGallery,
    reset,
    setCapturedPhotoUri,
    setFailure,
  };
}
