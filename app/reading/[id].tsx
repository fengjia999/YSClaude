import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import { ReadingBook, ReadingMessage } from '../../src/types';
import {
  getReadingBook,
  getReadingMessages,
  insertReadingMessage,
  updateReadingBook,
  updateReadingMessageContent,
} from '../../src/db/operations';
import { streamChat } from '../../src/services/api';
import { useSettingsStore } from '../../src/stores/settings';

const CHAT_PANEL_HEIGHT = 250;

export default function ReadingBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const readingConfig = useSettingsStore((state) => state.readingConfig);
  const [book, setBook] = useState<ReadingBook | null>(null);
  const [messages, setMessages] = useState<ReadingMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(1);
  const viewportHeightRef = useRef(1);
  const readingOffsetRef = useRef(0);
  const didRestoreScrollRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function load() {
        if (!id) return;
        setLoading(true);
        const [nextBook, nextMessages] = await Promise.all([
          getReadingBook(id),
          getReadingMessages(id),
        ]);
        if (!mounted) return;
        setBook(nextBook);
        setMessages(nextMessages);
        readingOffsetRef.current = nextBook?.readingOffset || 0;
        didRestoreScrollRef.current = false;
        setError(null);
        setLoading(false);
      }
      load();
      return () => {
        mounted = false;
      };
    }, [id])
  );

  const currentChapter = useMemo(() => {
    if (!book || book.chapters.length === 0) return null;
    const offset = readingOffsetRef.current;
    let chapter = book.chapters[0];
    for (const item of book.chapters) {
      if (item.start <= offset) chapter = item;
      else break;
    }
    return chapter;
  }, [book, readingOffsetRef.current]);

  function handleContentSizeChange(_width: number, height: number) {
    contentHeightRef.current = Math.max(1, height);
    if (!book || didRestoreScrollRef.current || book.readingOffset <= 0 || book.text.length <= 0) {
      return;
    }
    didRestoreScrollRef.current = true;
    const scrollableHeight = Math.max(1, height - viewportHeightRef.current);
    const y = (book.readingOffset / book.text.length) * scrollableHeight;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: false });
    });
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!book) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    viewportHeightRef.current = Math.max(1, layoutMeasurement.height);
    contentHeightRef.current = Math.max(1, contentSize.height);
    const endY = Math.min(contentOffset.y + layoutMeasurement.height, contentSize.height);
    const ratio = contentSize.height > 0 ? endY / contentSize.height : 0;
    readingOffsetRef.current = clamp(Math.round(book.text.length * ratio), 0, book.text.length);
  }

  async function persistReadingOffset() {
    if (!book) return;
    const nextOffset = readingOffsetRef.current;
    if (Math.abs(nextOffset - book.readingOffset) < 20) return;
    await updateReadingBook(book.id, {
      readingOffset: nextOffset,
      updatedAt: Date.now(),
    });
    setBook({ ...book, readingOffset: nextOffset, updatedAt: Date.now() });
  }

  async function handleSend() {
    const content = input.trim();
    if (!book || !content || isStreaming) return;

    if (!readingConfig.baseUrl || !readingConfig.apiKey || !readingConfig.model) {
      setError('请先在共读设置中配置 API');
      return;
    }

    setInput('');
    setError(null);
    setIsStreaming(true);

    const userMessage: ReadingMessage = {
      id: randomUUID(),
      bookId: book.id,
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    const assistantMessage: ReadingMessage = {
      id: randomUUID(),
      bookId: book.id,
      role: 'assistant',
      content: '',
      createdAt: Date.now() + 1,
    };

    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage, assistantMessage];
    setMessages(nextMessages);

    await insertReadingMessage(userMessage);
    await insertReadingMessage(assistantMessage);
    await persistReadingOffset();

    const source = buildSourceExcerpt(book.text, readingOffsetRef.current, readingConfig.sourceCharLimit);
    const recentMessages = previousMessages.slice(-readingConfig.conversationMessageLimit);
    const systemContent = [
      readingConfig.systemPrompt,
      '',
      `书名：${book.title || '未命名书籍'}`,
      `作者：${book.author || '未知作者'}`,
      '',
      `当前阅读位置向前截取的原文：\n${source || '（暂无可用原文）'}`,
    ].join('\n');

    try {
      let assistantContent = '';
      await streamChat(
        {
          baseUrl: readingConfig.baseUrl,
          apiKey: readingConfig.apiKey,
          model: readingConfig.model,
          messages: [
            { role: 'system', content: systemContent },
            ...recentMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            { role: 'user', content },
          ],
        },
        (token) => {
          assistantContent += token;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: assistantContent }
                : message
            )
          );
        }
      );
      await updateReadingMessageContent(assistantMessage.id, assistantContent);
      await updateReadingBook(book.id, { updatedAt: Date.now() });
    } catch (err: any) {
      const message = err?.message || '请求失败';
      setError(message);
      await updateReadingMessageContent(assistantMessage.id, message);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id ? { ...item, content: message } : item
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>没有找到这本书</Text>
        <Pressable style={styles.backButtonPill} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>返回书架</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title} numberOfLines={1}>{book.title || '未命名书籍'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentChapter?.title || book.author || 'AI 共读'}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.reader}
        contentContainerStyle={styles.readerContent}
        onScroll={handleScroll}
        onScrollEndDrag={persistReadingOffset}
        onMomentumScrollEnd={persistReadingOffset}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={48}
      >
        <Text style={styles.bookHeading}>{book.title || '未命名书籍'}</Text>
        {!!book.author && <Text style={styles.bookSubheading}>{book.author}</Text>}
        <Text style={styles.bodyText}>{book.text}</Text>
      </ScrollView>

      <View style={styles.chatPanel}>
        <ScrollView style={styles.messageList} contentContainerStyle={styles.messageListContent}>
          {messages.length === 0 ? (
            <Text style={styles.chatEmpty}>读到哪里，就从哪里问起。</Text>
          ) : (
            messages.slice(-6).map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={styles.messageRole}>{message.role === 'user' ? '你' : 'AI'}</Text>
                <Text style={styles.messageText}>
                  {message.content || (isStreaming && message.role === 'assistant' ? '正在思考…' : '')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="和 AI 讨论这一段..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (!input.trim() || isStreaming) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>发送</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function buildSourceExcerpt(text: string, rawOffset: number, limit: number): string {
  const end = rawOffset > 0 ? rawOffset : Math.min(text.length, limit);
  const start = Math.max(0, end - Math.max(1, limit));
  return text.slice(start, end).trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  backIcon: { fontSize: 28, color: colors.text, lineHeight: 30 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, maxWidth: '90%' },
  subtitle: { marginTop: 2, fontSize: 12, color: colors.textTertiary, maxWidth: '90%' },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
  },
  errorText: { fontSize: 13, color: colors.danger },
  reader: { flex: 1 },
  readerContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: CHAT_PANEL_HEIGHT + 36,
  },
  bookHeading: {
    fontSize: 28,
    color: colors.text,
    fontFamily: fonts.serifBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  bookSubheading: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 28,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 31,
    color: colors.text,
    fontFamily: fonts.serif,
  },
  chatPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: CHAT_PANEL_HEIGHT,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  messageList: { flex: 1 },
  messageListContent: { paddingBottom: 8, gap: 8 },
  chatEmpty: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingTop: 28,
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '92%',
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primaryLight },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  messageRole: { fontSize: 11, color: colors.textTertiary, marginBottom: 3, fontWeight: '600' },
  messageText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  chatInput: {
    flex: 1,
    maxHeight: 76,
    minHeight: 42,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 58,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 15, color: colors.textTertiary, marginBottom: 16 },
  backButtonPill: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
