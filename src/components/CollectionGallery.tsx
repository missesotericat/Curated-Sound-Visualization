import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TrackConfig, CollectionConfig, CollectionSortOption } from '../types';
import { DEFAULT_COLLECTION_CONFIG } from '../config/tracks';
import { Play, Pause, ArrowUpRight, RotateCcw, Filter, ArrowDownWideNarrow, ChevronLeft, ChevronRight } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface CollectionGalleryProps {
  tracks: TrackConfig[];
  currentTrack: TrackConfig | null;
  isPlaying: boolean;
  onPlayTrack: (track: TrackConfig) => void;
  onOpenLyrics: (track: TrackConfig) => void;
  onNavigateToArchive?: () => void;
  collectionConfig?: CollectionConfig;
}

/**
 * Standard content types supported by the museum exhibition archive
 */
const BASE_CONTENT_TYPES = ['ALL', 'SONG', 'PODCAST', 'INSTRUMENTAL', 'SPOKEN WORD', 'SOUNDSCAPE'];

/**
 * Curated 8-slot editorial layout specification.
 * Row 1 (Items 0..3): 3 + 4 + 2 + 3 = 12 columns
 * Row 2 (Items 4..7): 4 + 2 + 3 + 3 = 12 columns
 * Tablet: 2 columns per row (col-span-1 on 2-col grid)
 * Mobile: 1 column
 */
interface SlotSpecification {
  colSpanDesktop: string;
  aspectClass: string;
  sizeVariant: 'S' | 'M' | 'L';
}

const EDITORIAL_SLOTS: SlotSpecification[] = [
  // ROW 1
  { colSpanDesktop: 'lg:col-span-3', aspectClass: 'aspect-[4/5]', sizeVariant: 'M' },
  { colSpanDesktop: 'lg:col-span-4', aspectClass: 'aspect-[16/10]', sizeVariant: 'L' },
  { colSpanDesktop: 'lg:col-span-2', aspectClass: 'aspect-[3/4]', sizeVariant: 'S' },
  { colSpanDesktop: 'lg:col-span-3', aspectClass: 'aspect-square', sizeVariant: 'M' },
  // ROW 2
  { colSpanDesktop: 'lg:col-span-4', aspectClass: 'aspect-[16/10]', sizeVariant: 'L' },
  { colSpanDesktop: 'lg:col-span-2', aspectClass: 'aspect-[3/4]', sizeVariant: 'S' },
  { colSpanDesktop: 'lg:col-span-3', aspectClass: 'aspect-[4/5]', sizeVariant: 'M' },
  { colSpanDesktop: 'lg:col-span-3', aspectClass: 'aspect-square', sizeVariant: 'M' }
];

/**
 * Derives an authentic artifact label from the track's artwork URL or catalogue number
 */
function deriveArtifactLabel(track: TrackConfig): string {
  if (track.artwork) {
    try {
      const parts = track.artwork.split('/');
      const filename = parts[parts.length - 1];
      if (filename && filename.includes('.')) {
        return `ARTIFACT_${filename.toUpperCase()}`;
      }
    } catch {
      // fallback
    }
  }
  return `ARTIFACT_${track.number}.JPG`;
}

