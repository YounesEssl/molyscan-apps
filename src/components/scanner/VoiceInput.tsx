import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);

  const handlePress = () => {
    if (isListening) {
      setIsListening(false);
      // Simulate voice result
      setTimeout(() => onResult('Mobilux EP 2'), 500);
    } else {
      setIsListening(true);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="body" color={COLORS.surface} style={styles.instruction}>
        {isListening ? 'Écoute en cours...' : 'Appuyez pour dicter le nom du produit'}
      </Text>
      <TouchableOpacity
        style={[styles.micButton, isListening && styles.micActive]}
        onPress={handlePress}
      >
        <Ionicons
          name={isListening ? 'radio' : 'mic'}
          size={36}
          color={COLORS.surface}
        />
      </TouchableOpacity>
      {isListening && (
        <View style={styles.pulseRing} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  instruction: {
    textAlign: 'center',
    fontWeight: '600',
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
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.danger + '40',
    top: '50%',
    marginTop: -20,
  },
});
