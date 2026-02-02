import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface VoiceInputProps {
  onResult: (text: string) => void;
}

// Simulated progressive transcription
const MOCK_DICTATIONS = [
  { partial: 'Mobilux...', full: 'Mobilux EP 2' },
  { partial: 'Total Carter...', full: 'Total Carter EP 220' },
  { partial: 'Shell Tellus...', full: 'Shell Tellus S2 MX 46' },
  { partial: 'Castrol Hyspin...', full: 'Castrol Hyspin AWH-M 68' },
];

export const VoiceInput: React.FC<VoiceInputProps> = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'listening' | 'processing'>('idle');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isListening) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => {
      animRef.current?.stop();
    };
  }, [isListening, pulseAnim]);

  const handlePress = () => {
    if (isListening) {
      // Stop and process
      setIsListening(false);
      setPhase('processing');
      const dictation = MOCK_DICTATIONS[Math.floor(Math.random() * MOCK_DICTATIONS.length)];
      setDisplayText(dictation.full);
      // Auto-search after showing full text
      setTimeout(() => {
        setPhase('idle');
        setDisplayText('');
        onResult(dictation.full);
      }, 1200);
    } else {
      // Start listening
      setIsListening(true);
      setPhase('listening');
      setDisplayText('');
      // Simulate progressive transcription
      const dictation = MOCK_DICTATIONS[Math.floor(Math.random() * MOCK_DICTATIONS.length)];
      setTimeout(() => setDisplayText(dictation.partial), 800);
    }
  };

  return (
    <View style={styles.container}>
      {/* Transcription display */}
      {displayText ? (
        <View style={styles.transcriptBox}>
          <Text variant="body" color={COLORS.surface} style={styles.transcriptText}>
            {displayText}
          </Text>
          {phase === 'processing' && (
            <Text variant="caption" color={COLORS.accent} style={styles.searchingText}>
              Recherche en cours...
            </Text>
          )}
        </View>
      ) : (
        <Text variant="body" color={COLORS.surface} style={styles.instruction}>
          {isListening
            ? 'Dictez le nom du produit...'
            : 'Appuyez pour dicter le nom du produit'}
        </Text>
      )}

      {/* Waveform visualization */}
      {isListening && (
        <View style={styles.waveform}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                { height: 6 + Math.random() * 28 },
              ]}
            />
          ))}
        </View>
      )}

      {/* Mic button */}
      <Animated.View style={[styles.pulseWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micActive]}
          onPress={handlePress}
        >
          <Ionicons
            name={isListening ? 'stop' : 'mic'}
            size={36}
            color={COLORS.surface}
          />
        </TouchableOpacity>
      </Animated.View>

      {isListening && (
        <Text variant="caption" color="rgba(255,255,255,0.5)" style={styles.hint}>
          Appuyez à nouveau pour arrêter
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  instruction: {
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: SPACING.xl,
  },
  transcriptBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.xl,
  },
  transcriptText: {
    fontWeight: '700',
    fontSize: 20,
    textAlign: 'center',
  },
  searchingText: {
    fontWeight: '600',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 36,
    paddingHorizontal: SPACING.xl,
  },
  waveBar: {
    width: 3,
    backgroundColor: COLORS.accent + '80',
    borderRadius: 2,
  },
  pulseWrapper: {
    borderRadius: 50,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: {
    backgroundColor: COLORS.danger,
  },
  hint: {
    textAlign: 'center',
  },
});
