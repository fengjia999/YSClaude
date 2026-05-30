import { createAudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { TTSConfig } from '../stores/settings';

let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

export async function playTTS(text: string, config: TTSConfig): Promise<void> {
  if (!config.apiKey || !config.groupId) {
    throw new Error('请先配置 MiniMax Group ID 和 API Key');
  }
  if (!config.voiceId) {
    throw new Error('请先配置 Voice ID');
  }

  await stopTTS();

  const url = `https://api.minimax.chat/v1/t2a_v2?GroupId=${encodeURIComponent(config.groupId)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      text,
      stream: false,
      voice_setting: {
        voice_id: config.voiceId,
        speed: config.speed,
        vol: config.vol,
        pitch: config.pitch,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MiniMax TTS Error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();

  if (data.base_resp?.status_code !== 0) {
    throw new Error(data.base_resp?.status_msg || 'TTS 请求失败');
  }

  const audioHex = data.data?.audio;
  if (!audioHex) {
    throw new Error('未返回音频数据');
  }

  const audioBytes = hexToBytes(audioHex);
  const file = new File(Paths.cache, 'tts_audio.mp3');
  const writable = file.writableStream();
  const writer = writable.getWriter();
  await writer.write(audioBytes);
  await writer.close();

  currentPlayer = createAudioPlayer(file.uri);
  currentPlayer.play();
}

export async function stopTTS(): Promise<void> {
  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.release();
    currentPlayer = null;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
