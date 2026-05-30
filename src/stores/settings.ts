import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sqliteStorage } from '../db/kv-storage';
import { APIConfig } from '../types';

export interface NamedAPIConfig extends APIConfig {
  name: string;
}

export interface HiddenRange {
  from: number;
  to: number;
}

export interface TTSConfig {
  groupId: string;
  apiKey: string;
  model: string;
  voiceId: string;
  speed: number;
  vol: number;
  pitch: number;
}

interface SettingsState {
  _hydrated: boolean;
  apiConfigs: NamedAPIConfig[];
  activeConfigIndex: number;
  systemPrompt: string;
  systemPrompts: { name: string; content: string }[];
  hiddenRanges: HiddenRange[];
  maxOutputTokens: number | null;
  ttsConfig: TTSConfig;

  setActiveConfig: (index: number) => void;
  saveAPIConfig: (config: NamedAPIConfig) => void;
  removeAPIConfig: (index: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setSystemPrompts: (prompts: { name: string; content: string }[]) => void;
  setHiddenRanges: (ranges: HiddenRange[]) => void;
  addHiddenRange: (range: HiddenRange) => void;
  removeHiddenRange: (index: number) => void;
  setMaxOutputTokens: (tokens: number | null) => void;
  setTTSConfig: (config: Partial<TTSConfig>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      _hydrated: false,
      apiConfigs: [],
      activeConfigIndex: 0,
      systemPrompt: 'You are a helpful assistant.',
      systemPrompts: [
        { name: '默认', content: 'You are a helpful assistant.' },
      ],
      hiddenRanges: [],
      maxOutputTokens: null,
      ttsConfig: {
        groupId: '',
        apiKey: '',
        model: 'speech-02-hd',
        voiceId: '',
        speed: 1,
        vol: 1,
        pitch: 0,
      },

      setActiveConfig: (index) => set({ activeConfigIndex: index }),

      saveAPIConfig: (config) =>
        set((state) => {
          const existingIndex = state.apiConfigs.findIndex((c) => c.name === config.name);
          if (existingIndex >= 0) {
            const configs = [...state.apiConfigs];
            configs[existingIndex] = config;
            return { apiConfigs: configs };
          }
          return { apiConfigs: [...state.apiConfigs, config] };
        }),

      removeAPIConfig: (index) =>
        set((state) => ({
          apiConfigs: state.apiConfigs.filter((_, i) => i !== index),
          activeConfigIndex:
            state.activeConfigIndex >= state.apiConfigs.length - 1
              ? Math.max(0, state.apiConfigs.length - 2)
              : state.activeConfigIndex,
        })),

      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
      setSystemPrompts: (prompts) => set({ systemPrompts: prompts }),

      setHiddenRanges: (ranges) => set({ hiddenRanges: ranges }),
      addHiddenRange: (range) =>
        set((state) => ({ hiddenRanges: [...state.hiddenRanges, range] })),
      removeHiddenRange: (index) =>
        set((state) => ({
          hiddenRanges: state.hiddenRanges.filter((_, i) => i !== index),
        })),
      setMaxOutputTokens: (tokens) => set({ maxOutputTokens: tokens }),
      setTTSConfig: (config) =>
        set((state) => ({ ttsConfig: { ...state.ttsConfig, ...config } })),
    }),
    {
      name: 'ysclaude-settings',
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({
        apiConfigs: state.apiConfigs,
        activeConfigIndex: state.activeConfigIndex,
        systemPrompt: state.systemPrompt,
        systemPrompts: state.systemPrompts,
        hiddenRanges: state.hiddenRanges,
        maxOutputTokens: state.maxOutputTokens,
        ttsConfig: state.ttsConfig,
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ _hydrated: true });
      },
    }
  )
);
