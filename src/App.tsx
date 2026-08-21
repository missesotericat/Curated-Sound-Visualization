import React, { useState, useEffect } from 'react';
import { TRACK_REGISTRY } from './config/tracks';
import { TrackConfig } from './types';
import { audioEngine } from './services/audioEngine';
import { Header } from './components/Header';
import { HeroCover } from './components/HeroCover';
import { CollectionGallery } from './components/CollectionGallery';
import { ClosingIndex } from './components/ClosingIndex';
import { ImmersivePlayer } from './components/ImmersivePlayer';
import { PersistentPlayerBar } from './components/PersistentPlayerBar';

export default function App() {
  const [tracks] = useState<TrackConfig[]>(TRACK_REGISTRY);
  const [currentTrack, setCurrentTrack] = useState<TrackConfig | null>(TRACK_REGISTRY[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240);
  const [activeSection, setActiveSection] = useState<'intro' | 'collection' | 'closing'>('intro');
  const [viewMode, setViewMode] = useState<'gallery' | 'immersive'>('gallery');

  // Subscribe to persistent audio engine
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
    });

    return unsubscribe;
  }, []);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is focused on an input element
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.togglePlay();
      } else if (e.code === 'Escape') {
        if (viewMode === 'immersive') {
          setViewMode('gallery');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const handlePlayTrack = (track: TrackConfig) => {
    if (currentTrack?.id === track.id) {
      audioEngine.togglePlay();
    } else {
      setCurrentTrack(track);
      audioEngine.loadTrack(track, true);
    }
  };

  const handleOpenLyrics = (track: TrackConfig) => {
    if (currentTrack?.id !== track.id) {
      setCurrentTrack(track);
      audioEngine.loadTrack(track, true);
    }
    setViewMode('immersive');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextTrack = () => {
    if (!currentTrack) return;
    const currIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = tracks[(currIdx + 1) % tracks.length];
    setCurrentTrack(nextTrack);
    audioEngine.loadTrack(nextTrack, true);
  };

  const handlePrevTrack = () => {
    if (!currentTrack) return;
    const currIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = tracks[(currIdx - 1 + tracks.length) % tracks.length];
    setCurrentTrack(prevTrack);
    audioEngine.loadTrack(prevTrack, true);
  };

  const handleNavigateSection = (sectionId: string) => {
    if (viewMode === 'immersive') {
      setViewMode('gallery');
    }
    setActiveSection(sectionId as 'intro' | 'collection' | 'closing');
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#10110E] text-[#F5F3EC] font-sans-clean">
      {/* Editorial Fine Film Grain Overlay */}
      <div className="noise-overlay" />

      {viewMode === 'immersive' && currentTrack ? (
        <ImmersivePlayer
          track={currentTrack}
          allTracks={tracks}
          onBack={() => setViewMode('gallery')}
          onSelectTrack={(t) => {
            setCurrentTrack(t);
            audioEngine.loadTrack(t, true);
          }}
        />
      ) : (
        <>
          {/* Minimalist Exhibition Header */}
          <Header
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onOpenPlayer={() => setViewMode('immersive')}
            activeSection={activeSection}
            onNavigate={handleNavigateSection}
          />

          <main className="w-full">
            {/* 01 — INTRO / COVER */}
            <HeroCover
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onExploreCollection={() => handleNavigateSection('collection')}
            />

            {/* 02 — THE COLLECTION (Asymmetric Fine-Art Exhibition) */}
            <CollectionGallery
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onOpenLyrics={handleOpenLyrics}
            />

            {/* 08 — THE ARCHIVE INDEX & COLOPHON */}
            <ClosingIndex
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onOpenLyrics={handleOpenLyrics}
            />
          </main>

          {/* Persistent Floating Audio Bar */}
          <PersistentPlayerBar
            track={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onOpenPlayer={() => setViewMode('immersive')}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
          />
        </>
      )}
    </div>
  );
}
