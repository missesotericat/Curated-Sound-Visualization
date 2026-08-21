import {
  NormalizedLyricDoc,
  NormalizedLyricSection,
  NormalizedLyricLine,
  LyricLearningItem
} from '../types';
import { GITHUB_RAW_BASE_URL } from '../config/tracks';

const lyricCache: Map<string, NormalizedLyricDoc> = new Map();

/**
 * Helper to parse "MM:SS" duration string into seconds
 */
export function parseDurationToSeconds(durationStr?: string, defaultSecs = 240): number {
  if (!durationStr) return defaultSecs;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return defaultSecs;
}

/**
 * Standardizes raw language array/string representations into clean uppercase identifiers
 */
export function extractDocLanguages(raw: any): {
  originalLanguage: string | null;
  translationLanguage: string | null;
} {
  let originalLanguage: string | null = null;
  let translationLanguage: string | null = null;

  if (Array.isArray(raw?.language) && raw.language.length > 0) {
    if (raw.language.length === 1) {
      originalLanguage = typeof raw.language[0] === 'string' ? raw.language[0].toUpperCase() : null;
    } else {
      // E.g. ["en", "vi"] -> "EN + VI" or bilingual representation
      originalLanguage = raw.language.map((l: any) => String(l).toUpperCase()).join(' + ');
      // If there's a second language and mode is translation/bilingual
      translationLanguage = typeof raw.language[1] === 'string' ? raw.language[1].toUpperCase() : null;
    }
  } else if (typeof raw?.language === 'string' && raw.language.trim().length > 0) {
    originalLanguage = raw.language.toUpperCase();
  }

  if (typeof raw?.translationLanguage === 'string' && raw.translationLanguage.trim().length > 0) {
    translationLanguage = raw.translationLanguage.toUpperCase();
  }

  return { originalLanguage, translationLanguage };
}

/**
 * Fetches JSON resource with graceful failure
 */
