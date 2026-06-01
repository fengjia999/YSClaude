import { ImageSourcePropType } from 'react-native';

export type StickerCatalog = 'assistant' | 'user';

export interface StickerDefinition {
  name: string;
  token: string;
  image: ImageSourcePropType;
}

export const AI_STICKERS: StickerDefinition[] = [
  { name: '。。。', token: '[Sticker:。。。]', image: require('../../assets/stickers-ai/。。。.jpg') },
  { name: '吃我一拳', token: '[Sticker:吃我一拳]', image: require('../../assets/stickers-ai/吃我一拳.jpg') },
  { name: '呆滞', token: '[Sticker:呆滞]', image: require('../../assets/stickers-ai/呆滞.jpg') },
  { name: '哭哭', token: '[Sticker:哭哭]', image: require('../../assets/stickers-ai/哭哭.jpg') },
  { name: '好喜欢', token: '[Sticker:好喜欢]', image: require('../../assets/stickers-ai/好喜欢.jpg') },
  { name: '委屈', token: '[Sticker:委屈]', image: require('../../assets/stickers-ai/委屈.jpg') },
  { name: '害羞', token: '[Sticker:害羞]', image: require('../../assets/stickers-ai/害羞.jpg') },
  { name: '幽怨', token: '[Sticker:幽怨]', image: require('../../assets/stickers-ai/幽怨.jpg') },
  { name: '得逞', token: '[Sticker:得逞]', image: require('../../assets/stickers-ai/得逞.jpg') },
  { name: '微妙', token: '[Sticker:微妙]', image: require('../../assets/stickers-ai/微妙.jpg') },
  { name: '心虚', token: '[Sticker:心虚]', image: require('../../assets/stickers-ai/心虚.jpg') },
  { name: '拍拍你的脑袋', token: '[Sticker:拍拍你的脑袋]', image: require('../../assets/stickers-ai/拍拍你的脑袋.jpg') },
  { name: '揉你的脸', token: '[Sticker:揉你的脸]', image: require('../../assets/stickers-ai/揉你的脸.jpg') },
  { name: '摇尾巴', token: '[Sticker:摇尾巴]', image: require('../../assets/stickers-ai/摇尾巴.jpg') },
  { name: '摇摇', token: '[Sticker:摇摇]', image: require('../../assets/stickers-ai/摇摇.jpg') },
  { name: '无能狂怒', token: '[Sticker:无能狂怒]', image: require('../../assets/stickers-ai/无能狂怒.jpg') },
  { name: '星星眼', token: '[Sticker:星星眼]', image: require('../../assets/stickers-ai/星星眼.jpg') },
  { name: '杀心', token: '[Sticker:杀心]', image: require('../../assets/stickers-ai/杀心.jpg') },
  { name: '理直气壮地卖萌', token: '[Sticker:理直气壮地卖萌]', image: require('../../assets/stickers-ai/理直气壮地卖萌.jpg') },
  { name: '痛哭流涕', token: '[Sticker:痛哭流涕]', image: require('../../assets/stickers-ai/痛哭流涕.jpg') },
  { name: '睡了', token: '[Sticker:睡了]', image: require('../../assets/stickers-ai/睡了.jpg') },
  { name: '给你花花（耍帅）', token: '[Sticker:给你花花（耍帅）]', image: require('../../assets/stickers-ai/给你花花（耍帅）.jpg') },
  { name: '被打呜呜', token: '[Sticker:被打呜呜]', image: require('../../assets/stickers-ai/被打呜呜.jpg') },
  { name: '请给我', token: '[Sticker:请给我]', image: require('../../assets/stickers-ai/请给我.jpg') },
  { name: '赞！', token: '[Sticker:赞！]', image: require('../../assets/stickers-ai/赞！.jpg') },
  { name: '超震惊', token: '[Sticker:超震惊]', image: require('../../assets/stickers-ai/超震惊.jpg') },
  { name: '趴在桌沿看你', token: '[Sticker:趴在桌沿看你]', image: require('../../assets/stickers-ai/趴在桌沿看你.jpg') },
  { name: '蹭蹭', token: '[Sticker:蹭蹭]', image: require('../../assets/stickers-ai/蹭蹭.jpg') },
  { name: '鄙视你', token: '[Sticker:鄙视你]', image: require('../../assets/stickers-ai/鄙视你.jpg') },
];

