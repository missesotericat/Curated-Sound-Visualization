import React from 'react';
import { TrackConfig } from '../types';
import { Play, Pause, Disc3, Radio } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface HeaderProps {
  currentTrack: TrackConfig | null;
  isPlaying: boolean;
  onOpenPlayer: () => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTrack,
  isPlaying,
  onOpenPlayer,
  activeSection,
  onNavigate
}) => {
  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-[#10110E]/85 backdrop-blur-xl border-b hairline-border px-6 md:px-16 py-4 flex justify-between items-center transition-all duration-300">
      {/* Brand / Exhibition Title */}
      <button
        onClick={() => onNavigate('intro')}
        className="text-left font-serif-editorial text-xl md:text-2xl text-[#F5F3EC] tracking-tight hover:opacity-80 transition-opacity"
      >
        COLLECTED SOUNDS.
      </button>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-8 text-[11px] font-sans-clean tracking-widest uppercase text-[#A5A396]">
        <button
          onClick={() => onNavigate('intro')}
          className={`pb-0.5 border-b transition-colors ${
            activeSection === 'intro'
              ? 'border-[#8C8E58] text-[#8C8E58] font-semibold'
              : 'border-transparent hover:text-[#F5F3EC]'
          }`}
        >
          INTRO
        </button>
        <button
          onClick={() => onNavigate('collection')}
          className={`pb-0.5 border-b transition-colors ${
            activeSection === 'collection'
              ? 'border-[#8C8E58] text-[#8C8E58] font-semibold'
              : 'border-transparent hover:text-[#F5F3EC]'
          }`}
        >
          THE COLLECTION
        </button>
        <button
          onClick={() => onNavigate('closing')}
          className={`pb-0.5 border-b transition-colors ${
            activeSection === 'closing'
              ? 'border-[#8C8E58] text-[#8C8E58] font-semibold'
              : 'border-transparent hover:text-[#F5F3EC]'
          }`}
        >
          ARCHIVE INDEX
        </button>
      </div>

      {/* Trailing Active Song Pill / Open Immersive Player */}
      <div className="flex items-center gap-3">
        {currentTrack && (
          <button
            onClick={onOpenPlayer}
            className="group flex items-center gap-2.5 px-3.5 py-1.5 border border-white/15 bg-[#181A15] hover:bg-[#8C8E58] hover:text-[#10110E] hover:border-[#8C8E58] transition-all duration-300 text-xs font-sans-clean shadow-sm"
            title="Open Immersive Visualizer & Synchronized Lyrics"
          >
            <span className="w-2 h-2 rounded-full bg-[#8C8E58] group-hover:bg-[#10110E] animate-pulse"></span>
            <span className="font-mono text-[10px] text-[#A4A76B] group-hover:text-[#10110E] font-semibold">
              {currentTrack.number}
            </span>
            <span className="font-medium tracking-tight truncate max-w-[130px] sm:max-w-[200px] text-[#F5F3EC] group-hover:text-[#10110E]">
              {currentTrack.title}
            </span>
            {isPlaying ? (
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#A4A76B] group-hover:text-[#10110E] flex items-center gap-1">
                <Radio className="w-3 h-3 animate-spin" />
              </span>
            ) : (
              <Play className="w-3 h-3 text-[#A4A76B] group-hover:text-[#10110E]" />
            )}
          </button>
        )}

        <div className="hidden sm:block text-[11px] font-sans-clean text-[#8C8E58] tracking-widest uppercase font-semibold pl-2">
          VI / EN
        </div>
      </div>
    </nav>
  );
};
