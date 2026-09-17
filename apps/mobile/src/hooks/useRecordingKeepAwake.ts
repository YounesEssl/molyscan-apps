import { useEffect, useId } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/** Prevent auto-lock (often 30 seconds) from interrupting a foreground recording. */
export function useRecordingKeepAwake(recording: boolean): void {
  const tag = useId();
  useEffect(() => {
    if (!recording) return;
    let disposed = false;
    void activateKeepAwakeAsync(tag).then(() => {
      if (disposed) return deactivateKeepAwake(tag);
    }).catch(() => {});
    return () => {
      disposed = true;
      void deactivateKeepAwake(tag).catch(() => {});
    };
  }, [recording, tag]);
}
