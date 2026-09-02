import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { NormalizedLyricDoc, NormalizedLyricLine, LyricLearningItem, TrackConfig } from '../types';
import { Sparkles, BookOpen, Radio } from 'lucide-react';
import {
  getCachedTranslationSync,
  translateLyricLine,
  getLyricLineTranslation
} from '../services/translationService';

interface SynchronizedLyricsViewProps {
  lyrics: NormalizedLyricDoc | null;
  currentTime: number;
  onSeek: (time: number) => void;
  track?: TrackConfig | null;
  showLearningMode?: boolean;
  onToggleLearningMode?: () => void;
  onSelectLearningItem?: (item: LyricLearningItem) => void;
  className?: string;
}

function formatLanguageName(codeOrName: string): string {
  const clean = codeOrName.trim().toUpperCase();
  if (clean === 'EN' || clean === 'ENG' || clean === 'ENGLISH') return 'ENGLISH';
  if (clean === 'VI' || clean === 'VIE' || clean === 'VIETNAMESE') return 'VIETNAMESE';
  if (clean === 'FR' || clean === 'FRENCH') return 'FRENCH';
  if (clean === 'JA' || clean === 'JAPANESE') return 'JAPANESE';
  if (clean === 'KO' || clean === 'KOREAN') return 'KOREAN';
  if (clean === 'ZH' || clean === 'CHINESE') return 'CHINESE';
  return clean;
}

export function detectLinguisticMetadata(lyrics: NormalizedLyricDoc | null, track?: TrackConfig | null) {
  let sourceLanguage = 'SOURCE';
  let targetLanguage = 'TRANSLATION';

  const rawTrackLang = track?.language?.trim() || '';
  const rawTrackTrans = track?.translationLanguage?.trim() || '';
  const rawLyricOrig = lyrics?.originalLanguage?.trim() || '';
  const rawLyricTrans = lyrics?.translationLanguage?.trim() || '';

  // 1. Determine Source (Original) Language(s)
  if (rawLyricOrig) {
    if (rawLyricOrig.includes('+') || rawLyricOrig.includes('/')) {
      const parts = rawLyricOrig.split(/[+/]/).map((p) => formatLanguageName(p));
      sourceLanguage = parts.join(' + ');
    } else {
      sourceLanguage = formatLanguageName(rawLyricOrig);
    }
  } else if (rawTrackLang) {
    if (rawTrackLang.includes('+') || rawTrackLang.includes('/') || lyrics?.languageMode === 'bilingual') {
      const parts = rawTrackLang.split(/[+/]/).map((p) => formatLanguageName(p));
      sourceLanguage = parts.join(' + ');
    } else {
      sourceLanguage = formatLanguageName(rawTrackLang);
    }
  }

  // 2. Determine Translation Target Language
  if (rawLyricTrans) {
    targetLanguage = formatLanguageName(rawLyricTrans);
  } else if (rawTrackTrans) {
    targetLanguage = formatLanguageName(rawTrackTrans);
  } else {
    // If not specified in data, dynamically pair with opposite language
    if (sourceLanguage === 'ENGLISH' || sourceLanguage.startsWith('ENGLISH')) {
      targetLanguage = 'VIETNAMESE';
    } else if (sourceLanguage === 'VIETNAMESE' || sourceLanguage.startsWith('VIETNAMESE')) {
      targetLanguage = 'ENGLISH';
    } else {
      targetLanguage = 'TRANSLATION';
    }
  }

  return {
    sourceLanguage,
    targetLanguage
  };
}

