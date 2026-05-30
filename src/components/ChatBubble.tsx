import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Message } from '../types';
import { colors } from '../theme/colors';

interface Props {
  message: Message;
  isLastAssistant?: boolean;
}

export function ChatBubble({ message, isLastAssistant }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantContent}>
        <Markdown style={markdownStyles}>{message.content || ' '}</Markdown>
      </View>
      {message.content.length > 0 && (
        <View style={styles.actions}>
          <ActionIcon icon="⧉" />
          <ActionIcon icon="⤳" />
          <ActionIcon icon="▷" />
          <ActionIcon icon="△" />
          <ActionIcon icon="▽" />
          <ActionIcon icon="↻" />
        </View>
      )}
    </View>
  );
}

function ActionIcon({ icon, onPress }: { icon: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
    </Pressable>
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
    marginTop: 8,
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  actionIcon: {
    fontSize: 18,
    color: colors.iconGray,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  code_inline: {
    backgroundColor: colors.surface,
    color: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  fence: {
    backgroundColor: colors.codeBlock,
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
  },
  code_block: {
    color: colors.codeText,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  heading1: { fontSize: 22, fontWeight: '700', marginVertical: 8, color: colors.text },
  heading2: { fontSize: 18, fontWeight: '600', marginVertical: 6, color: colors.text },
  heading3: { fontSize: 16, fontWeight: '600', marginVertical: 4, color: colors.text },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.8,
  },
  list_item: { marginVertical: 2 },
  link: { color: colors.primary },
});
