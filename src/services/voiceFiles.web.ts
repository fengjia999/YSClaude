import type { Message, VoiceAttachment } from '../types';

export async function deleteVoiceAttachmentFile(_voice?: VoiceAttachment): Promise<void> {
  return undefined;
}

export async function deleteMessageVoiceFile(_message: Message | undefined): Promise<void> {
  return undefined;
}

export async function deleteConversationVoiceFiles(_conversationId: string): Promise<void> {
  return undefined;
}

export async function cleanupExpiredVoiceFiles(_force = false): Promise<void> {
  return undefined;
}
