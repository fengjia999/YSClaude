import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { gunzipSync } from 'fflate';
import { Conversation, HiddenRange, Message } from '../types';
import { createConversation, insertMessage } from '../db/operations';

interface MyphoneMessage {
  id?: string;
  role?: string;
  content?: string;
  timestamp?: number;
  createdAt?: number;
  isContextDisabled?: boolean;
  imageUri?: string;
  image?: string;
  parts?: Array<{ type?: string; text?: string; data?: string }>;
}

interface MyphoneCharacter {
  id?: string;
  name?: string;
  realName?: string;
  remarkName?: string;
  myName?: string;
  persona?: string;
  prompt?: string;
  systemPrompt?: string;
  history?: MyphoneMessage[] | string[];
}

interface MyphoneBackup {
  character?: MyphoneCharacter;
  characters?: MyphoneCharacter[];
  __chunks__?: Record<string, string>;
  _exportVersion?: string;
}

export interface MyphoneImportResult {
  cancelled: boolean;
  importedConversations: number;
  importedMessages: number;
  skippedCharacters: number;
  firstConversationId?: string;
}

export async function importMyphonePrivateChatsFromPicker(): Promise<MyphoneImportResult> {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/octet-stream', 'application/json', 'text/json', '*/*'],
    multipleFiles: false,
  });

  if (result.canceled) {
    return emptyResult(true);
  }

  return importMyphonePrivateChatsFromFile(result.result);
}

async function importMyphonePrivateChatsFromFile(file: File): Promise<MyphoneImportResult> {
  const bytes = await file.bytes();
  const jsonText = decodeBackupBytes(bytes);
  const backup = JSON.parse(jsonText) as MyphoneBackup;
  const characters = normalizeCharacters(backup);

  if (characters.length === 0) {
    throw new Error('文件里没有可导入的单聊角色数据');
  }

  const importResult = emptyResult(false);

  for (const character of characters) {
    const rawHistory = reassembleHistory(character, backup);
    const convertedMessages = convertMessages(rawHistory);

    if (convertedMessages.length === 0) {
      importResult.skippedCharacters += 1;
      continue;
    }

    const now = Date.now();
    const timestamps = convertedMessages.map((message) => message.createdAt);
    const createdAt = Math.min(...timestamps);
    const updatedAt = Math.max(...timestamps, now);
    const conversationId = randomUUID();
    const conversation: Conversation = {
      id: conversationId,
      title: titleForCharacter(character),
      systemPrompt: promptForCharacter(character),
      model: '',
      createdAt,
      updatedAt,
      hiddenRanges: hiddenRangesForHistory(rawHistory),
    };

    await createConversation(conversation);
    for (const message of convertedMessages) {
      await insertMessage(conversationId, message);
    }

    importResult.importedConversations += 1;
    importResult.importedMessages += convertedMessages.length;
    importResult.firstConversationId = importResult.firstConversationId || conversationId;
  }

  if (importResult.importedConversations === 0) {
    throw new Error('单聊角色存在，但没有可导入的聊天消息');
  }

  return importResult;
}

function emptyResult(cancelled: boolean): MyphoneImportResult {
  return {
    cancelled,
    importedConversations: 0,
    importedMessages: 0,
    skippedCharacters: 0,
  };
}

function decodeBackupBytes(bytes: Uint8Array): string {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const payload = isGzip ? gunzipSync(bytes) : bytes;
  return new TextDecoder('utf-8').decode(payload);
}

function normalizeCharacters(backup: MyphoneBackup): MyphoneCharacter[] {
  if (Array.isArray(backup.characters)) return backup.characters;
  if (backup.character?.history) return [backup.character];
  const maybeCharacter = backup as MyphoneCharacter;
  if (Array.isArray(maybeCharacter.history)) return [maybeCharacter];
  return [];
}

function reassembleHistory(character: MyphoneCharacter, backup: MyphoneBackup): MyphoneMessage[] {
  const history = character.history;
  if (!Array.isArray(history) || history.length === 0) return [];

  if (typeof history[0] === 'object' && history[0] !== null) {
    return history as MyphoneMessage[];
  }

  if (!backup.__chunks__) return [];

  const messages: MyphoneMessage[] = [];
  for (const key of history) {
    if (typeof key !== 'string') continue;
    const chunk = backup.__chunks__[key];
    if (!chunk) continue;
    try {
      const parsed = JSON.parse(chunk);
      if (Array.isArray(parsed)) messages.push(...parsed);
    } catch {
      // Ignore corrupt chunks and keep importing the readable history.
    }
  }
  return messages;
}

function convertMessages(history: MyphoneMessage[]): Message[] {
  const sorted = [...history].sort((a, b) => timestampForMessage(a) - timestampForMessage(b));
  return sorted
    .map<Message | null>((item, index) => {
      const role = roleForMessage(item);
      if (!role) return null;
      const content = contentForMessage(item);
      const imageUri = imageUriForMessage(item);
      if (!content && !imageUri) return null;

      const message: Message = {
        id: randomUUID(),
        role,
        content,
        createdAt: timestampForMessage(item) + index,
      };
      if (imageUri) message.imageUri = imageUri;
      return message;
    })
    .filter((message): message is Message => message !== null);
}

function roleForMessage(message: MyphoneMessage): Message['role'] | null {
  const content = message.content || '';
  if (message.role === 'system' || /^\[(system|system-display):.*\]$/s.test(content.trim())) {
    return 'system';
  }
  if (message.role === 'assistant') return 'assistant';
  if (message.role === 'user') return 'user';
  if (message.role === 'tool') return 'tool';
  return null;
}

function contentForMessage(message: MyphoneMessage): string {
  const content = textFromParts(message.parts) || message.content || '';
  return stripMyphoneMessageWrapper(content.trim());
}

function textFromParts(parts: MyphoneMessage['parts']): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part) => !part.type || part.type === 'text')
    .map((part) => part.text || '')
    .join('')
    .trim();
}

function stripMyphoneMessageWrapper(content: string): string {
  const match = content.match(/^\[[^\[\]\n]+的消息：([\s\S]*)\]$/);
  return match ? match[1].trim() : content;
}

function imageUriForMessage(message: MyphoneMessage): string | undefined {
  if (isImageUri(message.imageUri)) return message.imageUri;
  if (isImageUri(message.image)) return message.image;
  const imagePart = message.parts?.find((part) => isImageUri(part.data));
  return imagePart?.data;
}

function isImageUri(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function timestampForMessage(message: MyphoneMessage): number {
  const value = message.timestamp ?? message.createdAt;
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}

function titleForCharacter(character: MyphoneCharacter): string {
  return (
    character.remarkName?.trim() ||
    character.realName?.trim() ||
    character.name?.trim() ||
    'myphone 单聊'
  );
}

function promptForCharacter(character: MyphoneCharacter): string {
  return (
    character.systemPrompt?.trim() ||
    character.prompt?.trim() ||
    character.persona?.trim() ||
    ''
  );
}

function hiddenRangesForHistory(history: MyphoneMessage[]): HiddenRange[] {
  const sorted = [...history].sort((a, b) => timestampForMessage(a) - timestampForMessage(b));
  const ranges: HiddenRange[] = [];
  let floor = 0;

  sorted.forEach((message) => {
    const role = roleForMessage(message);
    if (!role) return;
    const content = contentForMessage(message);
    const imageUri = imageUriForMessage(message);
    if (!content && !imageUri) return;
    if (role !== 'user' && role !== 'assistant') return;
    floor += 1;
    if (!message.isContextDisabled) return;
    ranges.push({ from: floor, to: floor });
  });

  return mergeRanges(ranges);
}

function mergeRanges(ranges: HiddenRange[]): HiddenRange[] {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: HiddenRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.from > last.to + 1) {
      merged.push({ ...range });
      continue;
    }
    last.to = Math.max(last.to, range.to);
  }

  return merged;
}
