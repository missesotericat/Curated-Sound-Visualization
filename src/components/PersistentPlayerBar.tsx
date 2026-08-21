import React from 'react';
import { TrackConfig } from '../types';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Volume2, VolumeX, Radio } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { audioEngine } from '../services/audioEngine';

interface PersistentPlayerBarProps {
  track: TrackConfig | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onOpenPlayer: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PersistentPlayerBar: React.FC<PersistentPlayerBarProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  onOpenPlayer,
  onNext,
  onPrev
}) => {
  if (!track) return null;

  const playbackRatio = duration > 0 ? currentTime / duration : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <aside aria-label="Audio Playback Bar" className="fixed bottom-4 left-4 right-4 md:left-12 md:right-12 z-30 bg-[#131511]/95 backdrop-blur-xl border border-white/20 shadow-2xl p-3 sm:px-6 sm:py-3 transition-all duration-300 font-sans-clean select-none text-[#F5F3EC]">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Artwork & Metadata */}
        <div
          onClick={onOpenPlayer}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
        >
          <div className="w-11 h-11 border border-white/15 shrink-0 bg-black/40 overflow-hidden relative">
            <img
              src={track.artwork}
              alt={track.title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-[#8C8E58]/30 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-[#EDE686] animate-ping"></span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#8C8E58] font-semibold">
                {track.number}
              </span>
              <h4 className="font-serif-editorial text-sm sm:text-base text-[#F5F3EC] font-medium truncate group-hover:text-[#8C8E58] transition-colors">
                {track.title}
              </h4>
            </div>
            <p className="font-serif-editorial italic text-xs text-[#A5A396] truncate hidden sm:block">
              {track.subtitle || track.concept}
            </p>
          </div>
        </div>

        {/* Center: Live Waveform & Transport */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="hidden lg:block w-40 h-8">
            <AudioVisualizer
              mode="spectral-bars"
              height={32}
              accentColor="#8C8E58"
              playbackRatio={playbackRatio}
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onPrev}
              className="text-[#A5A396] hover:text-[#8C8E58] transition-colors p-1"
              title="Previous"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => audioEngine.togglePlay()}
              className="w-9 h-9 flex items-center justify-center border border-white/20 rounded-full bg-[#F5F3EC] text-[#10110E] hover:bg-[#8C8E58] hover:border-[#8C8E58] hover:text-[#10110E] transition-colors shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              )}
            </button>

            <button
              onClick={onNext}
              className="text-[#A5A396] hover:text-[#8C8E58] transition-colors p-1"
              title="Next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:block font-mono text-[11px] tabular-nums text-[#767468]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right: Expand to Immersive Mode */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPlayer}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#181A15] border border-white/20 text-[#F5F3EC] hover:bg-[#8C8E58] hover:text-[#10110E] hover:border-[#8C8E58] transition-colors text-xs uppercase tracking-widest font-semibold"
          >
            <span className="hidden sm:inline">IMMERSIVE PLAYER</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