export const CollectionGallery: React.FC<CollectionGalleryProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onOpenLyrics,
  onNavigateToArchive,
  collectionConfig = DEFAULT_COLLECTION_CONFIG
}) => {
  // Primary Taxonomy: Lyric Languages
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');

  // Secondary Dimension 1: Content Type
  const [selectedContentType, setSelectedContentType] = useState<string>('ALL');

  // Secondary Dimension 2: Theme / Concept
  const [selectedTheme, setSelectedTheme] = useState<string>('ALL');

  // Collection Header Sort state (defaults to config sort or newest)
  const [selectedSortOption, setSelectedSortOption] = useState<CollectionSortOption>(
    collectionConfig.sort || 'newest'
  );

  // Carousel active page (8 tracks per page)
  const [currentPage, setCurrentPage] = useState<number>(0);
  const PAGE_SIZE = 8;

  // Merge provided config with defaults
  const effectiveConfig = useMemo(() => {
    return {
      ...DEFAULT_COLLECTION_CONFIG,
      ...collectionConfig
    };
  }, [collectionConfig]);

  // 1. DYNAMIC TAXONOMY DISCOVERY
  const { singleLanguages, multiLanguageCompositions } = useMemo(() => {
    const singleSet = new Set<string>();
    const multiSet = new Set<string>();

    tracks.forEach((track) => {
      const langs = track.lyricLanguages || [];
      langs.forEach((lang) => {
        const clean = lang.trim().toUpperCase();
        if (clean) singleSet.add(clean);
      });

      if (langs.length > 1) {
        const sorted = [...langs].map((l) => l.trim().toUpperCase()).sort();
        if (sorted.includes('EN') && sorted.includes('VI')) {
          multiSet.add('EN + VI');
        } else {
          multiSet.add(sorted.join(' + '));
        }
      }
    });

    return {
      singleLanguages: Array.from(singleSet),
      multiLanguageCompositions: Array.from(multiSet)
    };
  }, [tracks]);

  // Combined Primary Language taxonomy options
  const languageOptions = useMemo(() => {
    return ['ALL', ...singleLanguages, ...multiLanguageCompositions];
  }, [singleLanguages, multiLanguageCompositions]);

  // Dynamically derive content types
  const contentTypes = useMemo(() => {
    const trackTypes = new Set<string>();
    tracks.forEach((t) => {
      if (t.contentType) trackTypes.add(t.contentType.trim().toUpperCase());
    });

    const merged = ['ALL'];
    BASE_CONTENT_TYPES.filter((t) => t !== 'ALL').forEach((t) => {
      merged.push(t);
    });
    trackTypes.forEach((t) => {
      if (!merged.includes(t)) merged.push(t);
    });

    return merged;
  }, [tracks]);

  // Dynamically derive themes & concepts
  const availableThemes = useMemo(() => {
    const themeSet = new Set<string>();
    tracks.forEach((track) => {
      if (Array.isArray(track.themes) && track.themes.length > 0) {
        track.themes.forEach((th) => themeSet.add(th.trim()));
      } else if (track.concept) {
        themeSet.add(track.concept.trim());
      }
    });
    return ['ALL', ...Array.from(themeSet)];
  }, [tracks]);

  // 2. MULTI-DIMENSIONAL FILTER PREDICATE
  const filterPredicate = useMemo(() => {
    return (track: TrackConfig) => {
      const trackLangs = (track.lyricLanguages || []).map((l) => l.toUpperCase());
      const trackType = (track.contentType || 'SONG').toUpperCase();
      const trackThemes = (track.themes && track.themes.length > 0 ? track.themes : [track.concept || '']).map((t) => t.toUpperCase());

      // Primary: Language Filter
      if (selectedLanguage !== 'ALL') {
        if (selectedLanguage.includes('+')) {
          const requiredCodes = selectedLanguage.split('+').map((c) => c.trim().toUpperCase());
          const hasAllCodes = requiredCodes.every((code) => trackLangs.includes(code));
          if (!hasAllCodes) return false;
        } else {
          if (!trackLangs.includes(selectedLanguage.toUpperCase())) {
            return false;
          }
        }
      }

      // Secondary: Content Type Filter
      if (selectedContentType !== 'ALL') {
        if (trackType !== selectedContentType.toUpperCase()) {
          return false;
        }
      }

      // Secondary: Theme Filter
      if (selectedTheme !== 'ALL') {
        const matchesTheme = trackThemes.some(
          (th) => th === selectedTheme.toUpperCase() || th.includes(selectedTheme.toUpperCase())
        );
        if (!matchesTheme && (!track.concept || track.concept.toUpperCase() !== selectedTheme.toUpperCase())) {
          return false;
        }
      }

      return true;
    };
  }, [selectedLanguage, selectedContentType, selectedTheme]);

  // 3. CANDIDATE SELECTION & SORTING (Full filtered pool)
  const orderedCollectionPool = useMemo(() => {
    // Manual / Curated Mode
    if (effectiveConfig.mode === 'manual' && Array.isArray(effectiveConfig.trackIds) && effectiveConfig.trackIds.length > 0) {
      const curatedList: TrackConfig[] = [];
      const lookupMap = new Map<string, TrackConfig>();

      tracks.forEach((t) => {
        lookupMap.set(t.id, t);
        lookupMap.set(t.slug, t);
      });

      effectiveConfig.trackIds.forEach((idOrSlug) => {
        const matched = lookupMap.get(idOrSlug);
        if (matched && !curatedList.some((item) => item.id === matched.id)) {
          curatedList.push(matched);
        }
      });

      return curatedList.filter(filterPredicate);
    }

    // Automatic Mode: Filter then sort
    const filtered = tracks.filter(filterPredicate);
    const activeSort = selectedSortOption || effectiveConfig.sort || 'newest';

    return [...filtered].sort((a, b) => {
      if (effectiveConfig.prioritizeFeatured) {
        const aFeat = a.featuredInCollection ? 1 : 0;
        const bFeat = b.featuredInCollection ? 1 : 0;
        if (aFeat !== bFeat) return bFeat - aFeat;
      }

      switch (activeSort) {
        case 'mostPlayed': {
          const aPlays = typeof a.playCount === 'number' ? a.playCount : -1;
          const bPlays = typeof b.playCount === 'number' ? b.playCount : -1;
          if (aPlays !== bPlays) return bPlays - aPlays;
          const bTime = new Date(b.createdAt || b.date || 0).getTime();
          const aTime = new Date(a.createdAt || a.date || 0).getTime();
          return bTime - aTime;
        }
        case 'titleAZ':
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        case 'titleZA':
          return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
        case 'newest':
        default: {
          const bTime = new Date(b.createdAt || b.date || 0).getTime();
          const aTime = new Date(a.createdAt || a.date || 0).getTime();
          return bTime - aTime;
        }
      }
    });
  }, [tracks, filterPredicate, effectiveConfig, selectedSortOption]);

  // Total matching records count
  const matchingPoolCount = orderedCollectionPool.length;
  const totalPages = Math.max(1, Math.ceil(matchingPoolCount / PAGE_SIZE));

  // Reset to first page when filtering or sorting changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedLanguage, selectedContentType, selectedTheme, selectedSortOption]);

  // Ensure currentPage stays within valid bounds
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  // Slice exactly up to 8 tracks for the active carousel page
  const activePageTracks = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return orderedCollectionPool.slice(start, start + PAGE_SIZE);
  }, [orderedCollectionPool, currentPage]);

  const hasActiveFilters =
    selectedLanguage !== 'ALL' || selectedContentType !== 'ALL' || selectedTheme !== 'ALL';

  const resetAllFilters = () => {
    setSelectedLanguage('ALL');
    setSelectedContentType('ALL');
    setSelectedTheme('ALL');
    setCurrentPage(0);
  };

  const handleNavigateToArchiveView = () => {
    if (onNavigateToArchive) {
      onNavigateToArchive();
    } else {
      const el = document.getElementById('closing');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const totalCatalogCount = String(tracks.length).padStart(2, '0');
  const exhibitedCountFormatted = String(activePageTracks.length).padStart(2, '0');

  return (
    <section id="collection" className="py-24 px-6 md:px-16 max-w-7xl mx-auto border-b hairline-border bg-[var(--bg-main)] transition-colors duration-300">
      {/* 02 / EXHIBITION WING HEADER */}
      <div className="space-y-6 pb-8 mb-10 border-b hairline-border">
        {/* Wing Index & Archival Navigation */}
        <div className="flex items-center justify-between text-[10px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold">
          <div className="flex items-center gap-2">
            <span>02 / {totalCatalogCount} EXHIBITION WING</span>
            <span className="opacity-40">•</span>
            <span className="text-[var(--text-secondary)]">CURATED EDITORIAL EXHIBIT (8 WORKS / SPREAD)</span>
          </div>

          <button
            onClick={handleNavigateToArchiveView}
            className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span>VIEW COMPLETE ARCHIVE ({tracks.length} RECORDS)</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Primary Row: THE COLLECTION (Left) vs. PRIMARY TAXONOMY: LYRIC LANGUAGES (Right) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div>
            <h2 className="font-heading-jost text-4xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
              THE COLLECTION.
            </h2>
          </div>

          {/* PRIMARY TAXONOMY: LYRIC LANGUAGES */}
          <div className="flex flex-col items-start lg:items-end w-full lg:w-auto">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-primary)] font-semibold mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] inline-block animate-pulse"></span>
              LYRIC LANGUAGES
            </span>

            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 text-[var(--text-primary)]">
              {languageOptions.map((lang, idx) => {
                const isActive = selectedLanguage === lang;

                return (
                  <React.Fragment key={lang}>
                    {idx > 0 && <span className="opacity-20 select-none font-mono text-sm">/</span>}
                    <button
                      onClick={() => setSelectedLanguage(lang)}
                      className={`font-sans-clean text-lg sm:text-2xl tracking-wide transition-all duration-300 relative py-0.5 cursor-pointer ${
                        isActive
                          ? 'text-[var(--accent-primary)] font-semibold opacity-100'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-60 hover:opacity-100 font-normal'
                      }`}
                    >
                      <span>{lang}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent-primary)] rounded-full"></span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collection Sub-Header with Subtle Carousel Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
          <p className="font-subtitle-outfit text-lg sm:text-xl text-[var(--text-secondary)]">
            {matchingPoolCount} compositions in catalog. Machine-assisted composition, neural vocal models, human direction.
          </p>

          {/* Editorial Carousel Page Indicator & Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg-surface)] px-3 py-1.5 border hairline-border shadow-sm">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className={`p-1 transition-colors ${
                  currentPage === 0
                    ? 'opacity-25 cursor-not-allowed text-[var(--text-muted)]'
                    : 'text-[var(--text-primary)] hover:text-[var(--accent-primary)] cursor-pointer'
                }`}
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-semibold text-[var(--text-primary)] px-1">
                SPREAD {String(currentPage + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                className={`p-1 transition-colors ${
                  currentPage >= totalPages - 1
                    ? 'opacity-25 cursor-not-allowed text-[var(--text-muted)]'
                    : 'text-[var(--text-primary)] hover:text-[var(--accent-primary)] cursor-pointer'
                }`}
                aria-label="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* SECONDARY CLASSIFICATION TAGS & EDITORIAL CONTROLS */}
        <div className="border hairline-border bg-[var(--bg-surface)] p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Row 1: Content Type Hierarchy & Secondary Sort/View Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans-clean uppercase tracking-widest">
              <span className="text-[10px] font-mono text-[var(--accent-primary)] mr-2 shrink-0 font-bold">
                CONTENT TYPE:
              </span>
              {contentTypes.map((type) => {
                const isActive = selectedContentType === type;
                const count =
                  type === 'ALL'
                    ? matchingPoolCount
                    : tracks.filter((t) => (t.contentType || 'SONG').toUpperCase() === type).length;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedContentType(type)}
                    className={`px-3 py-1.5 text-[11px] border transition-all duration-200 cursor-pointer select-none ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-[#FFFFFF] dark:text-[#10110E] border-[var(--accent-primary)] font-bold shadow-sm'
                        : 'border hairline-border text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] bg-[var(--bg-chip)]'
                    }`}
                  >
                    {type} {type === 'ALL' ? `(${String(matchingPoolCount).padStart(2, '0')})` : count > 0 ? `(${String(count).padStart(2, '0')})` : ''}
                  </button>
                );
              })}
            </div>

            {/* Editorial Secondary Sort & Action Tools */}
            <div className="flex flex-wrap items-center gap-3 pt-2 xl:pt-0">
              <div className="flex items-center gap-1.5 border hairline-border bg-[var(--bg-chip)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                <ArrowDownWideNarrow className="w-3 h-3 text-[var(--accent-primary)]" />
                <span>SORT:</span>
                <select
                  value={selectedSortOption}
                  onChange={(e) => setSelectedSortOption(e.target.value as CollectionSortOption)}
                  className="bg-transparent text-[var(--text-primary)] font-semibold uppercase cursor-pointer focus:outline-none"
                >
                  <option value="newest" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">NEWEST</option>
                  <option value="mostPlayed" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">MOST PLAYED</option>
                  <option value="titleAZ" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">TITLE (A–Z)</option>
                  <option value="titleZA" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">TITLE (Z–A)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleNavigateToArchiveView}
                className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors py-1 px-2.5 border border-[var(--accent-primary)]/40 hover:border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 cursor-pointer select-none font-semibold"
              >
                <span>VIEW ALL</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors py-1 px-2.5 border hairline-border hover:border-[var(--accent-primary)] bg-[var(--bg-chip)] cursor-pointer select-none font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Secondary Theme & Concept Classification Tags */}
          <div className="pt-3 border-t hairline-border flex flex-wrap items-center gap-2 text-[10px] font-sans-clean uppercase tracking-widest">
            <span className="font-mono text-[var(--text-secondary)] mr-2 shrink-0 font-medium">
              THEMES & CONCEPTS:
            </span>
            {availableThemes.map((theme) => {
              const isActive = selectedTheme === theme;

              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={`px-2.5 py-1 border transition-all duration-200 cursor-pointer select-none ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[#FFFFFF] dark:text-[#10110E] border-[var(--accent-primary)] font-semibold shadow-sm'
                      : 'border hairline-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] bg-[var(--bg-chip)]/60'
                  }`}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GALLERY GRID OR RESTRAINED EMPTY NOTIFICATION */}
      {activePageTracks.length === 0 ? (
        <div className="py-20 px-8 text-center border border-dashed hairline-border bg-[var(--bg-surface)] my-8 space-y-4">
          <Filter className="w-8 h-8 text-[var(--accent-primary)] mx-auto opacity-70" />
          <h3 className="font-heading-jost text-2xl text-[var(--text-primary)]">
            NO WORKS FOUND
          </h3>
          <p className="font-sans-clean text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            No compositions match the selected criteria.
          </p>
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[#FFFFFF] dark:text-[#10110E] font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>CLEAR FILTERS</span>
          </button>
        </div>
      ) : (
        <>
          {/* CONTROLLED 4 × 2 EDITORIAL CAROUSEL GRID */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-x-6 lg:gap-x-8 gap-y-10 lg:gap-y-12 items-start"
              >
                {activePageTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isTrackPlaying = isCurrent && isPlaying;
                  const slot = EDITORIAL_SLOTS[idx % EDITORIAL_SLOTS.length];
                  const artifactLabel = deriveArtifactLabel(track);

                  const languageTag =
                    track.lyricLanguages && track.lyricLanguages.length > 0
                      ? track.lyricLanguages.join(' + ')
                      : 'INSTRUMENTAL';

                  return (
                    <div
                      key={track.id}
                      className={`flex flex-col group relative ${slot.colSpanDesktop} col-span-1 transition-all duration-300`}
                    >
                      {/* Artwork Frame */}
                      <div
                        className={`relative border p-3 bg-[var(--bg-surface)] shadow-md transition-all duration-300 ${
                          isCurrent
                            ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/50'
                            : 'hairline-border group-hover:border-[var(--accent-primary)] group-hover:shadow-xl'
                        }`}
                      >
                        {/* Artwork Viewport with Controlled Aspect Ratio & Overflow Isolation */}
                        <div className={`w-full ${slot.aspectClass} overflow-hidden bg-black/40 relative flex items-center justify-center select-none`}>
                          <img
                            src={track.artwork || track.cover}
                            alt={track.title}
                            onError={(e) => {
                              console.error('[ARTWORK LOAD FAILED]', track.slug, track.artwork);
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-[1.03]"
                          />

                          {/* Audio Playing Glow & Spectral Indicator */}
                          {isTrackPlaying && (
                            <div className="absolute inset-0 bg-[var(--accent-primary)]/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
                              <div className="w-3/4 h-12">
                                <AudioVisualizer mode="spectral-bars" height={36} accentColor="#EDE686" />
                              </div>
                            </div>
                          )}

                          {/* Non-Cropping Hover Quick Actions Overlay */}
                          <div className="absolute inset-0 z-20 bg-[var(--bg-main)]/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3 pointer-events-none group-hover:pointer-events-auto">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-[95%] mx-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPlayTrack(track);
                                }}
                                className="w-full sm:w-auto px-3.5 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 text-[10px] sm:text-xs uppercase font-sans-clean font-semibold tracking-wider shadow-md cursor-pointer whitespace-nowrap shrink-0"
                              >
                                {isTrackPlaying ? (
                                  <>
                                    <Pause className="w-3 h-3" />
                                    <span>PAUSE</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>PLAY TRACK</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenLyrics(track);
                                }}
                                className="w-full sm:w-auto px-3 py-2 bg-[var(--bg-surface)] border hairline-border text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-[#FFFFFF] dark:hover:text-[#10110E] hover:border-[var(--accent-primary)] transition-colors flex items-center justify-center gap-1 text-[10px] sm:text-xs uppercase font-sans-clean font-semibold tracking-wider shadow-md cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <span>LYRICS & ART</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Archival Artifact Badge */}
                          <div className="absolute bottom-2.5 left-2.5 z-10 text-[9px] font-mono tracking-widest text-[var(--text-primary)] bg-[var(--bg-main)]/85 px-2 py-0.5 border hairline-border backdrop-blur-sm pointer-events-none">
                            {artifactLabel}
                          </div>
                        </div>

                        {/* Sub-Frame Meta Row: Compact & Predictable */}
                        <div className="pt-3 pb-0.5 flex justify-between items-center font-sans-clean border-t hairline-border mt-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs text-[var(--accent-primary)] font-semibold shrink-0">
                              {track.number} / {totalCatalogCount}
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-secondary)] px-1.5 py-0.5 border hairline-border bg-[var(--bg-chip)] truncate shrink-0">
                              {languageTag}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] shrink-0">
                            {track.genre && track.genre.length > 0 && (
                              <span className="truncate max-w-[90px]">{track.genre[0]}</span>
                            )}
                            {(track.bpm || track.tempo) && (
                              <>
                                {track.genre && track.genre.length > 0 && <span>•</span>}
                                <span className="font-mono">{track.bpm || track.tempo} BPM</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Content Block: Tight, Clamped & Proportionate */}
                      <div className="pt-3 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h3
                            onClick={() => onOpenLyrics(track)}
                            className="font-heading-jost text-xl sm:text-2xl text-[var(--text-primary)] font-medium tracking-tight cursor-pointer hover:text-[var(--accent-primary)] transition-colors line-clamp-1"
                          >
                            {track.title}
                          </h3>
                          {track.concept ? (
                            <span className="text-[9px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold px-2 py-0.5 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 shrink-0 truncate max-w-[120px]">
                              {track.concept}
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase font-sans-clean tracking-widest text-[var(--text-muted)] px-1.5 py-0.5 border hairline-border bg-[var(--bg-chip)] shrink-0">
                              {track.contentType || 'SONG'}
                            </span>
                          )}
                        </div>

                        {track.subtitle && (
                          <p className="font-subtitle-outfit text-xs text-[var(--text-secondary)] line-clamp-1">
                            {track.subtitle}
                          </p>
                        )}

                        {track.description && (
                          <p className="text-xs text-[var(--text-secondary)] font-sans-clean leading-relaxed line-clamp-2 pt-0.5">
                            {track.description}
                          </p>
                        )}

                        {/* Direct Action Links */}
                        <div className="flex items-center gap-3 pt-1.5 text-[10px] font-sans-clean uppercase tracking-wider">
                          <button
                            onClick={() => onPlayTrack(track)}
                            className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isTrackPlaying ? 'Pause' : 'Listen Now'}</span>
                            <Play className="w-2.5 h-2.5 fill-current" />
                          </button>
                          <span className="opacity-25">/</span>
                          <button
                            onClick={() => onOpenLyrics(track)}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                          >
                            <span>Synchronized Lyrics</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Editorial Footer Bridge & Bottom Carousel Controls */}
          <div className="mt-14 pt-8 border-t hairline-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-sans-clean text-[var(--text-secondary)]">
            <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--text-muted)]">
              <span>EXHIBITING {exhibitedCountFormatted} OF {matchingPoolCount} WORKS</span>
              <span className="opacity-40">•</span>
              <span>EDITORIAL COLLAGE SPREAD</span>
            </div>

            <div className="flex items-center gap-6">
              {totalPages > 1 && (
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    className={`p-1.5 border hairline-border transition-colors ${
                      currentPage === 0
                        ? 'opacity-25 cursor-not-allowed text-[var(--text-muted)] bg-[var(--bg-chip)]/40'
                        : 'text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] bg-[var(--bg-chip)] cursor-pointer'
                    }`}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-semibold text-[var(--text-primary)] px-2">
                    {String(currentPage + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    className={`p-1.5 border hairline-border transition-colors ${
                      currentPage >= totalPages - 1
                        ? 'opacity-25 cursor-not-allowed text-[var(--text-muted)] bg-[var(--bg-chip)]/40'
                        : 'text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] bg-[var(--bg-chip)] cursor-pointer'
                    }`}
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleNavigateToArchiveView}
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors group cursor-pointer"
              >
                <span className="font-semibold underline underline-offset-4">EXPLORE COMPLETE ARCHIVE INDEX ({tracks.length} RECORDS)</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};


