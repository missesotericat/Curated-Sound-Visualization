import React from 'react';
import { TrackConfig } from '../types';
import { Play, Pause, ArrowUpRight } from 'lucide-react';

interface ClosingIndexProps {
  tracks: TrackConfig[];
  currentTrack: TrackConfig | null;
  isPlaying: boolean;
  onPlayTrack: (track: TrackConfig) => void;
  onOpenLyrics: (track: TrackConfig) => void;
}

export const ClosingIndex: React.FC<ClosingIndexProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onOpenLyrics
}) => {
  return (
    <footer id="closing" className="py-24 px-6 md:px-16 max-w-7xl mx-auto font-sans-clean bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 mb-12 border-b hairline-border gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-2">
            08 / ARCHIVE INDEX & CATALOG
          </span>
          <h2 className="font-heading-jost text-4xl sm:text-5xl text-[var(--text-primary)] tracking-tight">
            THE ARCHIVE INDEX.
          </h2>
        </div>

        <p className="font-subtitle-outfit text-base sm:text-lg text-[var(--text-secondary)] max-w-md">
          A definitive inventory of all six machine-assisted compositions and bilingual lyrical manuscripts.
        </p>
      </div>

      {/* Catalog Table */}
      <div className="w-full overflow-x-auto border hairline-border bg-[var(--bg-surface)] shadow-2xl mb-16">
        <table className="w-full text-left text-xs font-sans-clean">
          <thead className="bg-[var(--bg-chip)] border-b hairline-border text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
            <tr>
              <th className="py-3 px-4 font-mono">No.</th>
              <th className="py-3 px-4">Title & Subtitle</th>
              <th className="py-3 px-4">Concept</th>
              <th className="py-3 px-4">Genre / Mood</th>
              <th className="py-3 px-4">Tempo / Key</th>
              <th className="py-3 px-4">Language</th>
              <th className="py-3 px-4 text-right">Accession</th>
            </tr>
          </thead>
          <tbody className="divide-y hairline-border">
            {tracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isTrackPlaying = isCurrent && isPlaying;

              return (
                <tr
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className={`cursor-pointer transition-colors duration-200 ${
                    isCurrent
                      ? 'bg-[var(--accent-primary)]/15 font-medium'
                      : 'hover:bg-[var(--bg-surface-elevated)]'
                  }`}
                >
                  {/* Number */}
                  <td className="py-4 px-4 font-mono font-semibold text-[var(--accent-primary)]">
                    {track.number}
                  </td>

                  {/* Title & Subtitle */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 border hairline-border shrink-0 bg-black/40 overflow-hidden">
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <div>
                        <div className="font-heading-jost text-[16px] text-[var(--text-primary)] leading-tight font-medium">
                          {track.title}
                        </div>
                        {track.subtitle && (
                          <div className="font-subtitle-outfit text-[12px] text-[var(--text-secondary)]">
                            {track.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Concept */}
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] text-[10px] uppercase font-semibold">
                      {track.concept}
                    </span>
                  </td>

                  {/* Genre / Mood */}
                  <td className="py-4 px-4 text-[var(--text-secondary)]">
                    <div className="text-[var(--text-primary)]">{track.genre.join(', ')}</div>
                    <div className="text-[10px] text-[var(--accent-primary)] opacity-90">{track.mood.join(' • ')}</div>
                  </td>

                  {/* Tempo / Key */}
                  <td className="py-4 px-4 font-mono text-[11px] text-[var(--text-primary)]">
                    <div>{track.bpm} BPM</div>
                    <div className="text-[var(--text-muted)] text-[10px]">{track.keySignature}</div>
                  </td>

                  {/* Language */}
                  <td className="py-4 px-4 text-[var(--text-secondary)] font-mono text-[11px]">
                    {track.language}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="p-2 border hairline-border bg-[var(--bg-chip)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:text-[#10110E] transition-colors"
                        title={isTrackPlaying ? 'Pause' : 'Play'}
                      >
                        {isTrackPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>

                      <button
                        onClick={() => onOpenLyrics(track)}
                        className="p-2 border hairline-border bg-[var(--bg-chip)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:text-[#10110E] transition-colors"
                        title="Open Synchronized Lyrics"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Curatorial Colophon */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-12 border-t hairline-border text-[var(--text-secondary)] text-xs">
        <div className="md:col-span-4 space-y-2">
          <h4 className="text-[10px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold">
            CURATORIAL STATEMENT
          </h4>
          <p className="leading-relaxed">
            SONOVERSE explores machine-assisted music as an authentic editorial canvas. 
            Blending synthetic voice algorithms, harmonic tensor synthesis, and bilingual Vietnamese-English lyricism.
          </p>
        </div>

        <div className="md:col-span-4 space-y-2">
          <h4 className="text-[10px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold">
            SOUND & VISUAL ARCHITECTURE
          </h4>
          <p className="leading-relaxed">
            Neural composition via Suno AI & custom prompt engineering. Real-time spectral analysis powered by Web Audio API and HTML5 Canvas.
          </p>
        </div>

        <div className="md:col-span-4 space-y-2">
          <h4 className="text-[10px] uppercase font-sans-clean tracking-widest text-[var(--accent-primary)] font-semibold">
            PROVENANCE
          </h4>
          <p className="leading-relaxed font-mono text-[11px]">
            Repository: missesotericat/WaveVisualization<br />
            Curated Edition / Hanoi & Global / 2026
          </p>
        </div>
      </div>

      {/* Bottom Copyright and Footer Links */}
      <div className="mt-16 pt-8 border-t hairline-border flex flex-col sm:flex-row justify-between items-center text-[11px] uppercase tracking-widest text-[var(--text-muted)] gap-4">
        <div className="flex items-center gap-1.5 font-mono">
          <span>© 2026</span>
          <a
            href="https://phandora.space/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors font-medium no-underline"
          >
            Phandora.space
          </a>
          <span>— All Rights Reserved</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono">
          <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
            <a
              href="https://phandora.space/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors no-underline font-normal"
            >
              Terms
            </a>
            <span className="text-[var(--text-muted)] opacity-60">•</span>
            <a
              href="https://phandora.space/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors no-underline font-normal"
            >
              API / Docs
            </a>
          </div>

          <a
            href="https://phandora.gumroad.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors font-semibold no-underline"
          >
            Build a similar site like this
          </a>
        </div>
      </div>
    </footer>
  );
};
