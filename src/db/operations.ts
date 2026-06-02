import { getDatabase } from './database';
import {
  Conversation,
  Message,
  Diary,
  HiddenRange,
  ToolInvocation,
  ReadingBook,
  ReadingChapter,
  ReadingMessage,
} from '../types';

export async function createConversation(conv: Conversation): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO conversations (id, title, system_prompt, model, created_at, updated_at, hidden_ranges)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      conv.id,
      conv.title,
      conv.systemPrompt,
      conv.model,
      conv.createdAt,
      conv.updatedAt,
      JSON.stringify(conv.hiddenRanges ?? []),
    ]
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
    hidden_ranges: string | null;
  }>('SELECT * FROM conversations ORDER BY created_at DESC');

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    systemPrompt: row.system_prompt,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hiddenRanges: parseHiddenRanges(row.hidden_ranges),
  }));
}

/* ==================== 隐藏楼层范围 CRUD ==================== */

// 容错解析：损坏或非数组的 JSON 一律退回空数组
function parseHiddenRanges(raw: string | null | undefined): HiddenRange[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r) => r && typeof r.from === 'number' && typeof r.to === 'number'
    );
  } catch {
    return [];
  }
}

export async function getHiddenRanges(conversationId: string): Promise<HiddenRange[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ hidden_ranges: string | null }>(
    'SELECT hidden_ranges FROM conversations WHERE id = ?',
    [conversationId]
  );
  return parseHiddenRanges(row?.hidden_ranges);
}

export async function updateHiddenRanges(
  conversationId: string,
  ranges: HiddenRange[]
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE conversations SET hidden_ranges = ? WHERE id = ?', [
    JSON.stringify(ranges),
    conversationId,
  ]);
}

export async function insertMessage(conversationId: string, msg: Message): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, tool_invocations, image_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      msg.id,
      conversationId,
      msg.role,
      msg.content,
      msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      msg.toolCallId || null,
      msg.toolInvocations && msg.toolInvocations.length > 0 ? JSON.stringify(msg.toolInvocations) : null,
      msg.imageUri || null,
      msg.createdAt,
    ]
  );
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE messages SET content = ? WHERE id = ?', [content, id]);
}

// 把某条消息的工具调用记录落库（流式收尾时调用）。空数组写 null。
export async function updateMessageToolInvocations(
  id: string,
  invocations: ToolInvocation[] | undefined
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE messages SET tool_invocations = ? WHERE id = ?', [
    invocations && invocations.length > 0 ? JSON.stringify(invocations) : null,
    id,
  ]);
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    role: string;
    content: string;
    tool_calls: string | null;
    tool_call_id: string | null;
    tool_invocations: string | null;
    image_uri: string | null;
    created_at: number;
  }>('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);

  return rows.map((row) => ({
    id: row.id,
    role: row.role as Message['role'],
    content: row.content,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    toolCallId: row.tool_call_id || undefined,
    toolInvocations: row.tool_invocations ? JSON.parse(row.tool_invocations) : undefined,
    imageUri: row.image_uri || undefined,
    createdAt: row.created_at,
  }));
}

/* ==================== 日记 Diary CRUD ==================== */

function mapDiaryRow(row: {
  id: string;
  title: string;
  content: string;
  is_favorite: number;
  created_at: number;
  updated_at: number;
}): Diary {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDiary(diary: Diary): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO diaries (id, title, content, is_favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      diary.id,
      diary.title,
      diary.content,
      diary.isFavorite ? 1 : 0,
      diary.createdAt,
      diary.updatedAt,
    ]
  );
}

export async function updateDiary(
  id: string,
  updates: Partial<Pick<Diary, 'title' | 'content' | 'isFavorite' | 'updatedAt'>>
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.content !== undefined) {
    sets.push('content = ?');
    values.push(updates.content);
  }
  if (updates.isFavorite !== undefined) {
    sets.push('is_favorite = ?');
    values.push(updates.isFavorite ? 1 : 0);
  }
  if (updates.updatedAt !== undefined) {
    sets.push('updated_at = ?');
    values.push(updates.updatedAt);
  }

  if (sets.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE diaries SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteDiary(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM diaries WHERE id = ?', [id]);
}

export async function getAllDiaries(): Promise<Diary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    content: string;
    is_favorite: number;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM diaries ORDER BY updated_at DESC');
  return rows.map(mapDiaryRow);
}

