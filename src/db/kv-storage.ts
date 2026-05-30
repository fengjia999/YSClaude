import * as SQLite from 'expo-sqlite';
import { StateStorage } from 'zustand/middleware';

let kvDb: SQLite.SQLiteDatabase | null = null;

async function getKVDb(): Promise<SQLite.SQLiteDatabase> {
  if (!kvDb) {
    kvDb = await SQLite.openDatabaseAsync('ysclaude_kv.db');
    await kvDb.execAsync(
      `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    );
  }
  return kvDb;
}

export const sqliteStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await getKVDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?',
      [name]
    );
    return row?.value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const db = await getKVDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
      [name, value]
    );
  },
  removeItem: async (name: string): Promise<void> => {
    const db = await getKVDb();
    await db.runAsync('DELETE FROM kv WHERE key = ?', [name]);
  },
};
