export interface TranscribeVoiceRequest {
  provider?: 'openai' | 'fish';
  baseUrl: string;
  apiKey: string;
  uri: string;
  mimeType?: string;
  fileName?: string;
  model?: string;
  language?: string;
  ignoreTimestamps?: boolean;
}

export async function transcribeVoice(_request: TranscribeVoiceRequest): Promise<string> {
  throw new Error('Web 暂未启用语音转文字');
}

export function mimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0];
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'audio/mp4';
}

export function extensionFromUri(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0];
  const match = lower.match(/\.[a-z0-9]+$/);
  return match?.[0] || '.webm';
}
