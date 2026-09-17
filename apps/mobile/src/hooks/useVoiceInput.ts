import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  AudioModule,
  useAudioRecorder,
  RecordingPresets,
} from 'expo-audio';
import { transcribeAudio } from '@/services/transcription.service';
import { useRecordingKeepAwake } from './useRecordingKeepAwake';
import { logger } from '@/lib/logger';
import { haptic } from '@/lib/haptics';
import { useAiDataConsent } from '@/providers/AiDataConsentProvider';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing';

interface UseVoiceInputReturn {
  state: VoiceInputState;
  duration: number;
  toggle: () => Promise<void>;
  cancel: () => Promise<void>;
}

interface UseVoiceInputOptions {
  /** Called when transcription succeeds — caller injects the text into their input */
  onTranscription: (text: string) => void;
  /** Minimum recording duration (seconds) before a stop actually sends; shorter = discarded. */
  minDurationSec?: number;
}

/**
 * Press-once-to-start / press-again-to-stop voice dictation for chat input.
 * Records via expo-audio, uploads audio to `POST /chat/transcribe`, and
 * delivers the transcribed text back to the caller.
 */
export function useVoiceInput({
  onTranscription,
  minDurationSec = 1,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { requestConsent } = useAiDataConsent();
  const [state, setState] = useState<VoiceInputState>('idle');
  useRecordingKeepAwake(state !== 'idle');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      if (!(await requestConsent())) return;

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        haptic.warning();
        Alert.alert(
          'Permission required',
          'Please allow microphone access in settings.',
        );
        return;
      }

      // iOS requires recording mode to be explicitly enabled; also initialises
      // the output file path so recorder.uri is available after stop (Android).
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();

      haptic.medium();
      recorder.record();
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      haptic.error();
      logger.error('Voice input start failed', error);
      setState('idle');
    }
  }, [recorder, requestConsent]);

  const stopAndTranscribe = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsed = duration;
    setState('transcribing');

    try {
      await recorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
      const uri = recorder.uri;
      if (!uri) {
        throw new Error('No recording URI');
      }

      // Too short — drop silently, no transcription call
      if (elapsed < minDurationSec) {
        setState('idle');
        setDuration(0);
        return;
      }

      const transcription = await transcribeAudio(uri);

      const text = transcription;
      if (text) {
        haptic.success();
        onTranscription(text);
      } else {
        haptic.warning();
        Alert.alert('No text detected', 'Try speaking more clearly.');
      }
    } catch (error) {
      haptic.error();
      logger.error('Voice input transcribe failed', error);
      Alert.alert('Error', 'Transcription failed.');
    } finally {
      setState('idle');
      setDuration(0);
    }
  }, [recorder, duration, minDurationSec, onTranscription]);

  const toggle = useCallback(async (): Promise<void> => {
    if (state === 'idle') {
      await startRecording();
    } else if (state === 'recording') {
      await stopAndTranscribe();
    }
    // 'transcribing' state: ignore taps while we're processing
  }, [state, startRecording, stopAndTranscribe]);

  const cancel = useCallback(async (): Promise<void> => {
    if (state !== 'recording') return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorder.stop();
    } catch {
      // silent: cancel path, recorder may already be stopped
    }
    await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
    setState('idle');
    setDuration(0);
  }, [state, recorder]);

  return { state, duration, toggle, cancel };
}
