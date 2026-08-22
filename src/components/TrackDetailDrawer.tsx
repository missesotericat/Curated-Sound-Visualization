import React from 'react';
import { TrackConfig } from '../types';
import { Sparkles, Cpu, FileText, ArrowLeft, ArrowRight, Disc3 } from 'lucide-react';

interface TrackDetailDrawerProps {
  track: TrackConfig | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const TrackDetailDrawer: React.FC<TrackDetailDrawerProps> = ({ track, onClose }) => {
  if (!track) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--text-primary)] animate-fadeIn select-text p-1">
      {/* Top Header */}
      <div className="flex justify-between items-center pb-4 mb-4 border-b hairline-border">
        <div className="flex items-center gap-3">
          <span className="border hairline-border bg-[var(--bg-chip)] px-2.5 py-0.5 font-mono text-xs uppercase font-medium text-[var(--text-primary)]">
            {track.number} / 06
          </span>
          <span className="text-[10px] font-sans-clean uppercase tracking-widest text-[var(--accent-primary)] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
            EXHIBITION CATALOG NOTES
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono uppercase tracking-wider border hairline-border bg-[var(--bg-chip)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          title="Return to synchronized lyrics"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>RETURN TO LYRICS</span>
        </button>
      </div>

      {/* Scrollable Catalog Narrative Content */}
      <div className="flex-1 overflow-y-auto pr-3 space-y-7 scroll-smooth">
        {/* Title & Subtitle */}
        <div>
          <h2 className="font-heading-jost text-3xl md:text-4xl text-[var(--text-primary)] tracking-tight leading-tight">
            {track.title}
          </h2>
          {track.subtitle && (
            <p className="font-subtitle-outfit text-[var(--accent-primary)] text-base md:text-lg mt-1.5">
              {track.subtitle}
            </p>
          )}
        </div>

        {/* Artifact Record Display */}
        <div className="relative border hairline-border p-2.5 bg-[var(--bg-chip)]">
          <div className="w-full aspect-[16/9] overflow-hidden bg-black/40 relative group">
            <img
              src={track.artwork}
              alt={track.title}
              className="w-full h-full object-cover grayscale-[25%] group-hover:grayscale-0 transition-all duration-500"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute top-2 left-2 text-[9px] font-mono tracking-widest text-[var(--text-primary)] bg-[var(--bg-main)]/80 px-2 py-0.5 border hairline-border">
              ARTIFACT_{track.number}.JPG
            </div>
          </div>
          <div className="flex justify-between items-center text-[9px] uppercase font-mono tracking-widest text-[var(--text-muted)] pt-2 px-1">
            <span>ARCHIVE COLLECTION / 2026</span>
            <span>CYBER-HERITAGE SERIES</span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-y hairline-border py-5 text-xs font-sans-clean">
          {track.concept && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
                Concept
              </span>
              <span className="text-[var(--text-primary)] font-medium">{track.concept}</span>
            </div>
          )}
          {track.genre && track.genre.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
                Genre
              </span>
              <span className="text-[var(--text-primary)]">{track.genre.join(', ')}</span>
            </div>
          )}
          {track.mood && track.mood.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
                Mood
              </span>
              <span className="text-[var(--text-primary)]">{track.mood.join(' / ')}</span>
            </div>
          )}
          {track.bpm && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
                Tempo
              </span>
              <span className="text-[var(--text-primary)] font-mono">{track.bpm} BPM</span>
            </div>
          )}
          {track.keySignature && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
                Key Signature
              </span>
              <span className="text-[var(--text-primary)]">{track.keySignature}</span>
            </div>
          )}
          {track.language && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
                Language
              </span>
              <span className="text-[var(--text-primary)]">{track.language}</span>
            </div>
          )}
        </div>

        {/* Curatorial Overview */}
        {track.description && (
          <div className="space-y-2 font-sans-clean">
            <h3 className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Curatorial Overview</span>
            </h3>
            <p className="text-[15px] leading-relaxed text-[var(--text-primary)]/90 font-sans-clean">
              {track.description}
            </p>
          </div>
        )}

        {/* Exhibition Acoustic Architecture */}
        {track.exhibitionNotes && (
          <div className="bg-[var(--bg-chip)] p-4 border-l-2 border-[var(--accent-primary)] space-y-1.5">
            <h4 className="text-[11px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exhibition Acoustic Architecture</span>
            </h4>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {track.exhibitionNotes}
            </p>
          </div>
        )}

        {/* AI Models & Neural Synthesis */}
        {track.aiTools && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Models & Neural Synthesis</span>
            </h3>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {track.aiTools}
            </p>
          </div>
        )}

        {/* Credits & Co-Creation */}
        {track.credits && (
          <div className="pt-2 pb-4">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1">
              Credits & Co-Creation
            </span>
            <p className="text-xs text-[var(--text-primary)] italic">
              {track.credits}
            </p>
          </div>
        )}

        {/* Bottom Return To Player Action */}
        <div className="pt-6 pb-4 border-t hairline-border flex justify-between items-center">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono">
            VIETNAM / 2026 ARCHIVE
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <span>RETURN TO PLAYER</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

