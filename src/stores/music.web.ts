import { create } from 'zustand';

export type PlayOrder = 'list' | 'repeat-one' | 'shuffle';

export interface LyricLine {
  timeMs: number;
  durationMs?: number;
  text: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  sourceUrl?: string;
  durationMs?: number;
  lyrics: LyricLine[];
  source?: 'netease' | 'demo' | 'local' | 'radio';
  availability?: 'playable' | 'unresolved' | 'vip_required' | 'copyright_blocked';
}

interface MusicState {
  _hydrated: boolean;
  tracks: MusicTrack[];
  currentIndex: number;
  order: PlayOrder;
  isOpen: boolean;
  isMinimized: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  autoAdvanceEnabled: boolean;
  lastFinishedTrackId: string | null;
  desktopLyricsEnabled: boolean;
  desktopLyricBackgroundUri: string;
  currentTimeMs: number;
  durationMs: number;
  currentLyricIndex: number;
  error: string | null;
  openPlayer: () => void;
  minimizePlayer: () => void;
  closePlayer: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  playTrackAt: (index: number) => Promise<void>;
  seekTo: (timeMs: number) => Promise<void>;
  setOrder: (order: PlayOrder) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  setDesktopLyricsEnabled: (enabled: boolean) => void;
  setDesktopLyricBackgroundUri: (uri: string) => void;
  replaceTracks: (tracks: MusicTrack[]) => void;
  getListeningContextPrompt: () => string | null;
  preloadTrackWindow: (centerIndex: number) => Promise<void>;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  _hydrated: true,
  tracks: [],
  currentIndex: 0,
  order: 'list',
  isOpen: false,
  isMinimized: false,
  isPlaying: false,
  isBuffering: false,
  autoAdvanceEnabled: false,
  lastFinishedTrackId: null,
  desktopLyricsEnabled: false,
  desktopLyricBackgroundUri: '',
  currentTimeMs: 0,
  durationMs: 0,
  currentLyricIndex: -1,
  error: null,
  openPlayer: () => set({ isOpen: true, isMinimized: false }),
  minimizePlayer: () => set({ isMinimized: true }),
  closePlayer: async () => set({ isOpen: false, isPlaying: false }),
  play: async () => set({ isPlaying: true, isOpen: true }),
  pause: async () => set({ isPlaying: false }),
  togglePlayPause: async () => set({ isPlaying: !get().isPlaying, isOpen: true }),
  next: async () => set((state) => ({ currentIndex: Math.min(state.currentIndex + 1, Math.max(0, state.tracks.length - 1)) })),
  previous: async () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
  playTrackAt: async (index: number) => set({ currentIndex: index, isPlaying: true, isOpen: true }),
  seekTo: async (timeMs: number) => set({ currentTimeMs: timeMs }),
  setOrder: (order: PlayOrder) => set({ order }),
  setAutoAdvanceEnabled: (enabled: boolean) => set({ autoAdvanceEnabled: enabled }),
  setDesktopLyricsEnabled: (enabled: boolean) => set({ desktopLyricsEnabled: enabled }),
  setDesktopLyricBackgroundUri: (uri: string) => set({ desktopLyricBackgroundUri: uri }),
  replaceTracks: (tracks: MusicTrack[]) => set({ tracks, currentIndex: 0 }),
  getListeningContextPrompt: () => null,
  preloadTrackWindow: async () => undefined,
}));
