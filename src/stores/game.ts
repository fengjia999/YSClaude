import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { randomUUID } from 'expo-crypto';
import { sqliteStorage } from '../db/kv-storage';
import { streamChat } from '../services/api';

export type GameActorType = 'narrator' | 'summary' | 'character';
export type GameSenderType = 'user' | GameActorType;

export const GAME_MACARON_SWATCHES = [
  { name: '薄荷', bg: '#DDF4E7', text: '#237257' },
  { name: '蜜桃', bg: '#FFE1D6', text: '#A14B36' },
  { name: '薰衣草', bg: '#E9E2FF', text: '#6652A8' },
  { name: '天空', bg: '#DDF0FF', text: '#356F9A' },
  { name: '玫瑰', bg: '#FFDDE8', text: '#A03D63' },
  { name: '湖水', bg: '#D7F7F3', text: '#28786F' },
  { name: '开心果', bg: '#E7F6C7', text: '#5E7625' },
  { name: '丁香', bg: '#F0DFFF', text: '#744CA0' },
  { name: '杏仁', bg: '#FFE8C7', text: '#91602A' },
  { name: '鸢尾', bg: '#DDE5FF', text: '#425CA4' },
];

export interface GameApiPreset {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GameActor {
  id: string;
  type: GameActorType;
  name: string;
  prompt: string;
  apiPresetId: string | null;
  avatarUri?: string;
  bubbleColor?: string;
  textColor?: string;
}

export interface GameHiddenRange {
  from: number;
  to: number;
}

export interface GameScenario {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  cardFaceUri?: string;
  narrator: GameActor;
  summarizer?: GameActor;
  characters: GameActor[];
  userAvatarUri?: string;
  showAvatars?: boolean;
  hiddenRanges?: GameHiddenRange[];
  createdAt: number;
  updatedAt: number;
}

export interface GameMessage {
  id: string;
  scenarioId: string;
  senderId: string;
  senderType: GameSenderType;
  senderName: string;
  content: string;
  createdAt: number;
}

interface GameState {
  _hydrated: boolean;
  apiPresets: GameApiPreset[];
  scenarios: GameScenario[];
  messagesByScenario: Record<string, GameMessage[]>;
  activeGeneratingActorId: string | null;
  error: string | null;

