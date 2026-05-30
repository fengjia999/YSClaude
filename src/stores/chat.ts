import { create } from 'zustand';
import { Message, Conversation } from '../types';
import { randomUUID } from 'expo-crypto';
import { streamChat } from '../services/api';
import { useSettingsStore } from './settings';
import {
  createConversation,
  updateConversation,
  insertMessage,
  updateMessageContent,
  deleteMessage,
  getMessagesByConversation,
} from '../db/operations';

interface ChatState {
  conversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  newConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
  editMessage: (id: string, content: string) => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  regenerate: () => Promise<void>;
}

let abortController: AbortController | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  error: null,

  sendMessage: async (content: string) => {
    const { isStreaming } = get();
    if (isStreaming) return;

    let { conversationId } = get();
    const settings = useSettingsStore.getState();
    if (!settings._hydrated) return;
    const config = settings.apiConfigs[settings.activeConfigIndex];

    if (!config || !config.baseUrl || !config.apiKey) {
      set({ error: '请先在设置中配置 API' });
      return;
    }

    if (!conversationId) {
      conversationId = randomUUID();
      const now = Date.now();
      const conv: Conversation = {
        id: conversationId,
        title: content.slice(0, 30),
        systemPrompt: settings.systemPrompt,
        model: config.model,
        createdAt: now,
        updatedAt: now,
      };
      await createConversation(conv);
      set({ conversationId });
    }

    const userMessage: Message = {
      id: randomUUID(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      error: null,
    }));

    await insertMessage(conversationId, userMessage);

    const assistantMessage: Message = {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
    }));

    await insertMessage(conversationId, assistantMessage);

    const allMessages = get().messages;
    const apiMessages = allMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1)
      .filter((_, index) => {
        const msgNum = index + 1;
        return !settings.hiddenRanges.some(
          (r) => msgNum >= r.from && msgNum <= r.to
        );
      })
      .map((m) => ({ role: m.role, content: m.content }));

    abortController = new AbortController();

    try {
      await streamChat(
        {
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
          messages: [
            { role: 'system', content: settings.systemPrompt },
            ...apiMessages,
          ],
          maxTokens: settings.maxOutputTokens || undefined,
        },
        (token) => {
          set((state) => {
            const msgs = [...state.messages];
            const last = msgs[msgs.length - 1];
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, content: last.content + token };
            }
            return { messages: msgs };
          });
        },
        abortController.signal
      );

      const finalMessages = get().messages;
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        await updateMessageContent(lastMsg.id, lastMsg.content);
      }

      await updateConversation(conversationId, { updatedAt: Date.now() });

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        set({ error: err.message || '请求失败' });
      }
      const finalMessages = get().messages;
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        await updateMessageContent(lastMsg.id, lastMsg.content);
      }
    } finally {
      set({ isStreaming: false });
      abortController = null;
    }
  },

  stopStreaming: () => {
    abortController?.abort();
    set({ isStreaming: false });
  },

  newConversation: () => {
    set({ conversationId: null, messages: [], error: null });
  },

  loadConversation: async (id: string) => {
    const messages = await getMessagesByConversation(id);
    set({ conversationId: id, messages, error: null });
  },

  setError: (error) => set({ error }),

  editMessage: async (id: string, content: string) => {
    await updateMessageContent(id, content);
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    }));
  },

  removeMessage: async (id: string) => {
    await deleteMessage(id);
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },

  regenerate: async () => {
    const { messages, conversationId, isStreaming } = get();
    if (isStreaming || !conversationId) return;

    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;
    const userMsg = messages[messages.length - 1 - lastUserIndex];

    const lastAssistant = messages[messages.length - 1];
    if (lastAssistant && lastAssistant.role === 'assistant') {
      await deleteMessage(lastAssistant.id);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== lastAssistant.id),
      }));
    }

    const settings = useSettingsStore.getState();
    const config = settings.apiConfigs[settings.activeConfigIndex];
    if (!config || !config.baseUrl || !config.apiKey) {
      set({ error: '请先在设置中配置 API' });
      return;
    }

    const assistantMessage: Message = {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
      isStreaming: true,
      error: null,
    }));

    await insertMessage(conversationId, assistantMessage);

    const allMessages = get().messages;
    const apiMessages = allMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1)
      .filter((_, index) => {
        const msgNum = index + 1;
        return !settings.hiddenRanges.some(
          (r) => msgNum >= r.from && msgNum <= r.to
        );
      })
      .map((m) => ({ role: m.role, content: m.content }));

    abortController = new AbortController();

    try {
      await streamChat(
        {
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
          messages: [
            { role: 'system', content: settings.systemPrompt },
            ...apiMessages,
          ],
          maxTokens: settings.maxOutputTokens || undefined,
        },
        (token) => {
          set((state) => {
            const msgs = [...state.messages];
            const last = msgs[msgs.length - 1];
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, content: last.content + token };
            }
            return { messages: msgs };
          });
        },
        abortController.signal
      );

      const finalMessages = get().messages;
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        await updateMessageContent(lastMsg.id, lastMsg.content);
      }
      await updateConversation(conversationId, { updatedAt: Date.now() });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        set({ error: err.message || '请求失败' });
      }
      const finalMessages = get().messages;
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        await updateMessageContent(lastMsg.id, lastMsg.content);
      }
    } finally {
      set({ isStreaming: false });
      abortController = null;
    }
  },
}));
