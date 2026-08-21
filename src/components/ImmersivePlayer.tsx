import React, { useState, useEffect } from 'react';
import { TrackConfig, NormalizedLyricDoc, LyricLearningItem, VisualizerMode } from '../types';
import { audioEngine } from '../services/audioEngine';
import { fetchTrackLyrics, parseDurationToSeconds } from '../services/lyricService';
import { AudioVisualizer } from './AudioVisualizer';
import { SynchronizedLyricsView } from './SynchronizedLyricsView';
import { LearnEnglishLayer } from './LearnEnglishLayer';
import { TrackDetailDrawer } from './TrackDetailDrawer';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';

interface ImmersivePlayerProps {
  track: TrackConfig;
  allTracks: TrackConfig[];
  onBack: () => void;
  onSelectTrack: (track: TrackConfig) => void;
}

export const ImmersivePlayer: React.FC<ImmersivePlayerProps> = ({
  track,
  allTracks,
  onBack,
  onSelectTrack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<{ message: string; filename: string; url: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  const [lyrics, setLyrics] = useState<NormalizedLyricDoc | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('spectral-bars');
  const [showLearningMode, setShowLearningMode] = useState(false);
  const [selectedLearningItem, setSelectedLearningItem] = useState<LyricLearningItem | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Subscribe to persistent audio engine
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setIsLoading(state.isLoading);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
      setAudioError(state.audioError);
    });

    return unsubscribe;
  }, []);

  // Fetch dynamic lyrics whenever track changes
  useEffect(() => {
    let isMounted = true;
    setImgLoaded(false);
    const trackSecs = parseDurationToSeconds(track.duration, duration || 240);
    fetchTrackLyrics(track.slug, trackSecs).then((doc) => {
      if (isMounted) {
        setLyrics(doc);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [track.slug, track.duration, duration]);

  const currentIndex = allTracks.findIndex((t) => t.id === track.id);

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % allTracks.length;
    onSelectTrack(allTracks[nextIdx]);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + allTracks.length) % allTracks.length;
    onSelectTrack(allTracks[prevIdx]);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioEngine.seek(time);
  };

  const handleScrubberSeek = (ratio: number) => {
    const target = ratio * duration;
    setCurrentTime(target);
    audioEngine.seek(target);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playbackRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="min-h-screen w-full bg-[#10110E] text-[#F5F3EC] flex flex-col relative overflow-hidden font-sans-clean select-none">
      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-40 px-6 md:px-16 py-6 flex justify-between items-center bg-[#10110E]/85 backdrop-blur-md border-b hairline-border">
        {/* Back to collection */}
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs uppercase tracking-widest font-sans-clean font-medium text-[#F5F3EC] hover:text-[#8C8E58] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>BACK TO COLLECTION</span>
        </button>

        {/* Center Pill / Mode Indicator */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-sans-clean uppercase tracking-widest text-[#A5A396]">
          <span className="px-2.5 py-0.5 border border-white/15 bg-[#181A15] text-[#F5F3EC]">
            EXHIBIT {track.number} OF 06
          </span>
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#8C8E58] bg-[#8C8E58]/10 px-2 py-0.5 border border-[#8C8E58]/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8C8E58]"></span>
              <span>LOADING AUDIO SOURCE</span>
            </span>
          )}
        </div>

        {/* Trailing action: Languages & Info */}
        <div className="flex items-center gap-4 text-xs tracking-widest font-sans-clean text-[#A5A396]">
          <button
            onClick={() => setShowDetailDrawer(!showDetailDrawer)}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all text-[11px] uppercase border ${
              showDetailDrawer
                ? 'bg-[#8C8E58] text-[#10110E] border-[#8C8E58] font-semibold'
                : 'border-white/15 text-[#A5A396] hover:border-[#8C8E58] hover:text-[#F5F3EC] bg-[#181A15]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showDetailDrawer ? 'VIEW LYRICS' : 'CATALOG NOTES'}</span>
          </button>
          <span className="opacity-30">|</span>
          <span className="text-[#8C8E58] font-semibold">{track.language}</span>
        </div>
      </header>

      {/* Main Exhibition Stage: 42% Artwork/Visualizer + 58% Lyrics or Full Notes */}
      <main className="flex-1 w-full flex flex-col md:flex-row pt-20 md:pt-24 pb-28 md:pb-32 px-6 md:px-16 max-w-7xl mx-auto items-stretch gap-8 md:gap-12 min-h-0">
        {/* Left Column: Framed Artwork & Visualizer (42% width) — Always Active and Audio-Reactive */}
        <section className="w-full md:w-[42%] flex flex-col justify-center items-center relative">
          <div className="w-full max-w-md flex flex-col items-center">
            {/* Artwork Container with Hairline Border and Gallery Treatment */}
            <div className={`w-full aspect-square relative border p-3 bg-[#181A15] shadow-2xl transition-all duration-500 group ${
              showDetailDrawer ? 'border-[#8C8E58]/40 ring-1 ring-[#8C8E58]/20' : 'border-white/15'
            }`}>
              <div className="w-full h-full relative overflow-hidden bg-black/50">
                <img
                  src={track.artwork}
                  alt={track.title}
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-all duration-1000 ${
                    imgLoaded ? 'grayscale-[15%] group-hover:grayscale-0 opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Fine Organic Waveform Ring Overlay when in Organic Mode */}
                {visualizerMode === 'organic-ring' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AudioVisualizer
                      mode="organic-ring"
                      height="100%"
                      accentColor="#8C8E58"
                    />
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute bottom-3 left-3 text-[10px] font-mono tracking-widest text-[#F5F3EC] bg-[#10110E]/90 backdrop-blur-md px-2.5 py-1 border border-white/20">
                  TRACK_{track.number}.WAV
                </div>

                {/* Live sound indicator */}
                {isPlaying && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#8C8E58] text-[#10110E] text-[9px] font-mono px-2 py-0.5 tracking-wider uppercase font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10110E] animate-ping"></span>
                    <span>LIVE</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-Artwork Quick Controls */}
            <div className="w-full flex justify-between items-center mt-4 text-[11px] font-sans-clean text-[#A5A396]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#8C8E58] font-semibold">VISUALIZER:</span>
                <button
                  onClick={() => setVisualizerMode('spectral-bars')}
                  className={`px-2 py-0.5 text-[10px] uppercase border transition-colors ${
                    visualizerMode === 'spectral-bars'
                      ? 'border-[#8C8E58] text-[#8C8E58] bg-[#8C8E58]/15 font-medium'
                      : 'border-transparent text-[#767468] hover:text-[#F5F3EC]'
                  }`}
                >
                  Spectral
                </button>
                <button
                  onClick={() => setVisualizerMode('fine-frequencies')}
                  className={`px-2 py-0.5 text-[10px] uppercase border transition-colors ${
                    visualizerMode === 'fine-frequencies'
                      ? 'border-[#8C8E58] text-[#8C8E58] bg-[#8C8E58]/15 font-medium'
                      : 'border-transparent text-[#767468] hover:text-[#F5F3EC]'
                  }`}
                >
                  Waves
                </button>
                <button
                  onClick={() => setVisualizerMode('organic-ring')}
                  className={`px-2 py-0.5 text-[10px] uppercase border transition-colors ${
                    visualizerMode === 'organic-ring'
                      ? 'border-[#8C8E58] text-[#8C8E58] bg-[#8C8E58]/15 font-medium'
                      : 'border-transparent text-[#767468] hover:text-[#F5F3EC]'
                  }`}
                >
                  Ring
                </button>
              </div>

              <button
                onClick={() => setShowDetailDrawer(!showDetailDrawer)}
                className="text-[10px] uppercase tracking-wider text-[#8C8E58] hover:underline flex items-center gap-1 font-medium"
              >
                <span>{showDetailDrawer ? 'View Lyrics' : 'Full Notes'}</span>
                <Info className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Title, Metadata Cluster & Synchronized Lyrics or Full Catalog Notes (58% width) */}
        <section className="w-full md:w-[58%] flex flex-col relative md:border-l hairline-border md:pl-10 min-h-[580px] md:min-h-[640px] h-[calc(100vh-190px)] max-h-[960px]">
          {showDetailDrawer ? (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <TrackDetailDrawer
                track={track}
                onClose={() => setShowDetailDrawer(false)}
              />
            </div>
          ) : (
            <>
              {/* Metadata Cluster */}
              <div className="flex justify-between items-start mb-3 shrink-0">
                <div>
                  <h1 className="font-serif-editorial text-3xl md:text-5xl text-[#F5F3EC] tracking-tight leading-tight">
                    {track.title}
                  </h1>
                  {track.subtitle && (
                    <p className="font-serif-editorial italic text-[#D4CE82] text-base md:text-lg mt-1.5">
                      {track.subtitle}
                    </p>
                  )}
                </div>

                {/* Top Right Label Block */}
                <div className="text-right flex flex-col items-end gap-1 font-sans-clean text-[10px] uppercase tracking-widest text-[#767468]">
                  <div className="border border-white/15 px-3 py-1 font-mono text-xs text-[#F5F3EC] font-semibold bg-[#181A15]">
                    {track.number}/06
                  </div>
                  <div className="text-[#8C8E58] font-semibold">{track.genre[0]}</div>
                  <div className="opacity-70 font-mono text-[#A5A396]">{track.bpm} BPM</div>
                </div>
              </div>

              {/* Audio Load Error Banner (if error occurred) */}
              {audioError && (
                <div className="w-full bg-[#2A1515] border border-red-500/50 text-[#F5F3EC] p-3.5 mb-3 flex items-center justify-between gap-4 text-xs font-mono shrink-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-red-400 font-bold uppercase tracking-wider text-[11px]">
                        AUDIO LOAD ERROR
                      </span>
                    </div>
                    <span className="text-white/90 text-[11px] truncate">{audioError.filename}</span>
                    <span className="text-[#A5A396] text-[10px]">{audioError.message}</span>
                  </div>
                  <button
                    onClick={() => audioEngine.retryCurrentTrack()}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 uppercase tracking-widest text-[10px] font-sans-clean font-semibold transition-colors shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Synchronized Bilingual Lyrics Canvas — Dedicated Tall Viewport */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <SynchronizedLyricsView
                  lyrics={lyrics}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  track={track}
                  showLearningMode={showLearningMode}
                  onToggleLearningMode={() => setShowLearningMode(!showLearningMode)}
                  onSelectLearningItem={(item) => setSelectedLearningItem(item)}
                />
              </div>
            </>
          )}
        </section>
      </main>

      {/* Fixed Bottom Exhibition Audio Controller & Spectral Waveform */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#131511]/95 backdrop-blur-xl border-t border-white/15 flex flex-col z-50 shadow-2xl">
        {/* Live Reactive Waveform Scrubber */}
        <div className="w-full relative group">
          <AudioVisualizer
            mode={visualizerMode === 'organic-ring' ? 'fine-frequencies' : visualizerMode}
            height={44}
            accentColor="#8C8E58"
            interactive={true}
            onSeek={handleScrubberSeek}
            playbackRatio={playbackRatio}
            className="w-full bg-[#161814]/80"
          />

          {/* Precision Scrubber Line */}
          <div
            className="w-full h-[2px] bg-white/10 relative cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              handleScrubberSeek(ratio);
            }}
          >
            <div
              className="absolute top-0 left-0 h-full bg-[#8C8E58] transition-all duration-100 ease-linear"
              style={{ width: `${playbackRatio * 100}%` }}
            ></div>
            {/* Playhead Diamond */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#EDE686] border border-[#10110E] shadow-md pointer-events-none -ml-1.5"
              style={{ left: `${playbackRatio * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Controls Bar Container */}
        <div className="flex justify-between items-center w-full px-6 md:px-16 py-3.5">
          {/* Elapsed & Duration time */}
          <div className="font-mono text-xs tabular-nums tracking-wider text-[#A5A396] w-32">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Primary Transport Controls */}
          <div className="flex items-center gap-6 md:gap-8">
            <button
              onClick={handlePrev}
              className="text-[#A5A396] hover:text-[#8C8E58] transition-colors p-1.5"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Circular Play/Pause Button */}
            <button
              onClick={() => audioEngine.togglePlay()}
              className="w-12 h-12 flex items-center justify-center border border-white/20 rounded-full hover:bg-[#8C8E58] hover:border-[#8C8E58] hover:text-[#10110E] transition-all duration-300 group shadow-lg bg-[#F5F3EC] text-[#10110E]"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 transition-transform group-hover:scale-90" />
              ) : (
                <Play className="w-5 h-5 ml-0.5 fill-current transition-transform group-hover:scale-95 text-[#10110E]" />
              )}
            </button>

            <button
              onClick={handleNext}
              className="text-[#A5A396] hover:text-[#8C8E58] transition-colors p-1.5"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Volume & Auxiliary Actions */}
          <div className="flex items-center gap-3 md:gap-5 w-36 justify-end text-[#A5A396]">
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => audioEngine.toggleMute()}
                className="hover:text-[#8C8E58] transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/20 accent-[#8C8E58] cursor-pointer"
              />
            </div>

            <button
              onClick={() => setShowDetailDrawer(!showDetailDrawer)}
              className={`transition-colors p-1 border ${
                showDetailDrawer
                  ? 'border-[#8C8E58] text-[#8C8E58] bg-[#8C8E58]/15'
                  : 'border-transparent text-[#A5A396] hover:text-[#8C8E58]'
              }`}
              title="Toggle Exhibition Catalog Notes"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>

      {/* Linguistic "Learn English" Annotation Modal */}
      <LearnEnglishLayer
        item={selectedLearningItem}
        onClose={() => setSelectedLearningItem(null)}
      />
    </div>
  );
};
