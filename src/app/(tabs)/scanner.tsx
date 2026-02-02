import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, BottomSheet } from '@/components/ui';
import { ScanOverlay } from '@/components/scanner/ScanOverlay';
import { ScanResult } from '@/components/scanner/ScanResult';
import { PermissionGate } from '@/components/scanner/PermissionGate';
import { ScanModeSwitch } from '@/components/scanner/ScanModeSwitch';
import { VoiceInput } from '@/components/scanner/VoiceInput';
import { LabelCaptureOverlay } from '@/components/scanner/LabelCaptureOverlay';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useScannerStore } from '@/stores/scanner.store';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { MOCK_SCANNED_PRODUCTS } from '@/mocks/products.mock';

export default function ScannerScreen(): React.JSX.Element {
  const cameraRef = useRef<CameraView>(null);
  const { isLoading, isGranted, requestPermission } = useCameraPermission();
  const {
    handleBarcodeScanned,
    captureLabel,
    isAnalyzingLabel,
    lastScanRecord,
    isScanning,
    flashEnabled,
    toggleFlash,
    resetScan,
  } = useBarcodeScan();
  const { scanMode, setScanMode } = useScannerStore();

  const needsCamera = scanMode === 'barcode' || scanMode === 'label';

  if (isLoading) {
    return (
      <ScreenWrapper style={styles.centered}>
        <Text variant="body">Chargement...</Text>
      </ScreenWrapper>
    );
  }

  if (!isGranted && needsCamera) {
    return (
      <ScreenWrapper>
        <PermissionGate onRequestPermission={requestPermission} />
      </ScreenWrapper>
    );
  }

  return (
    <View style={styles.container}>
      {needsCamera ? (
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={flashEnabled}
            barcodeScannerSettings={scanMode === 'barcode' ? {
              barcodeTypes: [
                'ean13',
                'ean8',
                'upc_a',
                'upc_e',
                'code128',
                'code39',
                'qr',
              ],
            } : undefined}
            onBarcodeScanned={scanMode === 'barcode' && isScanning ? handleBarcodeScanned : undefined}
          />
          {scanMode === 'barcode' && isScanning && <ScanOverlay />}
          {scanMode === 'label' && (
            <LabelCaptureOverlay
              onCapture={() => captureLabel(cameraRef)}
              isAnalyzing={isAnalyzingLabel}
            />
          )}
        </>
      ) : (
        <VoiceInput
          onResult={(text) => {
            // Find a matching product by name
            const matchBarcode = MOCK_SCANNED_PRODUCTS.find(
              (p) => p.name.toLowerCase().includes(text.toLowerCase()),
            )?.barcode ?? '3456789012345';
            handleBarcodeScanned({ type: 'qr', data: matchBarcode } as never, 'voice');
          }}
        />
      )}

      {/* Top controls */}
      <SafeAreaView style={styles.topControls} edges={['top']}>
        <View style={styles.topRow}>
          <View style={styles.modeContainer}>
            <ScanModeSwitch mode={scanMode} onChange={setScanMode} />
          </View>
          {needsCamera && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFlash}
              hitSlop={12}
            >
              <Ionicons
                name={flashEnabled ? 'flash' : 'flash-off'}
                size={22}
                color={COLORS.surface}
              />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Instruction text when scanning barcode */}
      {isScanning && scanMode === 'barcode' && (
        <View style={styles.instructionContainer}>
          <Text variant="body" color={COLORS.surface} style={styles.instruction}>
            Placez le code-barres dans le cadre
          </Text>
        </View>
      )}

      {/* Bottom sheet result */}
      <BottomSheet visible={!!lastScanRecord} onClose={resetScan}>
        {lastScanRecord && (
          <ScanResult scan={lastScanRecord} onScanAgain={resetScan} />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeContainer: {
    flex: 1,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    fontSize: 14,
    fontWeight: '600',
  },
});
