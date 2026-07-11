import type {
  ConversationArtifact,
  ConversationArtifactKind,
  ConversationArtifactVersion,
} from '../types';

const FILE_TOKEN_PATTERN = /\[File:([^\]\r\n]+)\]/g;

export function inferArtifactKind(_name: string, _mimeType?: string): ConversationArtifactKind {
  return 'text';
}

export function formatArtifactToken(artifactId: string): string {
  return `[File:${artifactId}]`;
}

export function parseArtifactTokens(content: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  FILE_TOKEN_PATTERN.lastIndex = 0;
  while ((match = FILE_TOKEN_PATTERN.exec(content)) !== null) {
    ids.push(match[1].trim());
  }
  return [...new Set(ids.filter(Boolean))];
}

export async function createConversationArtifactFromContent(): Promise<ConversationArtifact> {
  throw new Error('Web 暂未启用会话文件');
}

export async function pickConversationArtifactFile(_conversationId: string): Promise<ConversationArtifact | null> {
  return null;
}

export async function listConversationArtifacts(_conversationId: string): Promise<ConversationArtifact[]> {
  return [];
}

export async function readConversationArtifact(
  _conversationId: string,
  _artifactId: string
): Promise<{ artifact: ConversationArtifact; version: ConversationArtifactVersion }> {
  throw new Error('Web 暂未启用会话文件');
}

export async function replaceConversationArtifactContent(): Promise<ConversationArtifactVersion> {
  throw new Error('Web 暂未启用会话文件');
}

export async function deleteConversationArtifactFile(): Promise<ConversationArtifact> {
  throw new Error('Web 暂未启用会话文件');
}

export function patchArtifactText(content: string, find: string, replace: string, all = false): string {
  if (!find) throw new Error('缺少要查找的文本');
  if (!content.includes(find)) throw new Error('文件中没有找到要替换的文本');
  return all ? content.split(find).join(replace) : content.replace(find, replace);
}
