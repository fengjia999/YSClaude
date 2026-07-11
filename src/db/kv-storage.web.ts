import { StateStorage } from 'zustand/middleware';

export const KV_DATABASE_NAME = 'ysclaude_kv_web';

export async function serializeKVDatabase(): Promise<Uint8Array> {
  return new Uint8Array();
}

export async function closeKVDatabaseConnection(): Promise<string | null> {
  return null;
}

export const sqliteStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return globalThis.localStorage?.getItem(name) ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    globalThis.localStorage?.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    globalThis.localStorage?.removeItem(name);
  },
};
