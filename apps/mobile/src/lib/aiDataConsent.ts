import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';

const CONSENT_KEY_PREFIX = 'ai_data_sharing_consent_v1';

function consentKey(): string {
  const userId = useAuthStore.getState().user?.id ?? 'signed_out';
  const safeUserId = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${CONSENT_KEY_PREFIX}_${safeUserId}`;
}

export async function hasAiDataConsent(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(consentKey())) === 'granted';
  } catch {
    // A storage failure must never result in data being sent without consent.
    return false;
  }
}

export async function grantAiDataConsent(): Promise<void> {
  await SecureStore.setItemAsync(consentKey(), 'granted');
}

export async function revokeAiDataConsent(): Promise<void> {
  await SecureStore.deleteItemAsync(consentKey());
}