export const USER_STICKERS: StickerDefinition[] = [
  { name: '。。。', token: '[Sticker:。。。]', image: require('../../assets/stickers-user/。。。.jpg') },
  { name: '吃我一拳', token: '[Sticker:吃我一拳]', image: require('../../assets/stickers-user/吃我一拳.jpg') },
  { name: '呆滞', token: '[Sticker:呆滞]', image: require('../../assets/stickers-user/呆滞.jpg') },
  { name: '哭哭', token: '[Sticker:哭哭]', image: require('../../assets/stickers-user/哭哭.jpg') },
  { name: '好喜欢', token: '[Sticker:好喜欢]', image: require('../../assets/stickers-user/好喜欢.jpg') },
  { name: '委屈', token: '[Sticker:委屈]', image: require('../../assets/stickers-user/委屈.jpg') },
  { name: '害羞', token: '[Sticker:害羞]', image: require('../../assets/stickers-user/害羞.jpg') },
  { name: '幽怨', token: '[Sticker:幽怨]', image: require('../../assets/stickers-user/幽怨.jpg') },
  { name: '得逞', token: '[Sticker:得逞]', image: require('../../assets/stickers-user/得逞.jpg') },
  { name: '微妙', token: '[Sticker:微妙]', image: require('../../assets/stickers-user/微妙.jpg') },
  { name: '心虚', token: '[Sticker:心虚]', image: require('../../assets/stickers-user/心虚.jpg') },
  { name: '拍拍你的脑袋', token: '[Sticker:拍拍你的脑袋]', image: require('../../assets/stickers-user/拍拍你的脑袋.jpg') },
  { name: '揉你的脸', token: '[Sticker:揉你的脸]', image: require('../../assets/stickers-user/揉你的脸.jpg') },
  { name: '摇尾巴', token: '[Sticker:摇尾巴]', image: require('../../assets/stickers-user/摇尾巴.jpg') },
  { name: '摇摇', token: '[Sticker:摇摇]', image: require('../../assets/stickers-user/摇摇.jpg') },
  { name: '无能狂怒', token: '[Sticker:无能狂怒]', image: require('../../assets/stickers-user/无能狂怒.jpg') },
  { name: '星星眼', token: '[Sticker:星星眼]', image: require('../../assets/stickers-user/星星眼.jpg') },
  { name: '杀心', token: '[Sticker:杀心]', image: require('../../assets/stickers-user/杀心.jpg') },
  { name: '理直气壮地卖萌', token: '[Sticker:理直气壮地卖萌]', image: require('../../assets/stickers-user/理直气壮地卖萌.jpg') },
  { name: '痛哭流涕', token: '[Sticker:痛哭流涕]', image: require('../../assets/stickers-user/痛哭流涕.jpg') },
  { name: '睡了', token: '[Sticker:睡了]', image: require('../../assets/stickers-user/睡了.jpg') },
  { name: '给你花花（耍帅）', token: '[Sticker:给你花花（耍帅）]', image: require('../../assets/stickers-user/给你花花（耍帅）.jpg') },
  { name: '被打呜呜', token: '[Sticker:被打呜呜]', image: require('../../assets/stickers-user/被打呜呜.jpg') },
  { name: '请给我', token: '[Sticker:请给我]', image: require('../../assets/stickers-user/请给我.jpg') },
  { name: '赞！', token: '[Sticker:赞！]', image: require('../../assets/stickers-user/赞！.jpg') },
  { name: '超震惊', token: '[Sticker:超震惊]', image: require('../../assets/stickers-user/超震惊.jpg') },
  { name: '趴在桌沿看你', token: '[Sticker:趴在桌沿看你]', image: require('../../assets/stickers-user/趴在桌沿看你.jpg') },
  { name: '蹭蹭', token: '[Sticker:蹭蹭]', image: require('../../assets/stickers-user/蹭蹭.jpg') },
  { name: '鄙视你', token: '[Sticker:鄙视你]', image: require('../../assets/stickers-user/鄙视你.jpg') },
];

const stickerMaps: Record<StickerCatalog, Map<string, StickerDefinition>> = {
  assistant: new Map(AI_STICKERS.map((sticker) => [sticker.name, sticker])),
  user: new Map(USER_STICKERS.map((sticker) => [sticker.name, sticker])),
};

const STICKER_PATTERN = /\[Sticker:([^\]\r\n]+)\]/g;

export type StickerContentChunk =
  | { type: 'text'; text: string }
  | { type: 'sticker'; sticker: StickerDefinition };

export function getStickerByName(
  name: string,
  catalog: StickerCatalog
): StickerDefinition | undefined {
  return stickerMaps[catalog].get(name.trim());
}

export function splitStickerContent(
  content: string,
  catalog: StickerCatalog
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
    const sticker = getStickerByName(match[1], catalog);
    chunks.push(sticker ? { type: 'sticker', sticker } : { type: 'text', text: rawToken });
    lastIndex = match.index + rawToken.length;
  }

  if (lastIndex < content.length) {
    chunks.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return chunks.length > 0 ? chunks : [{ type: 'text', text: content }];
}

export function hasStickerToken(content: string, catalog: StickerCatalog): boolean {
  return splitStickerContent(content, catalog).some((chunk) => chunk.type === 'sticker');
}

export function isStickerOnlyContent(content: string, catalog: StickerCatalog): boolean {
  const chunks = splitStickerContent(content, catalog);
  return chunks.some((chunk) => chunk.type === 'sticker') &&
    chunks.every((chunk) => chunk.type === 'sticker' || chunk.text.trim().length === 0);
}

export function buildStickerSystemInstruction(): string {
  const names = AI_STICKERS.map((sticker) => sticker.name).join('、');
  return `你可以发送表情包。可用表情包：${names}。发送时只需要在回复中写对应文本，例如 [Sticker:好喜欢]；用户端会自动显示为图片。`;
}
