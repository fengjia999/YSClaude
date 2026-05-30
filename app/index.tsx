import React, { useRef, useEffect, useState } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useChatStore } from '../src/stores/chat';
import { ChatBubble } from '../src/components/ChatBubble';
import { ChatInput } from '../src/components/ChatInput';
import { ModelSelector } from '../src/components/ModelSelector';
import { Message } from '../src/types';

export default function ChatScreen() {
  const router = useRouter();
  const { messages, isStreaming, error, sendMessage, stopStreaming } = useChatStore();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.push('/history')}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </Pressable>
        <Pressable style={styles.headerButton} onPress={() => router.push('/settings')}>
          <Text style={styles.menuIcon}>⋯</Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ChatBubble
            message={item}
            isLastAssistant={
              item.role === 'assistant' &&
              index === messages.length - 1
            }
          />
        )}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<EmptyState />}
      />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isStreaming}
        isStreaming={isStreaming}
        onStop={stopStreaming}
        onModelPress={() => setShowModelSelector(true)}
      />

      {showModelSelector && (
        <ModelSelector onClose={() => setShowModelSelector(false)} />
      )}
    </KeyboardAvoidingView>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Image source={require('../assets/claudelogo.png')} style={styles.emptyLogo} resizeMode="contain" />
      <Text style={styles.emptyText}>有什么我可以帮你的吗？</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: colors.text,
  },
  menuIcon: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyLogo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
});
