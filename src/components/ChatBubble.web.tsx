import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message } from '../types';
import { fonts } from '../theme/fonts';
import { useThemeColors, type ThemeColors } from '../theme/colors';

interface Props {
  message: Message;
  previousUserMessage?: Message | null;
  isLastAssistant?: boolean;
  showAssistantFooter?: boolean;
  isHidden?: boolean;
  floorNumber?: number;
  showFloorNumber?: boolean;
  showAvatarHeader?: boolean;
  showBubbleTail?: boolean;
  onBubblePress?: (messageId: string) => void;
}

function stripThinking(content: string): string {
  return content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
}

export const ChatBubble = React.memo(function ChatBubble({
  message,
  isHidden,
  floorNumber,
  showFloorNumber,
  showAvatarHeader = true,
  onBubblePress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isUser = message.role === 'user';
  const body = stripThinking(message.content || '') || (message.role === 'tool' ? '[tool result]' : '');

  if (isHidden) {
    return (
      <Pressable style={styles.hiddenRow} onPress={() => onBubblePress?.(message.id)}>
        <Text style={styles.hiddenText}>已隐藏的消息</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}
      onPress={() => onBubblePress?.(message.id)}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {showAvatarHeader && (
          <Text style={styles.roleText}>
            {isUser ? 'You' : message.role === 'assistant' ? 'Claude' : message.role}
            {showFloorNumber && floorNumber !== undefined ? ` · #${floorNumber}` : ''}
          </Text>
        )}
        <Text style={[styles.contentText, isUser ? styles.userText : styles.assistantText]}>
          {body}
        </Text>
      </View>
    </Pressable>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      width: '100%',
      paddingHorizontal: 16,
      marginVertical: 6,
    },
    userRow: {
      alignItems: 'flex-end',
    },
    assistantRow: {
      alignItems: 'flex-start',
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    userBubble: {
      backgroundColor: colors.userBubble,
    },
    assistantBubble: {
      backgroundColor: colors.inputBackground,
    },
    roleText: {
      marginBottom: 6,
      color: colors.textTertiary,
      fontSize: 12,
      fontFamily: fonts.sans,
    },
    contentText: {
      fontSize: 16,
      lineHeight: 24,
      fontFamily: fonts.sans,
    },
    userText: {
      color: colors.text,
    },
    assistantText: {
      color: colors.text,
    },
    hiddenRow: {
      alignSelf: 'center',
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
    },
    hiddenText: {
      color: colors.textTertiary,
      fontSize: 12,
    },
  });
}
