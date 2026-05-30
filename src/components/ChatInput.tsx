import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/settings';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  onModelPress?: () => void;
}

export function ChatInput({ onSend, disabled, isStreaming, onStop, onModelPress }: Props) {
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

  const handleStopOrSend = () => {
    if (isStreaming) {
      onStop?.();
    } else if (text.trim()) {
      handleSend();
    }
  };

  const getSendIcon = () => {
    if (isStreaming) return require('../../assets/stopsend.png');
    if (text.trim()) return require('../../assets/send2.png');
    return require('../../assets/send1.png');
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
          <Pressable style={styles.optionsButton}>
            <Image source={require('../../assets/optionsbutton.png')} style={styles.optionsImage} resizeMode="contain" />
          </Pressable>

          <Pressable style={styles.modelPill} onPress={onModelPress}>
            <Text style={styles.modelText} numberOfLines={1}>{currentModel}</Text>
          </Pressable>

          <View style={styles.rightButtons}>
            <Pressable style={styles.voiceButton}>
              <Image source={require('../../assets/voice.png')} style={styles.voiceImage} resizeMode="contain" />
            </Pressable>
            <Pressable style={styles.sendButton} onPress={handleStopOrSend}>
              <Image source={getSendIcon()} style={styles.sendImage} resizeMode="contain" />
            </Pressable>
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
  optionsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsImage: {
    width: 28,
    height: 28,
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
  voiceButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceImage: {
    width: 30,
    height: 30,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendImage: {
    width: 30,
    height: 30,
  },
});
