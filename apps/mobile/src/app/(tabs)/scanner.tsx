import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Flashlight } from 'react-native-solar-icons/icons/bold';
import { Camera } from 'react-native-solar-icons/icons/bold-duotone';
import { Gallery } from 'react-native-solar-icons/icons/bold-duotone';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, BottomSheet } from '@/components/ui';
import { PermissionGate } from '@/components/scanner/PermissionGate';
import { ImageAnalysisResult } from '@/components/scanner/ImageAnalysisResult';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { shadows } from '@/design/tokens/shadows';
import { api } from '@/lib/axios';
import { useLocation } from '@/hooks/useLocation';
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

export default function ScannerScreen(): React.JSX.Element {
  const cameraRef = useRef<CameraView>(null);
  const { isLoading: permLoading, isGranted, requestPermission } = useCameraPermission();
  const { getCurrentLocation } = useLocation();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  if (permLoading) {
    return (
      <ScreenWrapper style={styles.centered}>
        <Text variant="body">Chargement...</Text>
      </ScreenWrapper>
    );
  }

  if (!isGranted) {
    return (
      <ScreenWrapper>
        <PermissionGate onRequestPermission={requestPermission} />
      </ScreenWrapper>
    );
  }

  const analyzeBase64 = async (base64: string, mimeType = 'image/jpeg') => {
    // Get location in parallel with API call prep
    const location = await getCurrentLocation();

    // Send to API (longer timeout — image analysis takes time)
    const response = await api.post('/scans/analyze-image', {
      image: base64,
      mimeType,
      locationLat: location?.lat,
      locationLng: location?.lng,
      locationLabel: location?.label,
    }, { timeout: 60000 });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResult(response.data);
  };

  const handlePickFromGallery = async () => {
    if (isAnalyzing) return;

    // Android requires explicit media library permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "Veuillez autoriser l'accès à votre galerie dans les paramètres.",
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return;
    const asset = pickerResult.assets[0];

    setIsAnalyzing(true);
    if (asset.uri) setCapturedPhotoUri(asset.uri);
    try {
      const mime = asset.mimeType || 'image/jpeg';
      await analyzeBase64(asset.base64!, mime);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (__DEV__) console.error('[Scanner] Analysis failed:', error);
      setResult({
        identified: { name: '', brand: '', type: '', specs: '' },
        equivalents: [],
        analysis: "L'analyse a échoué. Vérifiez votre connexion et réessayez.",
        sources: [],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCapture = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      // Timeout protection: takePictureAsync can hang on some Android devices
      const photoPromise = cameraRef.current?.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Capture timeout')), 10000),
      );
      const photo = await Promise.race([photoPromise, timeoutPromise]);

      if (!photo?.base64) {
        throw new Error('Capture échouée');
      }

      // Freeze frame: show the taken photo immediately so the user sees it was captured
      setCapturedPhotoUri(photo.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await analyzeBase64(photo.base64);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (__DEV__) console.error('[Scanner] Analysis failed:', error);
      setResult({
        identified: { name: '', brand: '', type: '', specs: '' },
        equivalents: [],
        analysis: "L'analyse a échoué. Vérifiez votre connexion et réessayez.",
        sources: [],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCapturedPhotoUri(null);
    setIsAnalyzing(false); // Safety reset — ensures button is never stuck in loading
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashEnabled}
      />

      {/* Freeze frame: shown immediately after capture so the user sees a still image */}
      {capturedPhotoUri && (
        <Image
          source={{ uri: capturedPhotoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Overlay with viewfinder */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top dark zone */}
        <View style={styles.overlayTop} />

        {/* Middle row with viewfinder */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.viewfinder}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Bottom dark zone */}
        <View style={styles.overlayBottom} />
      </View>

      {/* Top controls */}
      <SafeAreaView style={styles.topControls} edges={['top']}>
        <View style={styles.topRow}>
          <Text variant="subheading" color="#fff" style={styles.title}>
            Scanner un produit
          </Text>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setFlashEnabled(!flashEnabled)}
          >
            <Flashlight size={22} color={flashEnabled ? colors.red : '#fff'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Instruction */}
      <View style={[styles.instructionWrap, { bottom: tabBarHeight + 100 }]}>
        <Text variant="caption" color="#fff" style={styles.instruction}>
          Photographiez l'étiquette ou le produit concurrent
        </Text>
      </View>

      {/* Capture + gallery buttons */}
      <View style={[styles.captureWrap, { bottom: tabBarHeight + 24 }]}>
        <View style={styles.captureRow}>
          {/* Gallery button */}
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickFromGallery}
            disabled={isAnalyzing}
            activeOpacity={0.7}
          >
            <Gallery size={24} color="#fff" />
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity
            style={[styles.captureButton, shadows.red]}
            onPress={handleCapture}
            disabled={isAnalyzing}
            activeOpacity={0.8}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Camera size={32} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Spacer for symmetry */}
          <View style={styles.galleryButton} />
        </View>
        {isAnalyzing && (
          <Text variant="caption" color="#fff" style={styles.analyzingText}>
            Analyse en cours...
          </Text>
        )}
      </View>

      {/* Result bottom sheet */}
      <BottomSheet visible={!!result} onClose={handleReset}>
        {result && (
          <ImageAnalysisResult result={result} onScanAgain={handleReset} />
        )}
      </BottomSheet>
    </View>
  );
}

const VIEWFINDER_SIZE = 280;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Overlay
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.red,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  // Top controls
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.section,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom
  instructionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontWeight: '600',
    fontSize: 13,
  },
  captureWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  analyzingText: {
    fontWeight: '600',
  },
});
