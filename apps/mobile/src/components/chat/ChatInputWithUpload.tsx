import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Plain2 } from 'react-native-solar-icons/icons/bold';
import { ClipboardText } from 'react-native-solar-icons/icons/bold-duotone';
import { CloseCircle } from 'react-native-solar-icons/icons/bold';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '@/constants/theme';

interface ChatInputWithUploadProps {
  onSend: (text: string, attachments?: any[]) => void;
  disabled?: boolean;
}

interface Attachment {
  name: string;
  type: string;
  uri: string;
}

export const ChatInputWithUpload: React.FC<ChatInputWithUploadProps> = ({
  onSend,
  disabled,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return;
    onSend(text.trim(), attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
  };

  const pickFile = () => {
    Alert.alert('Joindre un fichier', undefined, [
      {
        text: 'Photo / Caméra',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: false,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const name = asset.fileName || `photo-${Date.now()}.jpg`;
            setAttachments((prev) => [
              ...prev,
              { name, type: asset.mimeType || 'image/jpeg', uri: asset.uri },
            ]);
          }
        },
      },
      {
        text: 'Document PDF',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setAttachments((prev) => [
              ...prev,
              { name: asset.name, type: asset.mimeType || 'application/pdf', uri: asset.uri },
            ]);
          }
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = (text.trim() || attachments.length > 0) && !disabled;

  return (
    <View style={styles.wrapper}>
      {/* Attachment preview */}
      {attachments.length > 0 && (
        <View style={styles.attachments}>
          {attachments.map((att, i) => (
            <View key={`${att.name}-${i}`} style={styles.attachmentChip}>
              {att.type.startsWith('image/') ? (
                <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
              ) : (
                <View style={styles.pdfIcon}>
                  <Text variant="caption" color={COLORS.accent} style={{ fontWeight: '700', fontSize: 10 }}>
                    PDF
                  </Text>
                </View>
              )}
              <Text
                variant="caption"
                color={COLORS.textSecondary}
                numberOfLines={1}
                style={styles.attachmentName}
              >
                {att.name}
              </Text>
              <TouchableOpacity onPress={() => removeAttachment(i)} hitSlop={8}>
                <CloseCircle size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.container}>
        {/* Upload button */}
        <TouchableOpacity
          onPress={pickFile}
          disabled={disabled}
          style={[styles.iconButton, disabled && styles.disabled]}
          hitSlop={8}
        >
          <ClipboardText size={22} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={styles.input}
          placeholder="Posez votre question..."
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          editable={!disabled}
        />

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Plain2 size={20} color={COLORS.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachmentThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  pdfIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: {
    maxWidth: 120,
    fontSize: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    maxHeight: 100,
    fontWeight: '500',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
