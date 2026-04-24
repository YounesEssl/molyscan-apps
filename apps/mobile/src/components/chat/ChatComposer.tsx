import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AddCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { Stop } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ChatComposerProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  onAddPress?: () => void;
  placeholder?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Inline composer — NO absolute positioning. Parent screen wraps this
 * in a KeyboardAvoidingView so it rises with the keyboard naturally.
 *
 * Mic button: press to start dictation, press again to stop → API transcribes
 * and fills the input with the spoken text.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  disabled = false,
  onAddPress,
  placeholder = 'Ask your question…',
}: ChatComposerProps): React.JSX.Element {
  // Append dictation to the current input (or replace if empty) so users
  // can mix typing and voice.
  const handleTranscription = useCallback(
    (text: string) => {
      onChangeText(value ? `${value.trimEnd()} ${text}` : text);
    },
    [value, onChangeText],
  );

  const voice = useVoiceInput({ onTranscription: handleTranscription });
  const isRecording = voice.state === 'recording';
  const isTranscribing = voice.state === 'transcribing';

  return (
    <View style={styles.wrapper}>
      <View style={styles.composer}>
        <TouchableOpacity
          style={styles.plusBtn}
          activeOpacity={0.7}
          onPress={onAddPress}
          accessibilityRole="button"
          accessibilityLabel="Add"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AddCircle size={16} color={colors.ink} />
        </TouchableOpacity>

        {isRecording ? (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <RNText style={styles.recordingText}>
              Recording · {formatDuration(voice.duration)}
            </RNText>
          </View>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={isTranscribing ? 'Transcribing…' : placeholder}
            placeholderTextColor={colors.ink2}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={() => {
              haptic.medium();
              onSubmit();
            }}
            returnKeyType="send"
            multiline={false}
            blurOnSubmit={false}
            editable={!isTranscribing}
          />
        )}

        <TouchableOpacity
          onPress={() => void voice.toggle()}
          activeOpacity={0.8}
          disabled={disabled || isTranscribing}
          accessibilityRole="button"
          accessibilityLabel={
            isRecording ? 'Stop dictation' : 'Dictate a message'
          }
          accessibilityState={{
            selected: isRecording,
            busy: isTranscribing,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <LinearGradient
            colors={
              isRecording
                ? [colors.redVivid, colors.red]
                : [colors.purpleVivid, colors.purple]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.micBtn}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isRecording ? (
              <Stop size={16} color="#fff" />
            ) : (
              <Microphone2 size={16} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.paper1,
  },
  composer: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.ink4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 6,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(26,20,16,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    // Subtle halo so it reads as "live recording"
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 2,
  },
  recordingText: {
    fontFamily: typography.fonts.sansMedium,
    fontSize: 13,
    color: colors.red,
    letterSpacing: -0.1,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#5b2dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
