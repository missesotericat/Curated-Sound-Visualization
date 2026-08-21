import { TranslationResult, TranslationSource, TranslationStatus } from '../types';

/**
 * Translation Service with Adapter Architecture and Strict Fallback Hierarchy
 *
 * Architecture Contracts:
 * 1. MANUAL JSON (Highest priority, NEVER overwritten by API or cache)
 *    If a line has a translation in lyrics.json:
 *    -> ALWAYS use it.
 *    -> translationSource: 'json'
 *    -> translationStatus: 'available'
 *    -> Never call external translation APIs or overwrite.
 *
 * 2. GENERATED TRANSLATION (Optional future provider / cache)
 *    Only used when JSON translation is completely absent.
 *    -> translationSource: 'generated'
 *    -> translationStatus: 'available'
 *    -> Stored separately from human-authored JSON.
 *
 * 3. MISSING TRANSLATION (Graceful fallback)
 *    If no JSON translation and no generated translation exists:
 *    -> translation: null
 *    -> translationSource: 'missing'
 *    -> translationStatus: 'missing'
 *    -> Never invent fake text, never replace original lyric, never block playback.
 */

export interface TranslationProvider {
  name: string;
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    context?: { trackId?: string; lineId?: string }
  ): Promise<string | null>;
}

// Separate in-memory cache for generated translations only (isolated from human lyrics)
const generatedMemoryCache = new Map<string, string>();

const GENERATED_STORAGE_KEY = 'translation_generated_cache_v1';

// Load generated cache from localStorage
function loadGeneratedStorageCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(GENERATED_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Graceful handling for sandboxed iframes
  }
  return {};
}

// Save generated cache entry to localStorage (isolated from lyrics/*.json)
function saveGeneratedStorageCache(key: string, value: string) {
  try {
    const current = loadGeneratedStorageCache();
    current[key] = value;
    localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Graceful handling for sandboxed iframes
  }
}

// Canonical cache key for generated translations
export function getTranslationCacheKey(
  trackId: string,
  lineId: string,
  sourceLang: string,
  targetLang: string
): string {
  const cleanTrack = (trackId || 'unknown').toLowerCase().trim();
  const cleanLine = (lineId || 'l0').toLowerCase().trim();
  const cleanSrc = (sourceLang || 'src').toLowerCase().trim();
  const cleanTgt = (targetLang || 'tgt').toLowerCase().trim();
  return `${cleanTrack}:${cleanLine}:${cleanSrc}:${cleanTgt}`;
}

/**
 * Curated Exhibition Poetic Translation Catalog for tracks where JSON translation
 * is not yet explicitly authored into the local JSON file.
 * Registered as the default translation provider adapter.
 */
