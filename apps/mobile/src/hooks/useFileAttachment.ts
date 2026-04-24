import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { API_CONFIG } from '@/constants/api';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { haptic } from '@/lib/haptics';
import { Alert } from 'react-native';

export interface Attachment {
  id: string;
  name: string;
}

interface UseFileAttachmentReturn {
  attachment: Attachment | null;
  uploading: boolean;
  pick: () => Promise<void>;
  clear: () => void;
}

export function useFileAttachment(): UseFileAttachmentReturn {
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);

  const pick = useCallback(async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];

      setUploading(true);
      haptic.medium();

      // A real PDF is always larger than 1 KB. 235-byte "PDFs" are Android cloud
      // metadata wrappers (Google Drive, OneDrive…) — the file isn't local yet.
      if (file.size !== undefined && file.size < 1024) {
        Alert.alert(
          'Fichier non disponible',
          'Ce PDF n\'est pas encore téléchargé sur l\'appareil. Ouvrez-le d\'abord dans votre application de fichiers pour le rendre disponible hors-ligne, puis réessayez.',
        );
        return;
      }

      const response = await fetch(file.uri);
      if (!response.ok && response.status !== 0) {
        throw new Error(`Failed to fetch file: HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onloadend = () => {
          const dataUrl = fr.result as string;
          const b64 = dataUrl.split(',')[1];
          b64 ? resolve(b64) : reject(new Error('Empty base64 from FileReader'));
        };
        fr.onerror = () => reject(new Error('FileReader failed'));
        fr.readAsDataURL(blob);
      });

      const token = await storage.getToken();
      const attachmentId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_CONFIG.baseURL}/chat/attachments`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 30000;

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const envelope = JSON.parse(xhr.responseText) as {
                data: { attachmentId: string };
              };
              resolve(envelope.data.attachmentId);
            } catch {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            reject(new Error(`Upload failed: HTTP ${xhr.status} — ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.send(JSON.stringify({
          filename: file.name ?? 'document.pdf',
          mediaType: 'application/pdf',
          base64,
        }));
      });

      haptic.success();
      setAttachment({ id: attachmentId, name: file.name ?? 'document.pdf' });
    } catch (error) {
      haptic.error();
      logger.error('File attachment failed', error);
      Alert.alert('Erreur', 'Impossible de joindre le fichier.');
    } finally {
      setUploading(false);
    }
  }, []);

  const clear = useCallback((): void => {
    setAttachment(null);
  }, []);

  return { attachment, uploading, pick, clear };
}
