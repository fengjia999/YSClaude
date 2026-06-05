import { ImageSourcePropType } from 'react-native';
import type { CustomSticker } from '../stores/settings';

export type StickerCatalog = 'assistant' | 'user';

export interface StickerDefinition {
  id: string;
  name: string;
  token: string;
  image: ImageSourcePropType;
}

const DEFAULT_STICKER_IMAGES: Record<string, ImageSourcePropType> = {
  'assistant:。。。': require('../../assets/stickers-ai/。。。.jpg'),
  'assistant:吃我一拳': require('../../assets/stickers-ai/吃我一拳.jpg'),
  'assistant:呆滞': require('../../assets/stickers-ai/呆滞.jpg'),
  'assistant:哭哭': require('../../assets/stickers-ai/哭哭.jpg'),
  'assistant:好喜欢': require('../../assets/stickers-ai/好喜欢.jpg'),
  'assistant:委屈': require('../../assets/stickers-ai/委屈.jpg'),
  'assistant:害羞': require('../../assets/stickers-ai/害羞.jpg'),
  'assistant:幽怨': require('../../assets/stickers-ai/幽怨.jpg'),
  'assistant:得逞': require('../../assets/stickers-ai/得逞.jpg'),
  'assistant:微妙': require('../../assets/stickers-ai/微妙.jpg'),
  'assistant:心虚': require('../../assets/stickers-ai/心虚.jpg'),
  'assistant:拍拍你的脑袋': require('../../assets/stickers-ai/拍拍你的脑袋.jpg'),
  'assistant:揉你的脸': require('../../assets/stickers-ai/揉你的脸.jpg'),
  'assistant:摇尾巴': require('../../assets/stickers-ai/摇尾巴.jpg'),
  'assistant:摇摇': require('../../assets/stickers-ai/摇摇.jpg'),
  'assistant:无能狂怒': require('../../assets/stickers-ai/无能狂怒.jpg'),
  'assistant:星星眼': require('../../assets/stickers-ai/星星眼.jpg'),
  'assistant:杀心': require('../../assets/stickers-ai/杀心.jpg'),
  'assistant:理直气壮地卖萌': require('../../assets/stickers-ai/理直气壮地卖萌.jpg'),
  'assistant:痛哭流涕': require('../../assets/stickers-ai/痛哭流涕.jpg'),
  'assistant:睡了': require('../../assets/stickers-ai/睡了.jpg'),
  'assistant:给你花花（耍帅）': require('../../assets/stickers-ai/给你花花（耍帅）.jpg'),
  'assistant:被打呜呜': require('../../assets/stickers-ai/被打呜呜.jpg'),
  'assistant:请给我': require('../../assets/stickers-ai/请给我.jpg'),
  'assistant:赞！': require('../../assets/stickers-ai/赞！.jpg'),
  'assistant:超震惊': require('../../assets/stickers-ai/超震惊.jpg'),
  'assistant:趴在桌沿看你': require('../../assets/stickers-ai/趴在桌沿看你.jpg'),
  'assistant:蹭蹭': require('../../assets/stickers-ai/蹭蹭.jpg'),
  'assistant:鄙视你': require('../../assets/stickers-ai/鄙视你.jpg'),
  'user:。。。': require('../../assets/stickers-user/。。。.jpg'),
  'user:吃我一拳': require('../../assets/stickers-user/吃我一拳.jpg'),
  'user:呆滞': require('../../assets/stickers-user/呆滞.jpg'),
  'user:哭哭': require('../../assets/stickers-user/哭哭.jpg'),
  'user:好喜欢': require('../../assets/stickers-user/好喜欢.jpg'),
  'user:委屈': require('../../assets/stickers-user/委屈.jpg'),
  'user:害羞': require('../../assets/stickers-user/害羞.jpg'),
  'user:幽怨': require('../../assets/stickers-user/幽怨.jpg'),
  'user:得逞': require('../../assets/stickers-user/得逞.jpg'),
  'user:微妙': require('../../assets/stickers-user/微妙.jpg'),
  'user:心虚': require('../../assets/stickers-user/心虚.jpg'),
  'user:拍拍你的脑袋': require('../../assets/stickers-user/拍拍你的脑袋.jpg'),
  'user:揉你的脸': require('../../assets/stickers-user/揉你的脸.jpg'),
  'user:摇尾巴': require('../../assets/stickers-user/摇尾巴.jpg'),
  'user:摇摇': require('../../assets/stickers-user/摇摇.jpg'),
  'user:无能狂怒': require('../../assets/stickers-user/无能狂怒.jpg'),
  'user:星星眼': require('../../assets/stickers-user/星星眼.jpg'),
  'user:杀心': require('../../assets/stickers-user/杀心.jpg'),
  'user:理直气壮地卖萌': require('../../assets/stickers-user/理直气壮地卖萌.jpg'),
  'user:痛哭流涕': require('../../assets/stickers-user/痛哭流涕.jpg'),
  'user:睡了': require('../../assets/stickers-user/睡了.jpg'),
  'user:给你花花（耍帅）': require('../../assets/stickers-user/给你花花（耍帅）.jpg'),
  'user:被打呜呜': require('../../assets/stickers-user/被打呜呜.jpg'),
  'user:请给我': require('../../assets/stickers-user/请给我.jpg'),
  'user:赞！': require('../../assets/stickers-user/赞！.jpg'),
  'user:超震惊': require('../../assets/stickers-user/超震惊.jpg'),
  'user:趴在桌沿看你': require('../../assets/stickers-user/趴在桌沿看你.jpg'),
  'user:蹭蹭': require('../../assets/stickers-user/蹭蹭.jpg'),
  'user:鄙视你': require('../../assets/stickers-user/鄙视你.jpg'),
};

