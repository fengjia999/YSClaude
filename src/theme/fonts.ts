import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type FontKey = 'regular' | 'bold' | 'mono' | 'serif' | 'serifBold' | 'serifStrong';
type FontFamily = TextStyle['fontFamily'];
type FontWeight = TextStyle['fontWeight'];

const configuredLocalFonts =
  ((Constants.expoConfig?.extra as { localFonts?: Partial<Record<FontKey, boolean>> } | undefined)
    ?.localFonts) ?? {};

function hasBundledFont(key: FontKey): boolean {
  return configuredLocalFonts[key] === true;
}

const bundledFonts: Record<FontKey, string> = {
  regular: 'Sohne-Buch',
  bold: 'Sohne-Halbfett',
  mono: 'SohneMono-Buch',
  serif: 'TiemposText',
  serifBold: 'TiemposText-bold',
  serifStrong: 'TiemposText-bold2',
};

const systemFonts: Record<FontKey, FontFamily> = {
  regular: Platform.select({ android: 'sans-serif', default: undefined }),
  bold: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: undefined }),
  serifBold: Platform.select({ ios: 'Georgia-Bold', android: 'serif', default: undefined }),
  serifStrong: Platform.select({ ios: 'Georgia-Bold', android: 'serif', default: undefined }),
};

function fontFamily(key: FontKey): FontFamily {
  return hasBundledFont(key) ? bundledFonts[key] : systemFonts[key];
}

export const localFonts: Record<FontKey, boolean> = {
  regular: hasBundledFont('regular'),
  bold: hasBundledFont('bold'),
  mono: hasBundledFont('mono'),
  serif: hasBundledFont('serif'),
  serifBold: hasBundledFont('serifBold'),
  serifStrong: hasBundledFont('serifStrong'),
};

export const fontWeights: Record<'serifBold' | 'serifStrong', FontWeight> = {
  serifBold: localFonts.serifBold ? 'normal' : '700',
  serifStrong: localFonts.serifStrong ? 'normal' : '800',
};

export const fonts: Record<FontKey, FontFamily> = {
  regular: fontFamily('regular'),
  bold: fontFamily('bold'),
  mono: fontFamily('mono'),
  serif: fontFamily('serif'),
  serifBold: fontFamily('serifBold'),
  serifStrong: fontFamily('serifStrong'),
};