async function fetchJsonSafe(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Merges author human-written lyrics (`/lyrics/<slug>.json`) with machine alignment timing (`/aligned/<slug>.json`).
 * 
 * ARCHITECTURE CONTRACT:
 * - `lyrics.json` is the SOLE SOURCE OF TRUTH for:
 *   - Human-authored lyric text
 *   - Translation text
 *   - Section structure & editorial naming
 *   - Linguistic metadata & notes
 * - `aligned.json` is the SOLE SOURCE OF TRUTH for:
 *   - Line start / end timestamps
 *   - Duration
 *   - Alignment confidence score
 * - Whisper/machine text NEVER overwrites original human-authored lyrics.
 */
export function mergeLyricsAndAlignment(
  lyricDocRaw: any,
  alignedDocRaw: any,
  slug: string,
  fallbackDuration = 240
): NormalizedLyricDoc {
  if (!lyricDocRaw && !alignedDocRaw) {
    return buildFallbackNormalizedDoc(slug, fallbackDuration);
  }

  // Use lyric doc as primary base; if absent, gracefully use aligned doc
  const baseDoc = lyricDocRaw || alignedDocRaw;

  const docId = typeof baseDoc.id === 'string' ? baseDoc.id : slug;
  const title = typeof baseDoc.title === 'string' ? baseDoc.title : docId.replace(/-/g, ' ').toUpperCase();
  const subtitle = typeof baseDoc.subtitle === 'string' ? baseDoc.subtitle : null;

  const { originalLanguage, translationLanguage } = extractDocLanguages(baseDoc);
  const languageMode = typeof baseDoc.languageMode === 'string' ? baseDoc.languageMode : (Array.isArray(baseDoc.language) && baseDoc.language.length > 1 ? 'bilingual' : null);
  const version = typeof baseDoc.version === 'string' ? baseDoc.version : null;
  const notes = typeof baseDoc.notes === 'string' ? baseDoc.notes : (alignedDocRaw?.notes || null);

  let sourceUrl: string | null = null;
  let platform: string | null = null;
  if (baseDoc.source && typeof baseDoc.source === 'object') {
    sourceUrl = typeof baseDoc.source.url === 'string' ? baseDoc.source.url : null;
    platform = typeof baseDoc.source.platform === 'string' ? baseDoc.source.platform : null;
  } else if (typeof baseDoc.source === 'string') {
    sourceUrl = baseDoc.source;
  }

  const duration =
    typeof baseDoc.duration === 'number' && baseDoc.duration > 0
      ? baseDoc.duration
      : typeof alignedDocRaw?.duration === 'number' && alignedDocRaw.duration > 0
      ? alignedDocRaw.duration
      : fallbackDuration;

  // Build timing lookup map from alignedDoc: map by lineId and composite [sectionIndex:lineIndex]
  const timingMapById = new Map<string, { start: number; end: number; duration?: number; confidence?: number }>();
  const timingListOrdered: Array<{ start: number; end: number; duration?: number; confidence?: number }> = [];

  if (alignedDocRaw && Array.isArray(alignedDocRaw.sections)) {
    alignedDocRaw.sections.forEach((sec: any) => {
      const lines = Array.isArray(sec.lines) ? sec.lines : [];
      lines.forEach((l: any) => {
        if (typeof l.start === 'number' && !isNaN(l.start) && typeof l.end === 'number' && !isNaN(l.end)) {
          const timingObj = {
            start: l.start,
            end: l.end,
            duration: typeof l.duration === 'number' ? l.duration : l.end - l.start,
            confidence: typeof l.confidence === 'number' ? l.confidence : 1.0
          };
          if (typeof l.id === 'string') {
            timingMapById.set(l.id, timingObj);
          }
          timingListOrdered.push(timingObj);
        }
      });
    });
  }

  const sectionsSource: any[] = Array.isArray(baseDoc.sections) ? baseDoc.sections : [];
  let flatLineGlobalIndex = 0;
  let hasExplicitTimestamps = timingMapById.size > 0;

  // Fallback timeline calculation if neither aligned file nor lyrics has explicit timing
  let totalLineCount = 0;
  sectionsSource.forEach((s: any) => {
    totalLineCount += Array.isArray(s.lines) ? s.lines.length : 0;
  });

  const introDelay = Math.min(7, Math.max(3, duration * 0.025));
  const outroCushion = Math.min(8, Math.max(4, duration * 0.035));
  const activePlayDuration = Math.max(30, duration - introDelay - outroCushion);
  const timePerLine = totalLineCount > 0 ? activePlayDuration / totalLineCount : 4.0;
  let currentTimelineCursor = introDelay;

  const normalizedSections: NormalizedLyricSection[] = [];
  const allNormalizedLines: NormalizedLyricLine[] = [];

  sectionsSource.forEach((sec: any, secIdx: number) => {
    const secId = typeof sec.id === 'string' ? sec.id : `section-${secIdx + 1}`;
    const secType = typeof sec.type === 'string' ? sec.type : secId;
    const secStyle = typeof sec.style === 'string' ? sec.style : null;
    const rawLines: any[] = Array.isArray(sec.lines) ? sec.lines : [];

    const sectionLines: NormalizedLyricLine[] = [];

    rawLines.forEach((line: any, lineIdx: number) => {
      const lineId = typeof line.id === 'string' ? line.id : `${secId}-l${lineIdx + 1}`;

      // 1. Text from Human-Authored Lyric Source (PROTECTED from machine overwrite)
      let originalText = '';
      if (typeof line.text === 'string') {
        originalText = line.text;
      } else if (typeof line.original === 'string') {
        originalText = line.original;
      } else if (typeof line.lyric === 'string') {
        originalText = line.lyric;
      } else if (typeof line === 'string') {
        originalText = line;
      }

      // 2. Translation from Human-Authored Lyric Source
      let translationText: string | null = null;
      if (typeof line.translation === 'string' && line.translation.trim().length > 0) {
        translationText = line.translation.trim();
      } else if (typeof line.trans === 'string' && line.trans.trim().length > 0) {
        translationText = line.trans.trim();
      }

      // 3. Timing: Aligned timing map takes precedence, then author timestamps, then proportional timeline
      let startTime: number | null = null;
      let endTime: number | null = null;
      let confidence: number | null = null;
      let lineDuration: number | null = null;

      const alignedTiming = timingMapById.get(lineId) || timingListOrdered[flatLineGlobalIndex];

      if (alignedTiming) {
        startTime = alignedTiming.start;
        endTime = alignedTiming.end;
        lineDuration = alignedTiming.duration || (endTime - startTime);
        confidence = alignedTiming.confidence ?? 1.0;
        hasExplicitTimestamps = true;
      } else if (typeof line.start === 'number' && !isNaN(line.start) && typeof line.end === 'number' && !isNaN(line.end)) {
        startTime = line.start;
        endTime = line.end;
        lineDuration = endTime - startTime;
        confidence = typeof line.confidence === 'number' ? line.confidence : 1.0;
        hasExplicitTimestamps = true;
      } else {
        const lineStart = Math.round(currentTimelineCursor * 100) / 100;
        const lineEnd = Math.round((lineStart + Math.max(2.5, timePerLine * 0.95)) * 100) / 100;
        startTime = lineStart;
        endTime = lineEnd;
        lineDuration = Math.round((lineEnd - lineStart) * 100) / 100;
        confidence = null;
        currentTimelineCursor += timePerLine;
      }

      // 4. Learning Items
      let learningItems: LyricLearningItem[] | null = null;
      if (Array.isArray(line.learning) && line.learning.length > 0) {
        learningItems = line.learning
          .map((item: any) => ({
            phrase: typeof item.phrase === 'string' ? item.phrase : '',
            meaning: typeof item.meaning === 'string' ? item.meaning : '',
            phonetic: typeof item.phonetic === 'string' ? item.phonetic : null,
            note: typeof item.note === 'string' ? item.note : null,
            partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : null
          }))
          .filter((item: LyricLearningItem) => item.phrase.length > 0);

        if (learningItems.length === 0) {
          learningItems = null;
        }
      }

      const hasJsonTranslation = typeof translationText === 'string' && translationText.length > 0;

      const normalizedLine: NormalizedLyricLine = {
        id: lineId,
        section: secType,
        startTime,
        endTime,
        start: startTime,
        end: endTime,
        duration: lineDuration,
        original: originalText,
        originalText,
        translation: translationText,
        translationText,
        translationSource: hasJsonTranslation ? 'json' : 'missing',
        translationStatus: hasJsonTranslation ? 'available' : 'missing',
        originalLanguage,
        translationLanguage,
        confidence,
        learning: learningItems
      };

      sectionLines.push(normalizedLine);
      allNormalizedLines.push(normalizedLine);
      flatLineGlobalIndex++;
    });

    normalizedSections.push({
      id: secId,
      type: secType,
      style: secStyle,
      lines: sectionLines
    });
  });

  return {
    id: docId,
    title,
    subtitle,
    sourceUrl,
    platform,
    originalLanguage,
    translationLanguage,
    languageMode,
    version,
    duration,
    timingStatus: hasExplicitTimestamps ? 'synced' : 'proportional-timeline',
    notes,
    lines: allNormalizedLines,
    sections: normalizedSections
  };
}

/**
 * Fetches both human lyrics and machine-aligned timing files, merging them according to architecture contracts.
 */
export async function fetchTrackLyrics(slug: string, fallbackDuration = 240): Promise<NormalizedLyricDoc | null> {
  const cacheKey = `${slug}_${fallbackDuration}`;
  if (lyricCache.has(cacheKey)) {
    return lyricCache.get(cacheKey)!;
  }

  const lyricUrl = `${GITHUB_RAW_BASE_URL}lyrics/${slug}.json`;
  const alignedUrl = `${GITHUB_RAW_BASE_URL}aligned/${slug}.json`;

  try {
    const [lyricData, alignedData] = await Promise.all([
      fetchJsonSafe(lyricUrl),
      fetchJsonSafe(alignedUrl)
    ]);

    if (!lyricData && !alignedData) {
      throw new Error(`Failed to load lyric resources for ${slug}`);
    }

    const normalized = mergeLyricsAndAlignment(lyricData, alignedData, slug, fallbackDuration);
    lyricCache.set(cacheKey, normalized);
    return normalized;
  } catch {
    const fallback = buildFallbackNormalizedDoc(slug, fallbackDuration);
    lyricCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Normalizes any raw JSON lyric document (compatibility wrapper)
 */
export function parseRawLyricDoc(raw: any, slugFallback?: string, defaultDuration = 240): NormalizedLyricDoc {
  return mergeLyricsAndAlignment(raw, null, slugFallback || 'unknown', defaultDuration);
}

function buildFallbackNormalizedDoc(slug: string, duration = 240): NormalizedLyricDoc {
  return {
    id: slug,
    title: slug.replace(/-/g, ' ').toUpperCase(),
    subtitle: null,
    sourceUrl: null,
    platform: null,
    originalLanguage: 'SOURCE',
    translationLanguage: null,
    languageMode: 'bilingual',
    version: 'original',
    duration,
    timingStatus: 'untimed',
    notes: 'Normalized fallback representation.',
    lines: [],
    sections: []
  };
}
