import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  AudioModule,
  useAudioRecorder,
  RecordingPresets,
} from 'expo-audio';
import { api } from '@/lib/axios';
import { logger } from '@/lib/logger';
import { haptic } from '@/lib/haptics';

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
  const [state, setState] = useState<VoiceInputState>('idle');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        haptic.warning();
        Alert.alert(
          'Permission required',
          'Please allow microphone access in settings.',
        );
        return;
      }

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
  }, [recorder]);

  const stopAndTranscribe = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsed = duration;
    setState('transcribing');

    try {
      await recorder.stop();
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

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'speech.m4a',
      } as unknown as Blob);

      const response = await api.post<{ transcription: string }>(
        '/chat/transcribe',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        },
      );

      const text = response.data.transcription?.trim() ?? '';
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
    setState('idle');
    setDuration(0);
  }, [state, recorder]);

  return { state, duration, toggle, cancel };
}