export const SynchronizedLyricsView: React.FC<SynchronizedLyricsViewProps> = ({
  lyrics,
  currentTime,
  onSeek,
  track,
  showLearningMode = false,
  onToggleLearningMode,
  onSelectLearningItem,
  className = ''
}) => {
  const lyricViewportRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const prevActiveLineIdRef = useRef<string | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Tracks whether the user has manually scrolled away from auto-follow
  const [isUserScrolled, setIsUserScrolled] = useState<boolean>(false);

  // Dynamic async translations state for lines without explicit JSON translations
  const [resolvedTranslations, setResolvedTranslations] = useState<Record<string, string>>({});

  const trackId = track?.slug || track?.id || lyrics?.id || 'unknown-track';
  const { sourceLanguage, targetLanguage } = detectLinguisticMetadata(lyrics, track);

  // Flatten all lines across all sections for fast O(N) timeline lookup
  const allLines = useMemo(() => {
    if (!lyrics?.sections) return [];
    return lyrics.sections.flatMap((s) => s.lines);
  }, [lyrics]);

  // Load translations adhering strictly to fallback hierarchy
  useEffect(() => {
    if (!lyrics?.sections) return;

    let isMounted = true;
    const initialResolved: Record<string, string> = {};

    // 1. Synchronous pass (Rule #1 JSON or cached)
    allLines.forEach((line) => {
      // JSON takes absolute priority #1
      if (line.translation && line.translation.trim().length > 0) {
        initialResolved[line.id] = line.translation.trim();
      } else {
        const cachedRes = getCachedTranslationSync(
          trackId,
          line.id,
          sourceLanguage,
          targetLanguage,
          line.translation
        );
        if (cachedRes.translation) {
          initialResolved[line.id] = cachedRes.translation;
        }
      }
    });

    setResolvedTranslations(initialResolved);

    // 2. Asynchronous pass for any missing line
    allLines.forEach((line) => {
      if (!initialResolved[line.id]) {
        translateLyricLine({
          trackId,
          lineId: line.id,
          originalText: line.originalText || line.original,
          explicitJsonTranslation: line.translation,
          sourceLanguage,
          targetLanguage
        }).then((res) => {
          if (isMounted && res.translation) {
            setResolvedTranslations((prev) => ({
              ...prev,
              [line.id]: res.translation!
            }));
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [lyrics, trackId, sourceLanguage, targetLanguage, allLines]);

  // Determine the active lyric line using audio.currentTime as the ground truth
  // Rule: Find line where start <= currentTime < end; if in gap, preserve previous or nearest line
  const activeLineId = useMemo(() => {
    if (!allLines || allLines.length === 0) return null;

    // 1. Direct interval containment: start <= currentTime < end
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const start = line.start ?? line.startTime;
      const end = line.end ?? line.endTime;

      if (start !== null && start !== undefined && end !== null && end !== undefined) {
        if (currentTime >= start && currentTime < end) {
          return line.id;
        }
      }
    }

    // 2. If in a gap between lines: check if currentTime is between line[i].start and next line's start
    // Preserves the previous active line until the next line starts
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const nextLine = allLines[i + 1];
      const start = line.start ?? line.startTime;
      const nextStart = nextLine ? (nextLine.start ?? nextLine.startTime) : null;

      if (start !== null && start !== undefined) {
        if (nextStart !== null && nextStart !== undefined) {
          if (currentTime >= start && currentTime < nextStart) {
            return line.id;
          }
        } else {
          // Last line
          if (currentTime >= start) {
            return line.id;
          }
        }
      }
    }

    // 3. If before the first timed line (e.g. during intro prior to 13.28s)
    const firstTimedLine = allLines.find((l) => (l.start ?? l.startTime) !== null);
    if (firstTimedLine && currentTime < (firstTimedLine.start ?? firstTimedLine.startTime)!) {
      return firstTimedLine.id;
    }

    return allLines[0]?.id || null;
  }, [allLines, currentTime]);

  // Smoothly center the active lyric line in the middle/focus area of the viewport
  const scrollToActiveLine = useCallback((force = false) => {
    if (!activeLineRef.current || !lyricViewportRef.current) return;

    const viewport = lyricViewportRef.current;
    const activeEl = activeLineRef.current;

    const viewportRect = viewport.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    const currentScrollTop = viewport.scrollTop;

    // Calculate position so active line sits centrally in visual focus zone (~45% from top)
    const elRelativeTop = elRect.top - viewportRect.top + currentScrollTop;
    const viewportHeight = viewport.clientHeight;
    const elHeight = elRect.height;
    const targetScroll = elRelativeTop - (viewportHeight * 0.45) + (elHeight / 2);

    isProgrammaticScrollRef.current = true;
    viewport.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });

    if (force) {
      setIsUserScrolled(false);
    }

    // Reset programmatic scroll flag after transition completes
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);
  }, []);

  // Trigger auto-scroll ONLY when activeLineId changes and user has not manually scrolled away
  useEffect(() => {
    if (activeLineId === prevActiveLineIdRef.current) {
      return;
    }
    prevActiveLineIdRef.current = activeLineId;

    if (!isUserScrolled && activeLineId) {
      scrollToActiveLine(false);
    }
  }, [activeLineId, isUserScrolled, scrollToActiveLine]);

  // Handle user manual scroll interaction inside the dedicated lyric viewport
  const handleViewportScroll = () => {
    // If the scroll event was triggered programmatically by auto-follow, ignore it
    if (isProgrammaticScrollRef.current) return;

    if (!activeLineRef.current || !lyricViewportRef.current) return;

    const viewport = lyricViewportRef.current;
    const activeEl = activeLineRef.current;
    const viewportRect = viewport.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();

    // Check if the active element has drifted outside the comfortable focal middle third
    const elCenter = elRect.top + elRect.height / 2;
    const viewportCenter = viewportRect.top + viewportRect.height * 0.45;
    const distance = Math.abs(elCenter - viewportCenter);

    // If drifted by more than 160px from center, mark as user scrolled to show "FOLLOW LIVE" affordance
    if (distance > 160) {
      setIsUserScrolled(true);
    } else {
      setIsUserScrolled(false);
    }
  };

  // Re-engage live auto-follow when clicking the "FOLLOW LIVE" button
  const handleFollowLiveClick = () => {
    setIsUserScrolled(false);
    scrollToActiveLine(true);
  };

  // Interactive Click: Read start timestamp, seek audio.currentTime, immediately re-center focus
  const handleLineClick = (line: NormalizedLyricLine) => {
    const targetTime = line.start ?? line.startTime;
    if (targetTime !== null && targetTime !== undefined) {
      onSeek(targetTime);
      setIsUserScrolled(false);
      setTimeout(() => {
        scrollToActiveLine(true);
      }, 50);
    }
  };

  if (!lyrics || !lyrics.sections || lyrics.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[var(--text-secondary)] italic font-sans-clean h-full">
        <p className="text-sm tracking-wider uppercase opacity-60">Synchronizing lyrical frequencies...</p>
      </div>
    );
  }

  const hasAnyLearningItems = lyrics.lines.some((l) => Array.isArray(l.learning) && l.learning.length > 0);

  return (
    <div className={`lyric-panel flex flex-col h-full w-full relative select-none ${className}`}>
      {/* 1. LYRIC HEADER: Stays fixed/visible at top */}
      <div className="lyric-header shrink-0 pb-3 mb-2 border-b hairline-border">
        {/* Top linguistic mode banner */}
        <div className="flex justify-between items-center text-[11px] font-sans-clean uppercase tracking-widest text-[var(--text-secondary)] mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[var(--accent-primary)] font-semibold flex items-center gap-1.5 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] inline-block animate-pulse"></span>
              SYNCHRONIZED MANUSCRIPT
            </span>
            <span className="opacity-40">/</span>
            <span className="text-[var(--text-primary)] text-[10px] font-mono tracking-wider">
              {sourceLanguage} &rarr; {targetLanguage}
            </span>
          </div>

          {hasAnyLearningItems && onToggleLearningMode && (
            <button
              onClick={onToggleLearningMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-wider transition-all duration-300 border ${
                showLearningMode
                  ? 'bg-[var(--accent-primary)] text-[#FFFFFF] dark:text-[#10110E] border-[var(--accent-primary)] font-semibold'
                  : 'border hairline-border text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] bg-[var(--bg-chip)]'
              }`}
              title="Toggle editorial linguistic vocabulary annotations"
            >
              <BookOpen className="w-3 h-3" />
              <span>VOCABULARY</span>
            </button>
          )}
        </div>

        {/* Synchronized Dual Column Semantic Title Labels */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 select-none">
          {/* Left: Original Semantic Label */}
          <div className="flex flex-col pl-3 border-l-2 border-[var(--accent-primary)]">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-primary)] font-bold leading-none">
              ORIGINAL
            </span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-primary)] mt-1 truncate">
              {sourceLanguage}
            </span>
          </div>

          {/* Right: Translation Semantic Label */}
          <div className="flex flex-col pl-3 border-l-2 border-[var(--accent-primary)]/40">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-secondary)] font-bold leading-none">
              TRANSLATION
            </span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-primary)]/70 mt-1 truncate">
              {targetLanguage}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED SCROLL CONTAINER: .lyric-viewport (Occupies full tall space, scrolls ONLY internal lyrics) */}
      <div
        ref={lyricViewportRef}
        onScroll={handleViewportScroll}
        className="lyric-viewport flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-3 pb-44 space-y-8 scroll-smooth relative"
      >
        <div className="lyric-content space-y-8 pt-2">
          {lyrics.sections.map((section) => {
            const isSectionActive = section.lines.some((l) => l.id === activeLineId);

            return (
              <section key={section.id} className="space-y-4">
                {/* Section Header with Subtle Music-Driven Transition */}
                <div
                  className={`flex items-center gap-3 pt-4 pb-1 transition-all duration-500 ease-out ${
                    isSectionActive
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-65 hover:opacity-90 translate-y-0.5'
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-mono tracking-widest font-semibold px-2 py-0.5 border transition-all duration-500 ${
                      isSectionActive
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow-[0_0_8px_rgba(140,142,88,0.2)]'
                        : 'border hairline-border bg-[var(--bg-chip)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {section.type.replace(/-/g, ' ')}
                    {section.style ? ` • ${section.style}` : ''}
                  </span>
                  <div
                    className={`flex-1 h-[1px] transition-all duration-500 ${
                      isSectionActive
                        ? 'bg-gradient-to-r from-[var(--accent-primary)]/60 via-[var(--accent-primary)]/25 to-transparent'
                        : 'bg-[var(--border-subtle)]'
                    }`}
                  ></div>
                </div>

                {/* Lines within this section — Synchronized 2-Column Editorial Rows */}
                <div className="space-y-3.5">
                  {section.lines.map((line) => {
                    const isTimed = (line.start ?? line.startTime) !== null && (line.start ?? line.startTime) !== undefined;
                    const isActive = line.id === activeLineId;
                    const hasLearning = Array.isArray(line.learning) && line.learning.length > 0;
                    const lineStartSec = line.start ?? line.startTime;

                    // Strictly respect JSON translation #1, then resolved cache/provider, then fallback
                    const displayTranslation =
                      line.translation && line.translation.trim().length > 0
                        ? line.translation.trim()
                        : (resolvedTranslations[line.id] || null);

                    return (
                      <div
                        key={line.id}
                        id={`lyric-line-${line.id}`}
                        ref={isActive ? activeLineRef : null}
                        onClick={() => handleLineClick(line)}
                        className={`group relative transition-all duration-300 ease-out rounded-sm py-2.5 px-3 cursor-pointer select-text ${
                          isActive
                            ? 'opacity-100 scale-[1.015] bg-[var(--accent-primary)]/15 border-y border-[var(--accent-primary)]/35 z-10 shadow-sm'
                            : 'opacity-75 scale-100 hover:opacity-100 hover:bg-[var(--bg-chip)]/40'
                        }`}
                      >
                        {/* Active Line Subtle Accent Bar */}
                        {isActive && (
                          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 rounded-full bg-[var(--accent-primary)]"></span>
                        )}

                        {/* Guaranteed 2-Column Grid: LEFT (Original), RIGHT (Translation) */}
                        <div className="grid grid-cols-2 gap-4 md:gap-8 items-start">
                          {/* Left: Original Lyric Column (Exact source text from JSON) */}
                          <div
                            className={`border-l-2 pl-3.5 transition-all duration-300 ease-out ${
                              isActive
                                ? 'border-[var(--accent-primary)] font-subtitle-outfit text-[19px] md:text-[22px] text-[var(--text-primary)] leading-snug font-semibold drop-shadow-sm'
                                : 'border hairline-border border-y-0 border-r-0 font-sans-clean text-[15px] md:text-[16px] text-[var(--text-primary)]/90 group-hover:text-[var(--text-primary)] leading-relaxed font-normal'
                            }`}
                          >
                            <p className="flex items-baseline justify-between gap-2">
                              <span>{line.originalText || line.original}</span>
                              {isTimed && lineStartSec !== null && lineStartSec !== undefined && (
                                <span className="text-[10px] tabular-nums font-mono opacity-0 group-hover:opacity-75 text-[var(--text-muted)] ml-2 shrink-0 select-none">
                                  {Math.floor(lineStartSec / 60)}:{(lineStartSec % 60).toFixed(0).padStart(2, '0')}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Right: Translated Column (Horizontally aligned with Left Column) */}
                          <div
                            className={`border-l-2 pl-3.5 transition-all duration-300 ease-out ${
                              isActive
                                ? 'border-[var(--accent-primary)] font-subtitle-outfit text-[17px] md:text-[20px] text-[var(--accent-primary)] leading-snug font-medium drop-shadow-sm'
                                : 'border hairline-border border-y-0 border-r-0 font-sans-clean italic text-[14px] md:text-[15px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] leading-relaxed'
                            }`}
                          >
                            <p>
                              {displayTranslation ? (
                                displayTranslation
                              ) : (
                                <span className="opacity-50 text-[12px] not-italic font-mono uppercase tracking-wider text-[var(--text-muted)]">
                                  TRANSLATION UNAVAILABLE
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Learn English Inline Annotation Badge */}
                        {showLearningMode && hasLearning && (
                          <div className="mt-2.5 pl-4 flex flex-wrap gap-2">
                            {line.learning!.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectLearningItem) {
                                    onSelectLearningItem(item);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/40 transition-colors"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span className="font-semibold">{item.phrase}</span>
                                {item.partOfSpeech && (
                                  <span className="opacity-70 text-[10px]">({item.partOfSpeech})</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* 3. Subtle Editorial "FOLLOW LIVE" Floating Affordance (Shown when user manually scrolls away) */}
      {isUserScrolled && activeLineId && (
        <div className="absolute bottom-5 right-6 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
          <button
            onClick={handleFollowLiveClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-surface)]/95 hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-[#FFFFFF] dark:hover:text-[#10110E] border border-[var(--accent-primary)]/40 hover:border-[var(--accent-primary)] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md text-[10px] font-mono uppercase tracking-widest transition-all duration-200 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] group-hover:bg-current animate-pulse"></span>
            <Radio className="w-3 h-3 opacity-70 group-hover:opacity-100" />
            <span className="font-semibold">FOLLOW LIVE</span>
          </button>
        </div>
      )}
    </div>
  );
};
