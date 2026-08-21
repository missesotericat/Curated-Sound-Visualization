import React from 'react';
import { TrackConfig } from '../types';
import { Play, Pause, ArrowUpRight, Sparkles, Disc3, Radio, Music } from 'lucide-react';

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
    <footer id="closing" className="py-24 px-6 md:px-16 max-w-7xl mx-auto font-sans-clean bg-[#10110E] text-[#F5F3EC]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 mb-12 border-b hairline-border gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#8C8E58] font-semibold block mb-2">
            08 / ARCHIVE INDEX & CATALOG
          </span>
          <h2 className="font-serif-editorial text-4xl sm:text-5xl text-[#F5F3EC] tracking-tight">
            THE ARCHIVE INDEX.
          </h2>
        </div>

        <p className="font-serif-editorial italic text-base sm:text-lg text-[#A5A396] max-w-md">
          A definitive inventory of all six machine-assisted compositions and bilingual lyrical manuscripts.
        </p>
      </div>

      {/* Catalog Table */}
      <div className="w-full overflow-x-auto border border-white/15 bg-[#181A15] shadow-2xl mb-16">
        <table className="w-full text-left text-xs font-sans-clean">
          <thead className="bg-[#131511] border-b border-white/15 text-[10px] uppercase tracking-widest text-[#A5A396]">
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
                      ? 'bg-[#8C8E58]/15 font-medium'
                      : 'hover:bg-[#1e201a]'
                  }`}
                >
                  {/* Number */}
                  <td className="py-4 px-4 font-mono font-semibold text-[#8C8E58]">
                    {track.number}
                  </td>

                  {/* Title & Subtitle */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 border border-white/15 shrink-0 bg-black/40 overflow-hidden">
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <div>
                        <div className="font-serif-editorial text-[16px] text-[#F5F3EC] leading-tight">
                          {track.title}
                        </div>
                        {track.subtitle && (
                          <div className="font-serif-editorial italic text-[12px] text-[#A5A396]">
                            {track.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Concept */}
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 border border-[#8C8E58]/30 bg-[#8C8E58]/15 text-[#D4CE82] text-[10px] uppercase font-semibold">
                      {track.concept}
                    </span>
                  </td>

                  {/* Genre / Mood */}
                  <td className="py-4 px-4 text-[#A5A396]">
                    <div className="text-[#F5F3EC]">{track.genre.join(', ')}</div>
                    <div className="text-[10px] text-[#8C8E58] opacity-90">{track.mood.join(' • ')}</div>
                  </td>

                  {/* Tempo / Key */}
                  <td className="py-4 px-4 font-mono text-[11px] text-[#F5F3EC]">
                    <div>{track.bpm} BPM</div>
                    <div className="text-[#767468] text-[10px]">{track.keySignature}</div>
                  </td>

                  {/* Language */}
                  <td className="py-4 px-4 text-[#A5A396] font-mono text-[11px]">
                    {track.language}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="p-2 border border-white/20 bg-[#161814] text-[#F5F3EC] hover:bg-[#8C8E58] hover:border-[#8C8E58] hover:text-[#10110E] transition-colors"
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
                        className="p-2 border border-white/20 bg-[#161814] text-[#F5F3EC] hover:bg-[#8C8E58] hover:border-[#8C8E58] hover:text-[#10110E] transition-colors"
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-12 border-t hairline-border text-[#A5A396] text-xs">
        <div className="md:col-span-4 space-y-2">
          <h4 className="text-[10px] uppercase font-sans-clean tracking-widest text-[#8C8E58] font-semibold">
            CURATORIAL STATEMENT
          </h4>
          <p className="leading-relaxed">
            COLLECTED SOUNDS explores machine-assisted music as an authentic editorial canvas. 
            Blending synthetic voice algorithms, harmonic tensor synthesis, and bilingual Vietnamese-English lyricism.
          </p>
        </div>

        <div className="md:col-span-4 space-y-2">
          <h4 className="text-[10px] uppercase font-sans-clean tracking-widest text-[#8C8E58] font-semibold">
            SOUND & VISUAL ARCHITECTURE
          </h4>
          <p className="leading-relaxed">
            Neural composition via Suno AI & custom prompt engineering. Real-time spectral analysis powered by Web Audio API and HTML5 Canvas.
          </p>
        </div>

        <div className="md:col-span-4 space-y-2">
          <h4 className="text-[10px] uppercase font-sans-clean tracking-widest text-[#8C8E58] font-semibold">
            PROVENANCE
          </h4>
          <p className="leading-relaxed font-mono text-[11px]">
            Repository: missesotericat/WaveVisualization<br />
            Curated Edition / Hanoi & Global / 2026
          </p>
        </div>
      </div>

      {/* Bottom Copyright and Colophon */}
      <div className="mt-16 pt-8 border-t hairline-border flex flex-col sm:flex-row justify-between items-center text-[10px] uppercase tracking-widest text-[#767468] gap-4">
        <span>© 2026 COLLECTED SOUNDS EXHIBITION. ALL RIGHTS RESERVED.</span>
        <div className="flex items-center gap-4">
          <span>AI ASSISTED MUSIC ARCHIVE</span>
          <span>•</span>
          <span className="text-[#8C8E58] font-semibold">VIETNAMESE / ENGLISH</span>
        </div>
      </div>
    </footer>
  );
};