export async function getFavoriteDiaries(): Promise<Diary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    content: string;
    is_favorite: number;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM diaries WHERE is_favorite = 1 ORDER BY created_at ASC');
  return rows.map(mapDiaryRow);
}

/* ==================== Reading CRUD ==================== */

function parseReadingChapters(raw: string | null | undefined): ReadingChapter[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (chapter) =>
        chapter &&
        typeof chapter.id === 'string' &&
        typeof chapter.title === 'string' &&
        typeof chapter.start === 'number'
    );
  } catch {
    return [];
  }
}

function mapReadingBookRow(row: {
  id: string;
  title: string;
  author: string;
  cover_uri: string | null;
  file_uri: string | null;
  format: string;
  text: string;
  chapters: string | null;
  reading_offset: number;
  created_at: number;
  updated_at: number;
}): ReadingBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUri: row.cover_uri || undefined,
    fileUri: row.file_uri || undefined,
    format: row.format === 'epub' ? 'epub' : 'txt',
    text: row.text,
    chapters: parseReadingChapters(row.chapters),
    readingOffset: row.reading_offset,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createReadingBook(book: ReadingBook): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO reading_books
      (id, title, author, cover_uri, file_uri, format, text, chapters, reading_offset, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.id,
      book.title,
      book.author,
      book.coverUri || null,
      book.fileUri || null,
      book.format,
      book.text,
      JSON.stringify(book.chapters || []),
      book.readingOffset,
      book.createdAt,
      book.updatedAt,
    ]
  );
}

export async function updateReadingBook(
  id: string,
  updates: Partial<Pick<ReadingBook, 'title' | 'author' | 'coverUri' | 'fileUri' | 'text' | 'chapters' | 'readingOffset' | 'updatedAt'>>
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.author !== undefined) {
    sets.push('author = ?');
    values.push(updates.author);
  }
  if (updates.coverUri !== undefined) {
    sets.push('cover_uri = ?');
    values.push(updates.coverUri || null);
  }
  if (updates.fileUri !== undefined) {
    sets.push('file_uri = ?');
    values.push(updates.fileUri || null);
  }
  if (updates.text !== undefined) {
    sets.push('text = ?');
    values.push(updates.text);
  }
  if (updates.chapters !== undefined) {
    sets.push('chapters = ?');
    values.push(JSON.stringify(updates.chapters));
  }
  if (updates.readingOffset !== undefined) {
    sets.push('reading_offset = ?');
    values.push(updates.readingOffset);
  }
  if (updates.updatedAt !== undefined) {
    sets.push('updated_at = ?');
    values.push(updates.updatedAt);
  }

  if (sets.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE reading_books SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteReadingBook(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reading_messages WHERE book_id = ?', [id]);
  await db.runAsync('DELETE FROM reading_books WHERE id = ?', [id]);
}

export async function getAllReadingBooks(): Promise<ReadingBook[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    author: string;
    cover_uri: string | null;
    file_uri: string | null;
    format: string;
    text: string;
    chapters: string | null;
    reading_offset: number;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM reading_books ORDER BY updated_at DESC');
  return rows.map(mapReadingBookRow);
}

export async function getReadingBook(id: string): Promise<ReadingBook | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    title: string;
    author: string;
    cover_uri: string | null;
    file_uri: string | null;
    format: string;
    text: string;
    chapters: string | null;
    reading_offset: number;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM reading_books WHERE id = ?', [id]);
  return row ? mapReadingBookRow(row) : null;
}

function mapReadingMessageRow(row: {
  id: string;
  book_id: string;
  role: string;
  content: string;
  created_at: number;
}): ReadingMessage {
  return {
    id: row.id,
    bookId: row.book_id,
    role: row.role === 'assistant' ? 'assistant' : 'user',
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function insertReadingMessage(message: ReadingMessage): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO reading_messages (id, book_id, role, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [message.id, message.bookId, message.role, message.content, message.createdAt]
  );
}

export async function updateReadingMessageContent(id: string, content: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE reading_messages SET content = ? WHERE id = ?', [content, id]);
}

export async function deleteReadingMessage(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reading_messages WHERE id = ?', [id]);
}

export async function getReadingMessages(bookId: string): Promise<ReadingMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    book_id: string;
    role: string;
    content: string;
    created_at: number;
  }>('SELECT * FROM reading_messages WHERE book_id = ? ORDER BY created_at ASC', [bookId]);
  return rows.map(mapReadingMessageRow);
}