  ensureScenarioDefaults: (scenarioId: string) => void;
  createScenario: () => string;
  saveScenario: (scenario: GameScenario) => void;
  removeScenario: (scenarioId: string) => void;
  saveApiPreset: (preset: Omit<GameApiPreset, 'id'> & { id?: string }) => string;
  removeApiPreset: (presetId: string) => void;
  addUserMessage: (
    scenarioId: string,
    content: string,
    sender?: Pick<GameMessage, 'senderId' | 'senderType' | 'senderName'>
  ) => void;
  editMessage: (scenarioId: string, messageId: string, content: string) => void;
  removeMessage: (scenarioId: string, messageId: string) => void;
  triggerActorResponse: (scenarioId: string, actorId: string) => Promise<void>;
  stopGenerating: () => void;
  clearScenarioMessages: (scenarioId: string) => void;
  addHiddenRange: (scenarioId: string, from: number, to: number) => void;
  removeHiddenRange: (scenarioId: string, index: number) => void;
  updateActorBubbleColor: (scenarioId: string, actorId: string, bubbleColor: string, textColor: string) => void;
  clearError: () => void;
}

let abortController: AbortController | null = null;

function createActor(type: GameActorType, name: string, prompt: string, colorIndex = 0): GameActor {
  const swatch = GAME_MACARON_SWATCHES[colorIndex % GAME_MACARON_SWATCHES.length];
  return {
    id: randomUUID(),
    type,
    name,
    prompt,
    apiPresetId: null,
    bubbleColor: type === 'character' ? swatch.bg : undefined,
    textColor: type === 'character' ? swatch.text : undefined,
  };
}

function createSummarizer(): GameActor {
  return createActor(
    'summary',
    '总结AI',
    '你是这个副本的总结 AI。根据当前未隐藏的副本消息，整理剧情进展、角色状态、重要线索和待推进事项。保持中立、清晰、便于继续游玩。'
  );
}

function createDefaultScenario(): GameScenario {
  const now = Date.now();
  return {
    id: randomUUID(),
    title: '新副本',
    description: '一个独立的多角色情景房间',
    systemPrompt: '这是一个独立于主聊天的情景副本。保持世界观一致，尊重用户输入，只输出当前被调用身份的发言。',
    narrator: createActor(
      'narrator',
      '旁白',
      '你是这个副本的叙事旁白。负责描写环境、节奏、事件推进和角色动作，不替用户做决定。'
    ),
    summarizer: createSummarizer(),
    characters: [
      createActor(
        'character',
        '角色A',
        '你是副本中的参与角色。根据自己的设定、当前场景和聊天历史自然回应。',
        0
      ),
    ],
    userAvatarUri: undefined,
    showAvatars: true,
    hiddenRanges: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeScenario(scenario: GameScenario): GameScenario {
  return {
    ...scenario,
    summarizer: scenario.summarizer ?? createSummarizer(),
    showAvatars: scenario.showAvatars ?? true,
    hiddenRanges: scenario.hiddenRanges ?? [],
    characters: scenario.characters.map((actor, index) => {
      if (actor.type !== 'character' || (actor.bubbleColor && actor.textColor)) return actor;
      const swatch = GAME_MACARON_SWATCHES[index % GAME_MACARON_SWATCHES.length];
      return { ...actor, bubbleColor: actor.bubbleColor || swatch.bg, textColor: actor.textColor || swatch.text };
    }),
  };
}

function findActor(scenario: GameScenario, actorId: string): GameActor | null {
  if (scenario.narrator.id === actorId) return scenario.narrator;
  if (scenario.summarizer?.id === actorId) return scenario.summarizer;
  return scenario.characters.find((actor) => actor.id === actorId) ?? null;
}

function actorList(scenario: GameScenario): GameActor[] {
  return [scenario.narrator, ...(scenario.summarizer ? [scenario.summarizer] : []), ...scenario.characters];
}

function updateScenarioTimestamp(scenarios: GameScenario[], scenarioId: string): GameScenario[] {
  return scenarios.map((scenario) =>
    scenario.id === scenarioId ? { ...scenario, updatedAt: Date.now() } : scenario
  );
}

function buildSystemPrompt(scenario: GameScenario, actor: GameActor): string {
  const participants = actorList(scenario)
    .map((item) => {
      const label = item.type === 'narrator' ? '旁白' : item.type === 'summary' ? '总结AI' : '角色';
      return `${label}：${item.name}`;
    })
    .join('\n');

  return [
    '你正在运行应用内的独立游戏副本。这个副本与主聊天完全隔离。',
    '只以当前被点选的身份回复，不要代替用户发言，不要输出其他角色的完整台词。',
    '',
    `副本名称：${scenario.title}`,
    `副本说明：${scenario.description || '无'}`,
    '',
    '副本总设定：',
    scenario.systemPrompt,
    '',
    '参与者：',
    participants,
    '',
    `当前回复身份：${actor.name}`,
    actor.type === 'narrator'
      ? '身份类型：叙事旁白'
      : actor.type === 'summary'
        ? '身份类型：总结AI'
        : '身份类型：参与角色',
    '当前身份设定：',
    actor.prompt,
  ].join('\n');
}

function buildApiMessages(messages: GameMessage[]): { role: string; content: string }[] {
  return messages.map((message) => ({
    role: message.senderType === 'user' ? 'user' : 'assistant',
    content:
      message.senderType === 'user'
        ? `用户：${message.content}`
        : `${message.senderName}：${message.content}`,
  }));
}

function isFloorHidden(floor: number, ranges: GameHiddenRange[] | undefined): boolean {
  return (ranges ?? []).some((range) => floor >= range.from && floor <= range.to);
}

function visibleMessagesForAI(messages: GameMessage[], ranges: GameHiddenRange[] | undefined): GameMessage[] {
  return messages.filter((_, index) => !isFloorHidden(index + 1, ranges));
}

function mergeHiddenRanges(ranges: GameHiddenRange[]): GameHiddenRange[] {
  const sorted = ranges
    .map((range) => ({
      from: Math.max(1, Math.min(range.from, range.to)),
      to: Math.max(1, Math.max(range.from, range.to)),
    }))
    .sort((a, b) => a.from - b.from);

  const merged: GameHiddenRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.from > last.to + 1) {
      merged.push(range);
    } else {
      last.to = Math.max(last.to, range.to);
    }
  }
  return merged;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      _hydrated: false,
      apiPresets: [],
      scenarios: [],
      messagesByScenario: {},
      activeGeneratingActorId: null,
      error: null,

      ensureScenarioDefaults: (scenarioId) => {
        set((state) => ({
          scenarios: state.scenarios.map((scenario) =>
            scenario.id === scenarioId ? normalizeScenario(scenario) : scenario
          ),
        }));
      },

      createScenario: () => {
        const scenario = createDefaultScenario();
        set((state) => ({
          scenarios: [scenario, ...state.scenarios],
          messagesByScenario: {
            ...state.messagesByScenario,
            [scenario.id]: [],
          },
          error: null,
        }));
        return scenario.id;
      },

      saveScenario: (scenario) => {
        const nextScenario = { ...normalizeScenario(scenario), updatedAt: Date.now() };
        set((state) => {
          const exists = state.scenarios.some((item) => item.id === scenario.id);
          return {
            scenarios: exists
              ? state.scenarios.map((item) => (item.id === scenario.id ? nextScenario : item))
              : [nextScenario, ...state.scenarios],
            messagesByScenario: {
              ...state.messagesByScenario,
              [scenario.id]: state.messagesByScenario[scenario.id] ?? [],
            },
            error: null,
          };
        });
      },

      removeScenario: (scenarioId) => {
        set((state) => {
          const nextMessages = { ...state.messagesByScenario };
          delete nextMessages[scenarioId];
          return {
            scenarios: state.scenarios.filter((scenario) => scenario.id !== scenarioId),
            messagesByScenario: nextMessages,
            error: null,
          };
        });
      },

      saveApiPreset: (preset) => {
        const id = preset.id || randomUUID();
        const normalized: GameApiPreset = {
          id,
          name: preset.name.trim(),
          baseUrl: preset.baseUrl.trim(),
          apiKey: preset.apiKey.trim(),
          model: preset.model.trim(),
          temperature: preset.temperature,
          maxTokens: preset.maxTokens,
        };

        set((state) => {
          const exists = state.apiPresets.some((item) => item.id === id);
          return {
            apiPresets: exists
              ? state.apiPresets.map((item) => (item.id === id ? normalized : item))
              : [...state.apiPresets, normalized],
            error: null,
          };
        });
        return id;
      },

      removeApiPreset: (presetId) => {
        set((state) => ({
          apiPresets: state.apiPresets.filter((preset) => preset.id !== presetId),
          scenarios: state.scenarios.map((scenario) => ({
            ...scenario,
            narrator:
              scenario.narrator.apiPresetId === presetId
                ? { ...scenario.narrator, apiPresetId: null }
                : scenario.narrator,
            summarizer:
              scenario.summarizer?.apiPresetId === presetId
                ? { ...scenario.summarizer, apiPresetId: null }
                : scenario.summarizer,
            characters: scenario.characters.map((actor) =>
              actor.apiPresetId === presetId ? { ...actor, apiPresetId: null } : actor
            ),
          })),
          error: null,
        }));
      },

      addUserMessage: (scenarioId, content, sender) => {
        const text = content.trim();
        if (!text || get().activeGeneratingActorId) return;

        const message: GameMessage = {
          id: randomUUID(),
          scenarioId,
          senderId: sender?.senderId ?? 'user',
          senderType: sender?.senderType ?? 'user',
          senderName: sender?.senderName ?? '用户',
          content: text,
          createdAt: Date.now(),
        };

        set((state) => ({
          messagesByScenario: {
            ...state.messagesByScenario,
            [scenarioId]: [...(state.messagesByScenario[scenarioId] ?? []), message],
          },
          scenarios: updateScenarioTimestamp(state.scenarios, scenarioId),
          error: null,
        }));
      },

      editMessage: (scenarioId, messageId, content) => {
        const text = content.trim();
        if (!text) return;
        set((state) => ({
          messagesByScenario: {
            ...state.messagesByScenario,
            [scenarioId]: (state.messagesByScenario[scenarioId] ?? []).map((message) =>
              message.id === messageId ? { ...message, content: text } : message
            ),
          },
          scenarios: updateScenarioTimestamp(state.scenarios, scenarioId),
          error: null,
        }));
      },

      removeMessage: (scenarioId, messageId) => {
        set((state) => ({
          messagesByScenario: {
            ...state.messagesByScenario,
            [scenarioId]: (state.messagesByScenario[scenarioId] ?? []).filter((message) => message.id !== messageId),
          },
          scenarios: updateScenarioTimestamp(state.scenarios, scenarioId),
          error: null,
        }));
      },

      triggerActorResponse: async (scenarioId, actorId) => {
        if (get().activeGeneratingActorId) return;

        let scenario = get().scenarios.find((item) => item.id === scenarioId);
        if (!scenario) {
          set({ error: '副本不存在' });
          return;
        }
        scenario = normalizeScenario(scenario);

        const actor = findActor(scenario, actorId);
        if (!actor) {
          set({ error: '角色不存在' });
          return;
        }

        const preset = get().apiPresets.find((item) => item.id === actor.apiPresetId);
        if (!preset || !preset.baseUrl || !preset.apiKey || !preset.model) {
          set({ error: `请先为「${actor.name}」选择可用的副本 API 配置` });
          return;
        }

        const responseMessage: GameMessage = {
          id: randomUUID(),
          scenarioId,
          senderId: actor.id,
          senderType: actor.type,
          senderName: actor.name,
          content: '',
          createdAt: Date.now(),
        };

        const history = get().messagesByScenario[scenarioId] ?? [];
        const apiHistory = visibleMessagesForAI(history, scenario.hiddenRanges);
        set((state) => ({
          activeGeneratingActorId: actor.id,
          messagesByScenario: {
            ...state.messagesByScenario,
            [scenarioId]: [...history, responseMessage],
          },
          scenarios: updateScenarioTimestamp(state.scenarios, scenarioId),
          error: null,
        }));

        abortController = new AbortController();

        try {
          await streamChat(
            {
              baseUrl: preset.baseUrl,
              apiKey: preset.apiKey,
              model: preset.model,
              maxTokens: preset.maxTokens,
              temperature: preset.temperature,
              messages: [
                { role: 'system', content: buildSystemPrompt(scenario, actor) },
                ...buildApiMessages(apiHistory),
              ],
            },
            (token) => {
              set((state) => {
                const scenarioMessages = state.messagesByScenario[scenarioId] ?? [];
                return {
                  messagesByScenario: {
                    ...state.messagesByScenario,
                    [scenarioId]: scenarioMessages.map((message) =>
                      message.id === responseMessage.id
                        ? { ...message, content: message.content + token }
                        : message
                    ),
                  },
                };
              });
            },
            abortController.signal
          );
        } catch (error: any) {
          const isAbort =
            String(error?.name || '').toLowerCase() === 'aborterror' ||
            String(error?.message || '').toLowerCase().includes('abort');
          set((state) => {
            const scenarioMessages = state.messagesByScenario[scenarioId] ?? [];
            const response = scenarioMessages.find((message) => message.id === responseMessage.id);
            const shouldRemove = !response?.content.trim();
            return {
              error: isAbort ? null : error?.message || '副本回复失败',
              messagesByScenario: {
                ...state.messagesByScenario,
                [scenarioId]: shouldRemove
                  ? scenarioMessages.filter((message) => message.id !== responseMessage.id)
                  : scenarioMessages,
              },
            };
          });
        } finally {
          abortController = null;
          set({ activeGeneratingActorId: null });
        }
      },

      stopGenerating: () => {
        abortController?.abort();
        set({ activeGeneratingActorId: null });
      },

      clearScenarioMessages: (scenarioId) => {
        set((state) => ({
          messagesByScenario: {
            ...state.messagesByScenario,
            [scenarioId]: [],
          },
          scenarios: state.scenarios.map((scenario) =>
            scenario.id === scenarioId
              ? { ...scenario, hiddenRanges: [], updatedAt: Date.now() }
              : scenario
          ),
          error: null,
        }));
      },

      addHiddenRange: (scenarioId, from, to) => {
        set((state) => ({
          scenarios: state.scenarios.map((scenario) => {
            if (scenario.id !== scenarioId) return scenario;
            return {
              ...scenario,
              hiddenRanges: mergeHiddenRanges([...(scenario.hiddenRanges ?? []), { from, to }]),
              updatedAt: Date.now(),
            };
          }),
          error: null,
        }));
      },

      removeHiddenRange: (scenarioId, index) => {
        set((state) => ({
          scenarios: state.scenarios.map((scenario) => {
            if (scenario.id !== scenarioId) return scenario;
            return {
              ...scenario,
              hiddenRanges: (scenario.hiddenRanges ?? []).filter((_, itemIndex) => itemIndex !== index),
              updatedAt: Date.now(),
            };
          }),
          error: null,
        }));
      },

      updateActorBubbleColor: (scenarioId, actorId, bubbleColor, textColor) => {
        set((state) => ({
          scenarios: state.scenarios.map((scenario) => {
            if (scenario.id !== scenarioId) return scenario;
            return {
              ...scenario,
              updatedAt: Date.now(),
              narrator:
                scenario.narrator.id === actorId
                  ? { ...scenario.narrator, bubbleColor, textColor }
                  : scenario.narrator,
              summarizer:
                scenario.summarizer?.id === actorId
                  ? { ...scenario.summarizer, bubbleColor, textColor }
                  : scenario.summarizer,
              characters: scenario.characters.map((actor) =>
                actor.id === actorId ? { ...actor, bubbleColor, textColor } : actor
              ),
            };
          }),
          error: null,
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'ysclaude-game',
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({
        apiPresets: state.apiPresets,
        scenarios: state.scenarios,
        messagesByScenario: state.messagesByScenario,
      }),
      onRehydrateStorage: () => () => {
        useGameStore.setState({ _hydrated: true });
      },
    }
  )
);
