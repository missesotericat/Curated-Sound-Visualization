export interface TrackConfig {
  id: string;
  slug: string;
  number: string;
  title: string;
  subtitle?: string;
  concept: string;
  genre: string[];
  mood: string[];
  themes?: string[];
  contentType?: 'SONG' | 'PODCAST' | 'INSTRUMENTAL' | 'SPOKEN WORD' | 'SOUNDSCAPE' | string;
  lyricLanguages?: string[];
  language: string;
  translationLanguage?: string;
  artwork: string;
  audio: string;
  audioUrl?: string;
  lyrics: string;
  aligned?: string;
  alignedUrl?: string;
  credits?: string;
  aiTools?: string;
  bpm?: number;
  tempo?: number | null;
  duration?: string;
  keySignature?: string;
  key?: string | null;
  aspect?: string;
  colSpanDesktop?: string;
  offsetDesktop?: string;
  description?: string;
  exhibitionNotes?: string;
  year?: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
}

export interface LyricLearningItem {
  phrase: string;
  meaning: string;
  phonetic?: string | null;
  note?: string | null;
  partOfSpeech?: string | null;
}

export type TranslationSource = 'json' | 'generated' | 'missing';
export type TranslationStatus = 'available' | 'missing' | 'pending';

export interface TranslationResult {
  translation: string | null;
  translationSource: TranslationSource;
  translationStatus: TranslationStatus;
}

export interface NormalizedLyricLine {
  id: string;
  section: string;
  startTime: number | null;
  endTime: number | null;
  start?: number | null;
  end?: number | null;
  duration?: number | null;
  original: string;
  originalText?: string;
  translation: string | null;
  translationText?: string | null;
  translationSource?: TranslationSource;
  translationStatus?: TranslationStatus;
  originalLanguage: string | null;
  translationLanguage: string | null;
  confidence?: number | null;
  learning?: LyricLearningItem[] | null;
}

export interface NormalizedLyricSection {
  id: string;
  type: string;
  style?: string | null;
  lines: NormalizedLyricLine[];
}

export interface NormalizedLyricDoc {
  id: string;
  title: string;
  subtitle?: string | null;
  sourceUrl?: string | null;
  platform?: string | null;
  originalLanguage: string | null;
  translationLanguage: string | null;
  languageMode?: string | null;
  version?: string | null;
  duration?: number | null;
  timingStatus: string;
  notes?: string | null;
  lines: NormalizedLyricLine[];
  sections: NormalizedLyricSection[];
}

export type VisualizerMode = 'spectral-bars' | 'fine-frequencies' | 'organic-ring';

export interface AudioMetrics {
  bass: number;
  mid: number;
  treble: number;
  overallVolume: number;
  energy: number;
  isPeak: boolean;
}

