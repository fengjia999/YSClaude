import { getDatabase } from './database';
import { Conversation, Message } from '../types';

export async function createConversation(conv: Conversation): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO conversations (id, title, system_prompt, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [conv.id, conv.title, conv.systemPrompt, conv.model, conv.createdAt, conv.updatedAt]
  );
}

export async function updateConversation(id: string, updates: Partial<Pick<Conversation, 'title' | 'updatedAt'>>): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.updatedAt !== undefined) {
    sets.push('updated_at = ?');
    values.push(updates.updatedAt);
  }

  if (sets.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM messages WHERE conversation_id = ?', [id]);
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    system_prompt: string;
    model: string;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM conversations ORDER BY updated_at DESC');

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    systemPrompt: row.system_prompt,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function insertMessage(conversationId: string, msg: Message): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      msg.id,
      conversationId,
      msg.role,
      msg.content,
      msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      msg.toolCallId || null,
      msg.createdAt,
    ]
  );
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE messages SET content = ? WHERE id = ?', [content, id]);
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    role: string;
    content: string;
    tool_calls: string | null;
    tool_call_id: string | null;
    created_at: number;
  }>('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);

  return rows.map((row) => ({
    id: row.id,
    role: row.role as Message['role'],
    content: row.content,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    toolCallId: row.tool_call_id || undefined,
    createdAt: row.created_at,
  }));
}
