import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, TextInput, Modal } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Message } from '../types';
import { colors } from '../theme/colors';
import { useChatStore } from '../stores/chat';
import { useSettingsStore } from '../stores/settings';
import { playTTS, stopTTS } from '../services/tts';

const chatIcons = [
  require('../../assets/chat1.png'),
  require('../../assets/chat2.png'),
  require('../../assets/chat3.png'),
  require('../../assets/chat4.png'),
  require('../../assets/chat5.png'),
  require('../../assets/chat6.png'),
];

interface Props {
  message: Message;
  isLastAssistant?: boolean;
}

export function ChatBubble({ message, isLastAssistant }: Props) {
  const isUser = message.role === 'user';
  const { messages, editMessage, removeMessage, regenerate } = useChatStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState('');
  const [editTarget, setEditTarget] = useState<'assistant' | 'user'>('assistant');

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const userMsgBefore = (() => {
    const idx = messages.findIndex((m) => m.id === message.id);
    if (idx > 0 && messages[idx - 1].role === 'user') return messages[idx - 1];
    return null;
  })();

  function handleAction(index: number) {
    switch (index) {
      case 0: // 编辑 AI 消息
        setEditTarget('assistant');
        setEditText(message.content);
        setEditModalVisible(true);
        break;
      case 1: // 删除 AI 消息
        Alert.alert('删除', '确定删除该 AI 消息？', [
          { text: '取消', style: 'cancel' },
          { text: '删除', style: 'destructive', onPress: () => removeMessage(message.id) },
        ]);
        break;
      case 2: // TTS 播放
        const ttsConfig = useSettingsStore.getState().ttsConfig;
        if (!ttsConfig.apiKey || !ttsConfig.groupId) {
          Alert.alert('提示', '请先在设置 > TTS 配置中填写 Group ID 和 API Key');
        } else {
          playTTS(message.content, ttsConfig).catch((e) =>
            Alert.alert('TTS 失败', e.message)
          );
        }
        break;
      case 3: // 编辑用户消息
        if (userMsgBefore) {
          setEditTarget('user');
          setEditText(userMsgBefore.content);
          setEditModalVisible(true);
        }
        break;
      case 4: // 删除用户消息
        if (userMsgBefore) {
          Alert.alert('删除', '确定删除该用户消息？', [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: () => removeMessage(userMsgBefore.id) },
          ]);
        }
        break;
      case 5: // 重新生成
        if (isLastAssistant) regenerate();
        break;
    }
  }

  function handleSaveEdit() {
    const targetId = editTarget === 'assistant' ? message.id : userMsgBefore?.id;
    if (targetId && editText.trim()) {
      editMessage(targetId, editText.trim());
    }
    setEditModalVisible(false);
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantContent}>
        <Markdown style={markdownStyles}>{message.content || ' '}</Markdown>
      </View>
      {message.content.length > 0 && (
        <>
          <View style={styles.actions}>
            {chatIcons.map((icon, i) => (
              <Pressable key={i} style={styles.actionButton} onPress={() => handleAction(i)}>
                <Image source={icon} style={styles.actionImage} />
              </Pressable>
            ))}
          </View>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/claudelogo.png')} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.disclaimerText}>
              Claude is AI and can make mistakes.{'\n'}Please double-check responses.
            </Text>
          </View>
        </>
      )}

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setEditModalVisible(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {editTarget === 'assistant' ? '编辑 AI 消息' : '编辑用户消息'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleSaveEdit}>
                <Text style={styles.modalConfirmText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '75%',
  },
  userText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  assistantRow: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  assistantContent: {
    maxWidth: '100%',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  actionButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  actionImage: {
    width: 16,
    height: 16,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'right',
    lineHeight: 16,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background, borderRadius: 16, padding: 24, width: '85%',
  },
  modalTitle: {
    fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, padding: 12, fontSize: 15, color: colors.text,
    minHeight: 100, maxHeight: 240, textAlignVertical: 'top', marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12,
  },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalCancelText: { fontSize: 15, color: colors.textSecondary },
  modalConfirm: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary,
  },
  modalConfirmText: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
});

const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, color: colors.text, lineHeight: 24 },
  code_inline: {
    backgroundColor: colors.surface, color: colors.primary,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontSize: 14, fontFamily: 'monospace',
  },
  fence: { backgroundColor: colors.codeBlock, borderRadius: 10, padding: 14, marginVertical: 10 },
  code_block: { color: colors.codeText, fontSize: 13, fontFamily: 'monospace' },
  heading1: { fontSize: 22, fontWeight: '700', marginVertical: 8, color: colors.text },
  heading2: { fontSize: 18, fontWeight: '600', marginVertical: 6, color: colors.text },
  heading3: { fontSize: 16, fontWeight: '600', marginVertical: 4, color: colors.text },
  blockquote: {
    borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, marginVertical: 8, opacity: 0.8,
  },
  list_item: { marginVertical: 2 },
  link: { color: colors.primary },
});
