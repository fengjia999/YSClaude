import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/settings';

interface Props {
  onSend: (text: string) => void;          // 仅发送用户消息（回车触发），不调 API
  onTriggerResponse: () => void;            // 触发 AI 回复（发送按钮触发）
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  onModelPress?: () => void;
}

export function ChatInput({ onSend, onTriggerResponse, disabled, isStreaming, onStop, onModelPress }: Props) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const { apiConfigs, activeConfigIndex } = useSettingsStore();
  const current = apiConfigs[activeConfigIndex];
  const currentModel = current?.name || current?.model || '未配置';

  // 回车：仅把用户消息加入列表，不触发 AI 回复
  const handleSend = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  // 文本变化：检测「在末尾新增了一个换行符」→ 视为回车发送。
  // 不直接拦截按键（Android multiline 无法可靠阻止默认换行），
  // 而是在换行进入 state 前把它当作发送信号处理，避免残留换行。
  const handleChangeText = (next: string) => {
    // 仅当新文本比旧文本恰好多了一个尾部 \n 时才触发，
    // 避免粘贴多行文本时误发送。
    if (
      next.length === text.length + 1 &&
      next.startsWith(text) &&
      next.endsWith('\n')
    ) {
      handleSend(text);
      return;
    }
    setText(next);
  };

  // 发送按钮：触发 AI 回复。有文字时先发消息再触发，无文字时直接触发
  const handleStopOrSend = () => {
    if (isStreaming) {
      onStop?.();
      return;
    }
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText('');
    }
    onTriggerResponse();
  };

  const getSendIcon = () => {
    if (isStreaming) return require('../../assets/stopsend.png');
    if (text.trim()) return require('../../assets/send2.png');
    return require('../../assets/send1.png');
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChangeText}
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
    fontFamily: 'Sohne',
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
