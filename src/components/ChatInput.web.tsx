import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts } from '../theme/fonts';
import { useThemeColors, type ThemeColors } from '../theme/colors';

interface Props {
  onSend: (text: string, imageUri?: string, imageGenerationReferenceUris?: string[]) => void | Promise<void>;
  onSendVoice?: (recording: { uri: string; durationMs: number; mimeType?: string }) => void | Promise<void>;
  onTriggerResponse: () => void | Promise<void>;
  onEnableWebCruise?: () => void | Promise<void>;
  onAttachFile?: () => void | Promise<unknown>;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  onModelPress?: () => void;
}

export function ChatInput({
  onSend,
  onTriggerResponse,
  disabled,
  isStreaming,
  onStop,
  onModelPress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = text.trim().length > 0 && !disabled && !sending;

  async function handleSend() {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    setSending(true);
    try {
      await onSend(value);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.panel}>
        <Pressable style={styles.modelButton} onPress={onModelPress}>
          <Text style={styles.modelText}>Model</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.textTertiary}
          multiline
          editable={!disabled && !sending}
          style={styles.input}
          onSubmitEditing={() => void handleSend()}
        />
        {isStreaming ? (
          <Pressable style={styles.sendButton} onPress={onStop}>
            <Text style={styles.sendText}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={!canSend}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        )}
      </View>
      <Pressable style={styles.responseButton} onPress={() => void onTriggerResponse()} disabled={disabled}>
        <Text style={styles.responseText}>Trigger response</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 14,
      paddingBottom: 18,
      gap: 8,
    },
    panel: {
      minHeight: 58,
      borderRadius: 24,
      backgroundColor: colors.inputBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    modelButton: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: 10,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    modelText: {
      color: colors.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 13,
    },
    input: {
      flex: 1,
      minHeight: 38,
      maxHeight: 140,
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: fonts.sans,
      paddingHorizontal: 4,
      paddingVertical: 8,
      outlineStyle: 'none' as any,
    },
    sendButton: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.text,
    },
    sendButtonDisabled: {
      opacity: 0.32,
    },
    sendText: {
      color: colors.background,
      fontFamily: fonts.sans,
      fontSize: 13,
      fontWeight: '600',
    },
    responseButton: {
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
    },
    responseText: {
      color: colors.textTertiary,
      fontSize: 12,
      fontFamily: fonts.sans,
    },
  });
}