const CURATED_EXHIBITION_TRANSLATIONS: Record<string, string> = {
  // Utopia
  'utopia:v1-01:en:vi': 'Tìm kiếm trên radar, gần và xa',
  'utopia:v1-02:en:vi': 'Không bản đồ, không mục đích, tìm kiếm một ân điển định sẵn.',
  'utopia:v1-03:en:vi': 'Ta mải miết tìm một tọa độ',
  'utopia:v1-04:en:vi': 'Nhưng địa đàng không phải là một bến đỗ, đó là không gian ta tự định nghĩa.',
  'utopia:c-01:en:vi': 'Utopia không nằm trên bản đồ hay một miền đất hứa.',
  'utopia:c-02:en:vi': 'Nó là tần số ta cùng cộng hưởng.',
  'utopia:c-03:en:vi': 'Giữa muôn vàn hỗn loạn và tiếng ồn,',
  'utopia:c-04:en:vi': 'Nơi nào có sự thấu cảm, nơi đó chính là quê hương.',

  // Cốt Cách 5.0
  'cot-cach-5:v1-01:vi:en': 'Born into the stream of digital codes and algorithms',
  'cot-cach-5:v1-02:vi:en': 'Silicon pulse beats alongside human breath',
  'cot-cach-5:v1-03:vi:en': 'Traditions weave through the neon mist of tomorrow',
  'cot-cach-5:v1-04:vi:en': 'Preserving soul integrity across fifth-generation dimensions',
  'cot-cach-5:c-01:vi:en': 'Dignity 5.0 — Unshaken in the era of artificial light',
  'cot-cach-5:c-02:vi:en': 'Rooted in heritage, flying into the quantum dawn',

  // Lỡ Cả Đời Này Không Rực Rỡ
  'lo-ca-doi-nay-khong-ruc-ro:v1-01:vi:en': 'What if this entire lifetime never turns brilliant and dazzling?',
  'lo-ca-doi-nay-khong-ruc-ro:v1-02:vi:en': 'Walking through quiet streets beneath gentle amber streetlamps',
  'lo-ca-doi-nay-khong-ruc-ro:v1-03:vi:en': 'Ordinary days flowing softly like autumn river water',
  'lo-ca-doi-nay-khong-ruc-ro:c-01:vi:en': 'Even if no fireworks illuminate our personal sky',
  'lo-ca-doi-nay-khong-ruc-ro:c-02:vi:en': 'Existing authentically is already our greatest quiet masterpiece',

  // New Beginning
  'new-beginning:v1-01:en:vi': 'Vết nứt trên gương soi rọi con người mới',
  'new-beginning:v1-02:en:vi': 'Rũ bỏ tàn tro của những ngày hôm qua',
  'new-beginning:v1-03:en:vi': 'Bình minh đang thức giấc trên từng nhịp thở',
  'new-beginning:c-01:en:vi': 'Khởi đầu mới — mở cánh cửa bước vào vùng ánh sáng',
  'new-beginning:c-02:en:vi': 'Viết tiếp câu chuyện của lòng dũng cảm',

  // Brain Rot
  'brain-rot:v1-01:en:vi': 'Cuộn vô tận qua những luồng thông tin ngắn hạn',
  'brain-rot:v1-02:en:vi': 'Tâm trí phân mảnh giữa biển thông báo',
  'brain-rot:c-01:en:vi': 'Ngắt kết nối để tìm lại sự tĩnh lặng của nhận thức',
  'brain-rot:c-02:en:vi': 'Thoát khỏi vòng lặp dopamine ảo giác',

  // Zombie Society
  'zombie-society:v1-01:en:vi': 'Những bước chân vô hồn trên vỉa hè giờ cao điểm',
  'zombie-society:v1-02:en:vi': 'Ánh sáng màn hình phản chiếu trong đôi mắt mệt mỏi',
  'zombie-society:c-01:en:vi': 'Đánh thức bản ngã giữa xã hội tự động hóa',
  'zombie-society:c-02:en:vi': 'Tìm lại nhịp đập chân thật của trái tim con người'
};

/**
 * Curated Exhibition Adapter implementing TranslationProvider
 */
export class CuratedExhibitionProvider implements TranslationProvider {
  name = 'CuratedExhibitionCatalog';

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    context?: { trackId?: string; lineId?: string }
  ): Promise<string | null> {
    if (!text || text.trim().length === 0) return null;

    if (context?.trackId && context?.lineId) {
      const directKey = getTranslationCacheKey(context.trackId, context.lineId, sourceLang, targetLang);
      if (CURATED_EXHIBITION_TRANSLATIONS[directKey]) {
        return CURATED_EXHIBITION_TRANSLATIONS[directKey];
      }

      // Loose prefix matching
      const prefix = `${context.trackId.toLowerCase()}:${context.lineId.toLowerCase()}`;
      for (const [k, val] of Object.entries(CURATED_EXHIBITION_TRANSLATIONS)) {
        if (k.startsWith(prefix)) {
          return val;
        }
      }
    }

    return null;
  }
}

// Active provider instance
let activeTranslationProvider: TranslationProvider | null = new CuratedExhibitionProvider();

/**
 * Register a pluggable translation provider (e.g. Gemini, Google Cloud Translation, custom API)
 */
export function setTranslationProvider(provider: TranslationProvider | null) {
  activeTranslationProvider = provider;
}

/**
 * Get current translation provider
 */
export function getTranslationProvider(): TranslationProvider | null {
  return activeTranslationProvider;
}

/**
 * Main Translation Abstraction adhering strictly to the priority hierarchy:
 *
 * 1. MANUAL JSON (Highest Priority)
 *    If explicitJsonTranslation is provided and not empty -> returns immediately as 'json'.
 *    NEVER calls provider, NEVER overwritten by cache.
 *
 * 2. GENERATED CACHE / PROVIDER
 *    Only queried when JSON translation is completely absent.
 *    If provider returns result -> saved to separate generated cache, returned as 'generated'.
 *
 * 3. MISSING STATE
 *    If no JSON translation and no provider returns text -> returned gracefully as 'missing'.
 *    Audio playback and original lyric rendering continue without interruption.
 */
