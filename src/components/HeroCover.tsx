import React from 'react';
import { TrackConfig } from '../types';
import { Play, Sparkles, Compass, Disc3, ArrowDown } from 'lucide-react';

interface HeroCoverProps {
  tracks: TrackConfig[];
  onPlayTrack: (track: TrackConfig) => void;
  onExploreCollection: () => void;
}

export const HeroCover: React.FC<HeroCoverProps> = ({
  tracks,
  onPlayTrack,
  onExploreCollection
}) => {
  const featuredTrack = tracks[0];

  return (
    <section
      id="intro"
      className="relative min-h-[92vh] w-full pt-32 pb-20 px-6 md:px-16 flex flex-col justify-between border-b hairline-border overflow-hidden bg-[#10110E]"
    >
      {/* Editorial Watermark / Coordinates */}
      <div className="absolute top-28 right-6 md:right-16 text-right font-sans-clean text-[10px] uppercase tracking-widest text-[#767468] space-y-1 select-none pointer-events-none">
        <div className="border border-white/15 px-2.5 py-0.5 inline-block font-mono text-[#F5F3EC] bg-[#181A15]">
          ARCHIVE REF: CS-2026-VI
        </div>
        <div>AI MUSIC ARCHIVE / HANOI & GLOBAL</div>
        <div className="opacity-60">LATENT HARMONIC EXPLORATION</div>
      </div>

      {/* Main Editorial Hero Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto z-10">
        {/* Left Headline & Philosophy (7 cols) */}
        <div className="lg:col-span-7 space-y-8 max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 text-[11px] font-sans-clean tracking-widest uppercase text-[#8C8E58] font-semibold border-b border-[#8C8E58]/40 pb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AN AI MUSIC COLLECTION / 2026</span>
          </div>

          {/* Primary Exhibition Display Headline */}
          <h1 className="font-serif-editorial text-5xl sm:text-7xl lg:text-[92px] leading-[0.95] tracking-tight text-[#F5F3EC]">
            COLLECTED<br />
            <span className="italic font-normal text-[#E8E5DA]">SOUNDS.</span>
          </h1>

          {/* Supporting Poetic Manifesto */}
          <div className="space-y-3 font-sans-clean max-w-xl text-[#A5A396]">
            <p className="font-serif-editorial text-xl sm:text-2xl text-[#F5F3EC] italic font-normal leading-snug">
              Six songs. Six states of mind. One collection of machine-assisted imagination.
            </p>
            <p className="text-sm sm:text-[15px] leading-relaxed pt-2 text-[#A5A396]">
              An experimental digital music exhibition presenting six original AI-assisted songs.
              Traversing glitch pop, ethereal ambient sanctuaries, hyperpop digital traps, and intimate Vietnamese spoken-word reflections.
            </p>
          </div>

          {/* Direct CTA Affordances */}
          <div className="flex flex-wrap items-center gap-4 pt-4 font-sans-clean">
            <button
              onClick={() => onPlayTrack(featuredTrack)}
              className="group flex items-center gap-3 px-6 py-3.5 bg-[#F5F3EC] text-[#10110E] hover:bg-[#8C8E58] hover:text-[#10110E] transition-all duration-300 shadow-md font-semibold"
            >
              <Play className="w-4 h-4 text-[#10110E] fill-current transition-transform group-hover:scale-110" />
              <span className="text-xs uppercase tracking-widest font-semibold">
                BEGIN EXHIBITION (01 / {featuredTrack.title})
              </span>
            </button>

            <button
              onClick={onExploreCollection}
              className="flex items-center gap-2 px-5 py-3.5 border border-white/20 text-[#F5F3EC] hover:border-[#8C8E58] hover:text-[#8C8E58] transition-colors text-xs uppercase tracking-widest font-medium bg-[#161814]/50"
            >
              <span>EXPLORE ALL 6 ARTIFACTS</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Floating Gallery Composition (5 cols) */}
        <div className="lg:col-span-5 relative flex justify-center items-center mt-8 lg:mt-0">
          <div className="relative w-full max-w-md">
            {/* Primary Framed Artwork (01 Cốt Cách 5.0) */}
            <div
              onClick={() => onPlayTrack(featuredTrack)}
              className="group cursor-pointer relative border border-white/15 p-3 bg-[#181A15] shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:border-[#8C8E58]"
            >
              <div className="w-full aspect-[4/5] overflow-hidden bg-black/40 relative">
                <img
                  src={featuredTrack.artwork}
                  alt={featuredTrack.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#8C8E58]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-3 left-3 bg-[#10110E]/90 text-[#F5F3EC] text-[10px] font-mono px-2 py-1 uppercase tracking-widest border border-white/10">
                  PLAY ARTIFACT 01
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-3 font-sans-clean">
                <div>
                  <span className="text-[10px] font-mono text-[#8C8E58] font-semibold block">01 / 06</span>
                  <h3 className="font-serif-editorial text-lg text-[#F5F3EC] font-medium">{featuredTrack.title}</h3>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#A5A396] font-mono">{featuredTrack.genre[0]}</span>
              </div>
            </div>

            {/* Secondary Floating Offset Accent Frame (02 Utopia preview) */}
            {tracks[1] && (
              <div
                onClick={() => onPlayTrack(tracks[1])}
                className="hidden sm:block absolute -bottom-10 -right-8 w-44 border border-white/15 p-2 bg-[#181A15] shadow-2xl cursor-pointer hover:border-[#8C8E58] transition-all hover:scale-105"
              >
                <div className="w-full aspect-square overflow-hidden bg-black/40">
                  <img
                    src={tracks[1].artwork}
                    alt={tracks[1].title}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                  />
                </div>
                <div className="pt-1.5 flex justify-between items-center text-[9px] font-sans-clean uppercase tracking-wider">
                  <span className="font-mono text-[#8C8E58]">02 {tracks[1].title}</span>
                  <span className="text-[#A5A396]">{tracks[1].mood[0]}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Footnote Indicator Bar */}
      <div className="w-full pt-12 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-sans-clean uppercase tracking-widest text-[#767468] border-t hairline-border gap-4">
        <div className="flex items-center gap-6">
          <span className="font-mono text-[#F5F3EC] font-semibold">01 / 06 TRACKS</span>
          <span className="opacity-40">•</span>
          <span>BILINGUAL SYNCHRONIZED POETRY</span>
          <span className="opacity-40">•</span>
          <span>NEURAL HARMONICS</span>
        </div>

        <button
          onClick={onExploreCollection}
          className="flex items-center gap-2 hover:text-[#F5F3EC] transition-colors text-[10px] uppercase tracking-widest text-[#A5A396]"
        >
          <span>SCROLL TO EXPLORE EXHIBITION</span>
          <ArrowDown className="w-3 h-3 text-[#8C8E58] animate-bounce" />
        </button>
      </div>
    </section>
  );
};