const STICKER_PATTERN = /\[Sticker:([^\]\r\n]+)\]/g;

export type StickerContentChunk =
  | { type: 'text'; text: string }
  | { type: 'sticker'; sticker: StickerDefinition };

export function normalizeStickerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function createStickerToken(name: string): string {
  return `[Sticker:${normalizeStickerName(name)}]`;
}

export function getStickerImageSource(sticker: CustomSticker): ImageSourcePropType | null {
  if (sticker.uri) return { uri: sticker.uri };
  if (sticker.assetKey && DEFAULT_STICKER_IMAGES[sticker.assetKey]) {
    return DEFAULT_STICKER_IMAGES[sticker.assetKey];
  }
  return null;
}

export function buildStickerDefinitions(stickers: CustomSticker[] | undefined): StickerDefinition[] {
  const seenNames = new Set<string>();

  return (stickers || []).reduce<StickerDefinition[]>((definitions, sticker) => {
    const name = normalizeStickerName(sticker.name);
    const image = getStickerImageSource(sticker);
    if (!name || !image || seenNames.has(name)) return definitions;
    seenNames.add(name);
    definitions.push({
      id: sticker.id,
      name,
      token: createStickerToken(name),
      image,
    });
    return definitions;
  }, []);
}

export function getStickerByName(
  name: string,
  stickers: StickerDefinition[]
): StickerDefinition | undefined {
  const normalizedName = normalizeStickerName(name);
  return stickers.find((sticker) => sticker.name === normalizedName);
}

export function splitStickerContent(
  content: string,
  stickers: StickerDefinition[]
): StickerContentChunk[] {
  const chunks: StickerContentChunk[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(STICKER_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }

    const rawToken = match[0];
    const sticker = getStickerByName(match[1], stickers);
    chunks.push(sticker ? { type: 'sticker', sticker } : { type: 'text', text: rawToken });
    lastIndex = match.index + rawToken.length;
  }

  if (lastIndex < content.length) {
    chunks.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return chunks.length > 0 ? chunks : [{ type: 'text', text: content }];
}

export function hasStickerToken(content: string, stickers: StickerDefinition[]): boolean {
  return splitStickerContent(content, stickers).some((chunk) => chunk.type === 'sticker');
}

export function isStickerOnlyContent(content: string, stickers: StickerDefinition[]): boolean {
  const chunks = splitStickerContent(content, stickers);
  return chunks.some((chunk) => chunk.type === 'sticker') &&
    chunks.every((chunk) => chunk.type === 'sticker' || chunk.text.trim().length === 0);
}

export function buildStickerSystemInstruction(stickers: CustomSticker[] | undefined): string | null {
  const names = buildStickerDefinitions(stickers).map((sticker) => sticker.name);
  if (names.length === 0) return null;

  return `你可以发送表情包。可用表情包：${names.join('、')}。发送时只需要在回复中写对应文本，例如 [Sticker:${names[0]}]；用户端会自动显示为图片。`;
}
