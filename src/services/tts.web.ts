import type { TTSConfig } from '../stores/settings';

export function isTTSConfigReady(config: TTSConfig): boolean {
  return !!config;
}

export function getTTSConfigMissingMessage(): string {
  return 'Web 暂未启用 TTS';
}

export async function playTTS(): Promise<void> {
  throw new Error('Web 暂未启用 TTS');
}

export async function playTTSAndWait(): Promise<void> {
  throw new Error('Web 暂未启用 TTS');
}

export async function stopTTS(): Promise<void> {
  return undefined;
}
