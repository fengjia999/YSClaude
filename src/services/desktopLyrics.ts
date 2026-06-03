import { Platform } from 'react-native';
import {
  addDesktopLyricActionListener,
  hideDesktopLyric,
  showDesktopLyric,
  type DesktopLyricAction,
} from './floatingBall';
import { useMusicStore } from '../stores/music';

let storeUnsubscribe: (() => void) | null = null;
let actionSubscription: { remove: () => void } | null = null;
let lastSignature = '';

export function startDesktopLyricSync(): () => void {
  if (storeUnsubscribe) return stopDesktopLyricSync;

  actionSubscription = addDesktopLyricActionListener(handleDesktopLyricAction);
  storeUnsubscribe = useMusicStore.subscribe((state) => {
    if (Platform.OS !== 'android') return;

    if (!state.desktopLyricsEnabled || !state.isOpen) {
      if (lastSignature) {
        lastSignature = '';
        hideDesktopLyric().catch(() => undefined);
      }
      return;
    }

    const nextState = getDesktopLyricState();
    const signature = [
      nextState.text,
      Math.round(nextState.lyricProgress * 1000),
      nextState.title,
      nextState.artist,
      nextState.artworkUrl,
      nextState.backgroundUri,
      Math.round(nextState.songProgress * 1000),
      nextState.isPlaying ? '1' : '0',
    ].join('|');
    if (signature === lastSignature) return;
    lastSignature = signature;

    showDesktopLyric(
      nextState.text,
      nextState.lyricProgress,
      nextState.title,
      nextState.artist,
      nextState.artworkUrl,
      nextState.songProgress,
      nextState.isPlaying,
      nextState.backgroundUri
    ).catch(() => undefined);
  });

  return stopDesktopLyricSync;
}

export function stopDesktopLyricSync(): void {
  storeUnsubscribe?.();
  actionSubscription?.remove();
  storeUnsubscribe = null;
  actionSubscription = null;
  lastSignature = '';
  hideDesktopLyric().catch(() => undefined);
}

export function refreshDesktopLyric(): void {
  if (Platform.OS !== 'android') return;
  const state = useMusicStore.getState();
  if (!state.desktopLyricsEnabled || !state.isOpen) {
    lastSignature = '';
    hideDesktopLyric().catch(() => undefined);
    return;
  }

  const nextState = getDesktopLyricState();
  lastSignature = '';
  showDesktopLyric(
    nextState.text,
    nextState.lyricProgress,
    nextState.title,
    nextState.artist,
    nextState.artworkUrl,
    nextState.songProgress,
    nextState.isPlaying,
    nextState.backgroundUri
  ).catch(() => undefined);
}

function handleDesktopLyricAction(action: DesktopLyricAction): void {
  const music = useMusicStore.getState();
  if (action === 'previous') {
    music.previous().catch(() => undefined);
    return;
  }
  if (action === 'toggle_play') {
    music.togglePlayPause().catch(() => undefined);
    return;
  }
  if (action === 'next') {
    music.next().catch(() => undefined);
    return;
  }
  if (action === 'close') {
    music.setDesktopLyricsEnabled(false);
    hideDesktopLyric().catch(() => undefined);
  }
}

function getDesktopLyricState(): {
  text: string;
  lyricProgress: number;
  title: string;
  artist: string;
  artworkUrl: string;
  backgroundUri: string;
  songProgress: number;
  isPlaying: boolean;
} {
  const state = useMusicStore.getState();
  const track = state.tracks[state.currentIndex];
  if (!track) {
    return {
      text: '暂无播放歌曲',
      lyricProgress: 0,
      title: '暂无播放歌曲',
      artist: '',
      artworkUrl: '',
      backgroundUri: state.desktopLyricBackgroundUri,
      songProgress: 0,
      isPlaying: false,
    };
  }

  const lyric =
    state.currentLyricIndex >= 0
      ? track.lyrics[state.currentLyricIndex]?.text
      : '';
  const lyricProgress = lyric
    ? getCurrentLyricProgress(state, track.lyrics[state.currentLyricIndex], track.lyrics[state.currentLyricIndex + 1])
    : getBoundedProgress(state.currentTimeMs, 0, state.durationMs);

  return {
    text: lyric || `${track.title} - ${track.artist}`,
    lyricProgress,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl ?? '',
    backgroundUri: state.desktopLyricBackgroundUri,
    songProgress: getBoundedProgress(state.currentTimeMs, 0, state.durationMs),
    isPlaying: state.isPlaying,
  };
}

function getCurrentLyricProgress(
  state: ReturnType<typeof useMusicStore.getState>,
  currentLine: { timeMs: number; durationMs?: number },
  nextLine?: { timeMs: number }
): number {
  const endTimeMs = currentLine.durationMs
    ? currentLine.timeMs + currentLine.durationMs
    : nextLine?.timeMs ?? state.durationMs;
  return getBoundedProgress(state.currentTimeMs, currentLine.timeMs, endTimeMs);
}

function getBoundedProgress(currentTimeMs: number, startTimeMs: number, endTimeMs: number): number {
  const durationMs = Math.max(1, endTimeMs - startTimeMs);
  return Math.min(1, Math.max(0, (currentTimeMs - startTimeMs) / durationMs));
}