export async function translateLyricLine(params: {
  trackId?: string;
  lineId?: string;
  originalText: string;
  explicitJsonTranslation?: string | null;
  sourceLanguage?: string;
  targetLanguage?: string;
}): Promise<TranslationResult> {
  const {
    trackId = 'track',
    lineId = 'line',
    originalText,
    explicitJsonTranslation,
    sourceLanguage = 'SOURCE',
    targetLanguage = 'TARGET'
  } = params;

  // PRIORITY 1: MANUAL JSON — Absolute Source of Truth
  if (explicitJsonTranslation && explicitJsonTranslation.trim().length > 0) {
    return {
      translation: explicitJsonTranslation.trim(),
      translationSource: 'json',
      translationStatus: 'available'
    };
  }

  // PRIORITY 2: Check Separate Generated Cache
  const cacheKey = getTranslationCacheKey(trackId, lineId, sourceLanguage, targetLanguage);

  if (generatedMemoryCache.has(cacheKey)) {
    return {
      translation: generatedMemoryCache.get(cacheKey)!,
      translationSource: 'generated',
      translationStatus: 'available'
    };
  }

  const localStored = loadGeneratedStorageCache()[cacheKey];
  if (localStored && localStored.trim().length > 0) {
    generatedMemoryCache.set(cacheKey, localStored.trim());
    return {
      translation: localStored.trim(),
      translationSource: 'generated',
      translationStatus: 'available'
    };
  }

  // PRIORITY 3: Call Optional Pluggable Translation Provider
  if (activeTranslationProvider && originalText && originalText.trim().length > 0) {
    try {
      const result = await activeTranslationProvider.translate(
        originalText,
        sourceLanguage,
        targetLanguage,
        { trackId, lineId }
      );

      if (result && result.trim().length > 0) {
        const cleanResult = result.trim();
        generatedMemoryCache.set(cacheKey, cleanResult);
        saveGeneratedStorageCache(cacheKey, cleanResult);
        return {
          translation: cleanResult,
          translationSource: 'generated',
          translationStatus: 'available'
        };
      }
    } catch (err) {
      // Failure Handling: Non-blocking graceful degradation
      console.warn('[TRANSLATION PROVIDER DEGRADATION]', cacheKey, err);
    }
  }

  // PRIORITY 4: Graceful Missing State (Never invent fake text, never block playback)
  return {
    translation: null,
    translationSource: 'missing',
    translationStatus: 'missing'
  };
}

/**
 * Synchronous cache lookup for instantaneous layout rendering
 */
export function getCachedTranslationSync(
  trackId: string,
  lineId: string,
  sourceLanguage: string,
  targetLanguage: string,
  explicitJsonTranslation?: string | null
): TranslationResult {
  // PRIORITY 1: JSON Translation always wins
  if (explicitJsonTranslation && explicitJsonTranslation.trim().length > 0) {
    return {
      translation: explicitJsonTranslation.trim(),
      translationSource: 'json',
      translationStatus: 'available'
    };
  }

  // PRIORITY 2: Generated Cache
  const cacheKey = getTranslationCacheKey(trackId, lineId, sourceLanguage, targetLanguage);
  if (generatedMemoryCache.has(cacheKey)) {
    return {
      translation: generatedMemoryCache.get(cacheKey)!,
      translationSource: 'generated',
      translationStatus: 'available'
    };
  }

  const localStored = loadGeneratedStorageCache()[cacheKey];
  if (localStored && localStored.trim().length > 0) {
    generatedMemoryCache.set(cacheKey, localStored.trim());
    return {
      translation: localStored.trim(),
      translationSource: 'generated',
      translationStatus: 'available'
    };
  }

  // Check curated offline catalog as synchronous generated fallback
  if (CURATED_EXHIBITION_TRANSLATIONS[cacheKey]) {
    const cur = CURATED_EXHIBITION_TRANSLATIONS[cacheKey];
    generatedMemoryCache.set(cacheKey, cur);
    return {
      translation: cur,
      translationSource: 'generated',
      translationStatus: 'available'
    };
  }

  // MISSING
  return {
    translation: null,
    translationSource: 'missing',
    translationStatus: 'missing'
  };
}

/**
 * Compatibility wrapper returning string or null
 */
export async function getLyricLineTranslation(params: {
  trackId: string;
  lineId: string;
  originalText: string;
  explicitJsonTranslation?: string | null;
  sourceLanguage?: string;
  targetLanguage?: string;
}): Promise<string | null> {
  const res = await translateLyricLine(params);
  return res.translation;
}

// Export canonical cache key generator under original alias for backward compatibility
export const getCacheKey = getTranslationCacheKey;
