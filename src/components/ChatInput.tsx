import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/settings';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onModelPress?: () => void;
}

export function ChatInput({ onSend, disabled, onModelPress }: Props) {
  const [text, setText] = useState('');
  const { apiConfigs, activeConfigIndex } = useSettingsStore();
  const current = apiConfigs[activeConfigIndex];
  const currentModel = current?.name || current?.model || '未配置';

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Reply to Claude..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={10000}
          editable={!disabled}
        />
        <View style={styles.toolbar}>
          <Pressable style={styles.plusButton}>
            <Text style={styles.plusIcon}>＋</Text>
          </Pressable>

          <Pressable style={styles.modelPill} onPress={onModelPress}>
            <Text style={styles.modelText} numberOfLines={1}>{currentModel}</Text>
          </Pressable>

          <View style={styles.rightButtons}>
            {text.trim() ? (
              <Pressable style={styles.sendButton} onPress={handleSend} disabled={disabled}>
                <Text style={styles.sendIcon}>↑</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.iconButton}>
                  <Text style={styles.micIcon}>🎙</Text>
                </Pressable>
                <Pressable style={styles.voiceButton}>
                  <Text style={styles.voiceIcon}>⦿</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: colors.background,
  },
  container: {
    backgroundColor: colors.inputBackground,
    borderRadius: 24,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    maxHeight: 120,
    minHeight: 28,
    paddingVertical: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.iconGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: 16,
    color: colors.iconGray,
    marginTop: -1,
  },
  modelPill: {
    backgroundColor: colors.surfaceHover,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    maxWidth: 180,
  },
  modelText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  rightButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.iconGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    fontSize: 16,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
