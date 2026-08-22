import React, { useState, useMemo } from 'react';
import { TrackConfig } from '../types';
import { Play, Pause, ArrowUpRight, RotateCcw, Filter } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface CollectionGalleryProps {
  tracks: TrackConfig[];
  currentTrack: TrackConfig | null;
  isPlaying: boolean;
  onPlayTrack: (track: TrackConfig) => void;
  onOpenLyrics: (track: TrackConfig) => void;
}

/**
 * Standard content types supported by the museum exhibition archive
 */
const BASE_CONTENT_TYPES = ['ALL', 'SONG', 'PODCAST', 'INSTRUMENTAL', 'SPOKEN WORD', 'SOUNDSCAPE'];

export const CollectionGallery: React.FC<CollectionGalleryProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onOpenLyrics
}) => {
  // Primary Taxonomy: Lyric Languages
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');

  // Secondary Dimension 1: Content Type
  const [selectedContentType, setSelectedContentType] = useState<string>('ALL');

  // Secondary Dimension 2: Theme / Concept
  const [selectedTheme, setSelectedTheme] = useState<string>('ALL');

  const [, setHoveredTrackId] = useState<string | null>(null);

  // 1. DYNAMIC TAXONOMY DISCOVERY
  // Dynamically derive single languages and multi-language compositions from track data
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
        // Create canonical composition key, e.g. "EN + VI"
        const sorted = [...langs].map((l) => l.trim().toUpperCase()).sort();
        // Prefer common standard ordering EN + VI
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

  // Dynamically derive content types (merging base catalog types with any extra track types)
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
      if (Array.isArray(track.themes)) {
        track.themes.forEach((th) => themeSet.add(th.trim()));
      } else if (track.concept) {
        themeSet.add(track.concept.trim());
      }
    });
    return ['ALL', ...Array.from(themeSet)];
  }, [tracks]);

  // 2. MULTI-DIMENSIONAL FILTERING LOGIC (AND BETWEEN TAXONOMIES)
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const trackLangs = (track.lyricLanguages || []).map((l) => l.toUpperCase());
      const trackType = (track.contentType || 'SONG').toUpperCase();
      const trackThemes = (track.themes || [track.concept || '']).map((t) => t.toUpperCase());

      // Primary: Language Filter
      if (selectedLanguage !== 'ALL') {
        if (selectedLanguage.includes('+')) {
          // Multi-language composition (e.g. "EN + VI")
          const requiredCodes = selectedLanguage.split('+').map((c) => c.trim().toUpperCase());
          const hasAllCodes = requiredCodes.every((code) => trackLangs.includes(code));
          if (!hasAllCodes) return false;
        } else {
          // Single language category (e.g. "EN" or "VI")
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
        if (!matchesTheme && track.concept.toUpperCase() !== selectedTheme.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [tracks, selectedLanguage, selectedContentType, selectedTheme]);

  const hasActiveFilters =
    selectedLanguage !== 'ALL' || selectedContentType !== 'ALL' || selectedTheme !== 'ALL';

  const resetAllFilters = () => {
    setSelectedLanguage('ALL');
    setSelectedContentType('ALL');
    setSelectedTheme('ALL');
  };

  const totalExhibitedCount = String(tracks.length).padStart(2, '0');
  const filteredCountFormatted = String(filteredTracks.length).padStart(2, '0');

  return (
    <section id="collection" className="py-24 px-6 md:px-16 max-w-7xl mx-auto border-b hairline-border bg-[var(--bg-main)] transition-colors duration-300">
      {/* 02 / EXHIBITION WING HEADER */}
      <div className="space-y-6 pb-8 mb-10 border-b hairline-border">
        {/* Wing Index */}
        <div className="flex items-center gap-2 text-[10px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold">
          <span>02 / {totalExhibitedCount} EXHIBITION WING</span>
        </div>

        {/* Primary Row: THE COLLECTION (Left) vs. PRIMARY TAXONOMY: LYRIC LANGUAGES (Right) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          {/* Main Section Title */}
          <div>
            <h2 className="font-heading-jost text-4xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
              THE COLLECTION.
            </h2>
          </div>

          {/* PRIMARY TAXONOMY: LYRIC LANGUAGES */}
          <div className="flex flex-col items-start lg:items-end w-full lg:w-auto">
            {/* Small Editorial Label */}
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-primary)] font-semibold mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] inline-block animate-pulse"></span>
              LYRIC LANGUAGES
            </span>

            {/* Language Values: Dynamic list with high editorial visual prominence */}
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

        {/* Collection Sub-Header */}
        <p className="font-subtitle-outfit text-lg sm:text-xl text-[var(--text-secondary)] pt-1">
          {tracks.length === 6 ? 'Six' : tracks.length} pieces. Machine-assisted composition, neural vocal models, human direction.
        </p>

        {/* SECONDARY CLASSIFICATION TAGS */}
        <div className="border hairline-border bg-[var(--bg-surface)] p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Row 1: Content Type Hierarchy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans-clean uppercase tracking-widest">
              <span className="text-[10px] font-mono text-[var(--accent-primary)] mr-2 shrink-0 font-semibold">
                CONTENT TYPE:
              </span>
              {contentTypes.map((type) => {
                const isActive = selectedContentType === type;
                const count =
                  type === 'ALL'
                    ? filteredTracks.length
                    : tracks.filter((t) => (t.contentType || 'SONG').toUpperCase() === type).length;

                return (
                  <button
                    key={type}
                    onClick={() => setSelectedContentType(type)}
                    className={`px-3 py-1.5 text-[11px] border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-[#FFFFFF] dark:text-[#10110E] border-[var(--accent-primary)] font-bold shadow-sm'
                        : 'border hairline-border text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] bg-[var(--bg-chip)]'
                    }`}
                  >
                    {type} {type === 'ALL' ? `(${filteredCountFormatted})` : count > 0 ? `(${String(count).padStart(2, '0')})` : ''}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="self-start sm:self-center flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors py-1 px-2 border border-[var(--accent-primary)]/40 hover:border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET FILTERS</span>
              </button>
            )}
          </div>

          {/* Row 2: Secondary Theme & Concept Classification Tags */}
          <div className="pt-3 border-t hairline-border flex flex-wrap items-center gap-2 text-[10px] font-sans-clean uppercase tracking-widest">
            <span className="font-mono text-[var(--text-muted)] mr-2 shrink-0">
              THEMES & CONCEPTS:
            </span>
            {availableThemes.map((theme) => {
              const isActive = selectedTheme === theme;

              return (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  className={`px-2.5 py-1 border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-semibold'
                      : 'border hairline-border text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--accent-primary)] bg-[var(--bg-chip)]'
                  }`}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GALLERY GRID OR EMPTY NOTIFICATION */}
      {filteredTracks.length === 0 ? (
        <div className="py-20 px-8 text-center border border-dashed hairline-border bg-[var(--bg-surface)] my-8 space-y-4">
          <Filter className="w-8 h-8 text-[var(--accent-primary)] mx-auto opacity-70" />
          <h3 className="font-heading-jost text-2xl text-[var(--text-primary)]">
            No Archival Pieces Found
          </h3>
          <p className="font-sans-clean text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            No compositions match the combination of <span className="text-[var(--accent-primary)]">Language: {selectedLanguage}</span>, <span className="text-[var(--accent-primary)]">Content Type: {selectedContentType}</span>, and <span className="text-[var(--accent-primary)]">Theme: {selectedTheme}</span>.
          </p>
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[#FFFFFF] dark:text-[#10110E] font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Classification Filters</span>
          </button>
        </div>
      ) : (
        /* Asymmetric Exhibition Gallery Grid */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {filteredTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isTrackPlaying = isCurrent && isPlaying;

            // Asymmetric column span & offset styling
            const colClass = track.colSpanDesktop || (idx % 2 === 0 ? 'md:col-span-6' : 'md:col-span-6 md:mt-16');
            const aspectClass =
              track.aspect === '1/1'
                ? 'aspect-square'
                : track.aspect === '16/9'
                ? 'aspect-[16/9]'
                : track.aspect === '2/3'
                ? 'aspect-[2/3]'
                : 'aspect-[4/5]';

            const languageTag =
              track.lyricLanguages && track.lyricLanguages.length > 0
                ? track.lyricLanguages.join(' + ')
                : 'INSTRUMENTAL';

            return (
              <div
                key={track.id}
                className={`flex flex-col group relative ${colClass} transition-all duration-500`}
                onMouseEnter={() => setHoveredTrackId(track.id)}
                onMouseLeave={() => setHoveredTrackId(null)}
              >
                {/* Artwork Frame */}
                <div
                  className={`relative border p-3 bg-[var(--bg-surface)] shadow-lg transition-all duration-500 ${
                    isCurrent
                      ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/50'
                      : 'hairline-border group-hover:border-[var(--accent-primary)] group-hover:shadow-2xl'
                  }`}
                >
                  {/* Image Container with Custom Aspect Ratio */}
                  <div className={`w-full ${aspectClass} overflow-hidden bg-black/40 relative flex items-center justify-center`}>
                    <img
                      src={track.artwork}
                      alt={track.title}
                      onError={(e) => {
                        console.error('[ARTWORK LOAD FAILED]', track.slug, track.artwork);
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover grayscale-[25%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                    />

                    {/* Audio Playing Glow & Spectral Indicator */}
                    {isTrackPlaying && (
                      <div className="absolute inset-0 bg-[var(--accent-primary)]/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 h-12">
                          <AudioVisualizer mode="spectral-bars" height={40} accentColor="#EDE686" />
                        </div>
                      </div>
                    )}

                    {/* Overlay Quick Actions */}
                    <div className="absolute inset-0 bg-[var(--bg-main)]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="px-4 py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 transition-opacity flex items-center gap-2 text-xs uppercase font-sans-clean font-semibold tracking-wider shadow-lg cursor-pointer"
                      >
                        {isTrackPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>PAUSE</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>PLAY TRACK</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onOpenLyrics(track)}
                        className="px-3.5 py-2.5 bg-[var(--bg-chip)] border hairline-border text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-[#FFFFFF] dark:hover:text-[#10110E] hover:border-[var(--accent-primary)] transition-colors flex items-center gap-1.5 text-xs uppercase font-sans-clean font-semibold tracking-wider shadow-lg cursor-pointer"
                      >
                        <span>LYRICS & ART</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Corner Badge */}
                    <div className="absolute bottom-2.5 left-2.5 text-[9px] font-mono tracking-widest text-[var(--text-primary)] bg-[var(--bg-main)]/80 px-2 py-0.5 border hairline-border backdrop-blur-sm">
                      ARTIFACT_{track.number}.JPG
                    </div>
                  </div>

                  {/* Sub-Frame Metadata Row: Content Type, Language & Musical Specs */}
                  <div className="pt-4 pb-1 flex justify-between items-baseline font-sans-clean border-t hairline-border mt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--accent-primary)] font-semibold">
                        {track.number} / {totalExhibitedCount}
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-secondary)] px-1.5 py-0.5 border hairline-border bg-[var(--bg-chip)]">
                        {languageTag}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      <span>{track.genre[0]}</span>
                      <span>•</span>
                      <span className="font-mono">{track.bpm || track.tempo} BPM</span>
                    </div>
                  </div>
                </div>

                {/* Title & Concept Typography */}
                <div className="pt-4 space-y-1.5">
                  <div className="flex justify-between items-start gap-3">
                    <h3
                      onClick={() => onOpenLyrics(track)}
                      className="font-heading-jost text-2xl sm:text-3xl text-[var(--text-primary)] font-medium tracking-tight cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
                    >
                      {track.title}
                    </h3>
                    <span className="text-[10px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold px-2 py-0.5 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 shrink-0">
                      {track.concept}
                    </span>
                  </div>

                  {track.subtitle && (
                    <p className="font-subtitle-outfit text-sm text-[var(--text-secondary)]">
                      {track.subtitle}
                    </p>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] font-sans-clean leading-relaxed line-clamp-2 pt-1">
                    {track.description}
                  </p>

                  {/* Direct Action Links */}
                  <div className="flex items-center gap-4 pt-2 text-[11px] font-sans-clean uppercase tracking-wider">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isTrackPlaying ? 'Pause Audio' : 'Listen Now'}</span>
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </button>
                    <span className="opacity-20">/</span>
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
        </div>
      )}
    </section>
  );
};
