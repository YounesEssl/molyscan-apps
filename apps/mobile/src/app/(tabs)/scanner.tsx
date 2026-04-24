import React, { useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PermissionGate } from '@/components/scanner/PermissionGate';
import { ImageAnalysisResult } from '@/components/scanner/ImageAnalysisResult';
import { ScannerViewfinder } from '@/components/scanner/ScannerViewfinder';
import { ScannerTopControls } from '@/components/scanner/ScannerTopControls';
import { ScannerBottomControls } from '@/components/scanner/ScannerBottomControls';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import { colors } from '@/design/tokens/colors';
import { logger } from '@/lib/logger';

export default function ScannerScreen(): React.JSX.Element {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const { isLoading: permLoading, isGranted, requestPermission } =
    useCameraPermission();
  const { tabBarBottom } = useTabBarSpacing();
  const analysis = useImageAnalysis();

  const [flashEnabled, setFlashEnabled] = React.useState(false);

  if (permLoading) {
    return (
      <ScreenWrapper style={styles.centered}>
        <Text variant="body">Loading...</Text>
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

  const handleCapture = async (): Promise<void> => {
    if (analysis.isAnalyzing) return;
    analysis.setIsAnalyzing(true);
    try {
      const photoPromise = cameraRef.current?.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Capture timeout')), 10000),
      );
      const photo = await Promise.race([photoPromise, timeoutPromise]);
      if (!photo?.base64) throw new Error('Capture failed');
      analysis.setCapturedPhotoUri(photo.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await analysis.analyzeBase64(photo.base64);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      logger.error('Scanner capture failed', error);
      analysis.setFailure();
    } finally {
      analysis.setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashEnabled}
      />
      {analysis.capturedPhotoUri ? (
        <Image
          source={{ uri: analysis.capturedPhotoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      <ScannerViewfinder />

      <ScannerTopControls
        flashEnabled={flashEnabled}
        onClose={() => router.back()}
        onToggleFlash={() => setFlashEnabled((f) => !f)}
      />

      <ScannerBottomControls
        isAnalyzing={analysis.isAnalyzing}
        bottom={tabBarBottom + 40}
        onCapture={handleCapture}
        onPickFromGallery={analysis.analyzeFromGallery}
      />

      <BottomSheet visible={!!analysis.result} onClose={analysis.reset}>
        {analysis.result ? (
          <ImageAnalysisResult
            result={analysis.result}
            onScanAgain={analysis.reset}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
