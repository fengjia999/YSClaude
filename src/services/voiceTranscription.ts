const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-1';

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

export async function transcribeVoice({
  provider = 'openai',
  baseUrl,
  apiKey,
  uri,
  mimeType,
  fileName,
  model = DEFAULT_TRANSCRIPTION_MODEL,
  language,
  ignoreTimestamps,
}: TranscribeVoiceRequest): Promise<string> {
  if (provider === 'fish') {
    return transcribeFishAudio({
      baseUrl,
      apiKey,
      uri,
      mimeType,
      fileName,
      language,
      ignoreTimestamps,
    });
  }

  return transcribeOpenAI({
    baseUrl,
    apiKey,
    uri,
    mimeType,
    fileName,
    model,
  });
}

async function transcribeOpenAI({
  baseUrl,
  apiKey,
  uri,
  mimeType,
  fileName,
  model = DEFAULT_TRANSCRIPTION_MODEL,
}: TranscribeVoiceRequest): Promise<string> {
  const endpoint = `${baseUrl.trim().replace(/\/$/, '')}/audio/transcriptions`;
  const formData = new FormData();
  formData.append('model', model);
  formData.append('file', {
    uri,
    name: fileName || `voice${extensionFromUri(uri)}`,
    type: mimeType || mimeTypeFromUri(uri),
  } as any);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STT Error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const json = await response.json();
  const text = typeof json.text === 'string' ? json.text.trim() : '';
  if (!text) {
    throw new Error('STT 未返回文字');
  }
  return text;
}

async function transcribeFishAudio({
  baseUrl,
  apiKey,
  uri,
  mimeType,
  fileName,
  language = 'zh',
  ignoreTimestamps = true,
}: TranscribeVoiceRequest): Promise<string> {
  const endpoint = `${baseUrl.trim().replace(/\/$/, '')}/v1/asr`;
  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: fileName || `voice${extensionFromUri(uri)}`,
    type: mimeType || mimeTypeFromUri(uri),
  } as any);

  const normalizedLanguage = language.trim();
  if (normalizedLanguage) {
    formData.append('language', normalizedLanguage);
  }
  formData.append('ignore_timestamps', ignoreTimestamps ? 'true' : 'false');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fish Audio STT Error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const json = await response.json();
  const text = typeof json.text === 'string' ? json.text.trim() : '';
  if (!text) {
    throw new Error('Fish Audio STT 未返回文字');
  }
  return text;
}

export function mimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0];
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';
  if (lower.endsWith('.mp4')) return 'audio/mp4';
  return 'audio/mp4';
}

export function extensionFromUri(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0];
  const match = lower.match(/\.[a-z0-9]+$/);
  return match?.[0] || '.m4a';
}
