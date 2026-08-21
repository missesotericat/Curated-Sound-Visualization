import { TrackConfig, AudioMetrics } from '../types';

export interface AudioErrorState {
  message: string;
  filename: string;
  url: string;
}

export type AudioEventListener = (state: {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  trackId: string | null;
  audioError: AudioErrorState | null;
}) => void;

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private audioElement: HTMLAudioElement;

  private currentTrack: TrackConfig | null = null;
  private isPlaying = false;
  private isLoading = false;
  private isMuted = false;
  private volume = 0.85;
  private duration = 240;
  private currentTime = 0;
  private audioError: AudioErrorState | null = null;

  private listeners: Set<AudioEventListener> = new Set();
  private frequencyData: Uint8Array = new Uint8Array(128);
  private timeDomainData: Uint8Array = new Uint8Array(128);
  private rafId: number | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'metadata';

    this.audioElement.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audioElement.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.audioElement.addEventListener('canplay', this.handleCanPlay);
    this.audioElement.addEventListener('ended', this.handleEnded);
    this.audioElement.addEventListener('error', this.handleAudioError);
    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.isLoading = false;
      this.startPlaybackTicker();
      console.log('[AUDIO PLAYING]', this.audioElement.currentSrc || this.audioElement.src);
      this.notifyListeners();
    });
    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.stopPlaybackTicker();
      this.notifyListeners();
    });
  }

  private startPlaybackTicker = () => {
    if (this.rafId !== null) return;
    const tick = () => {
      if (this.isPlaying && this.audioElement) {
        const cur = this.audioElement.currentTime;
        if (Math.abs(cur - this.currentTime) > 0.04) {
          this.currentTime = cur;
          this.notifyListeners();
        }
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  };

  private stopPlaybackTicker = () => {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  private initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;

      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.masterGain);
      } catch (err) {
        console.warn('[AUDIO CONTEXT]', 'MediaElementSource already connected or crossOrigin restricted:', err);
      }

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((e) => console.warn('[AUDIO CONTEXT RESUME]', e));
    }
  }

  public async loadTrack(track: TrackConfig, autoPlay = true) {
    this.initAudioContext();

    // 1. Stop current audio
    this.audioElement.pause();
    this.isPlaying = false;
    this.currentTrack = track;
    this.currentTime = 0;
    this.audioError = null;
    this.isLoading = true;

    // Parse initial fallback duration if available
    if (track.duration) {
      const parts = track.duration.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        this.duration = parts[0] * 60 + parts[1];
      }
    }

    const targetAudioUrl = track.audioUrl || track.audio;

    // Diagnostics per requirements
    console.log('[AUDIO]', track.title);
    console.log('[AUDIO URL]', targetAudioUrl);

    // 3. Update audio.src & 4. load()
    this.audioElement.src = targetAudioUrl;
    this.audioElement.currentTime = 0;
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    this.audioElement.load();

    console.log('[AUDIO READY]', this.audioElement.readyState);
    console.log('[AUDIO ERROR]', this.audioElement.error);

    this.notifyListeners();

    if (autoPlay) {
      await this.play();
    }
  }

  private handleLoadedMetadata = () => {
    if (this.audioElement.duration && !isNaN(this.audioElement.duration) && this.audioElement.duration > 0) {
      this.duration = this.audioElement.duration;
    }
    this.isLoading = false;
    console.log('[AUDIO READY]', this.audioElement.readyState);
    this.notifyListeners();
  };

  private handleCanPlay = () => {
    this.isLoading = false;
    this.notifyListeners();
  };

  private handleAudioError = () => {
    const filename = this.currentTrack?.slug ? `${this.currentTrack.slug}.mp3` : 'audio.mp3';
    const url = this.audioElement.currentSrc || this.audioElement.src;
    console.error('[AUDIO FAILED]', url, this.audioElement.error);

    this.audioError = {
      message: 'Could not load the source audio.',
      filename,
      url
    };
    this.isPlaying = false;
    this.isLoading = false;
    this.notifyListeners();
  };

  private handleTimeUpdate = () => {
    this.currentTime = this.audioElement.currentTime;
    if (this.audioElement.duration && !isNaN(this.audioElement.duration) && this.audioElement.duration > 0) {
      this.duration = this.audioElement.duration;
    }
    this.notifyListeners();
  };

  private handleEnded = () => {
    this.isPlaying = false;
    this.notifyListeners();
  };

  public async play() {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn('[AUDIO CONTEXT RESUME]', e);
      }
    }

    try {
      await this.audioElement.play();
      this.isPlaying = true;
      this.audioError = null;
      console.log('[AUDIO PLAYING]', this.audioElement.currentSrc || this.audioElement.src);
      this.notifyListeners();
    } catch (err: unknown) {
      const errorObj = err as Error;
      // AbortError is benign if user switched track while loading
      if (errorObj?.name !== 'AbortError') {
        console.error('[AUDIO FAILED]', this.audioElement.currentSrc || this.audioElement.src, this.audioElement.error || errorObj);
        const filename = this.currentTrack?.slug ? `${this.currentTrack.slug}.mp3` : 'audio.mp3';
        this.audioError = {
          message: 'Could not load the source audio.',
          filename,
          url: this.audioElement.src || (this.currentTrack?.audioUrl || this.currentTrack?.audio || '')
        };
        this.isPlaying = false;
        this.isLoading = false;
        this.notifyListeners();
      }
    }
  }

  public pause() {
    this.audioElement.pause();
    this.isPlaying = false;
    this.notifyListeners();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(timeInSeconds: number) {
    const clamped = Math.max(0, Math.min(timeInSeconds, this.duration));
    this.currentTime = clamped;
    this.audioElement.currentTime = clamped;
    this.notifyListeners();
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(val, 1));
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    this.notifyListeners();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
  }

  public async retryCurrentTrack() {
    if (this.currentTrack) {
      await this.loadTrack(this.currentTrack, true);
    }
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  public getTimeDomainData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    }
    return this.timeDomainData;
  }

  public getAudioMetrics(): AudioMetrics {
    const freq = this.getFrequencyData();
    const len = freq.length;
    if (len === 0) {
      return { bass: 0, mid: 0, treble: 0, overallVolume: 0, energy: 0, isPeak: false };
    }

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let totalSum = 0;

    const bassEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.6);

    for (let i = 0; i < len; i++) {
      const val = freq[i] / 255;
      totalSum += val;
      if (i < bassEnd) {
        bassSum += val;
      } else if (i < midEnd) {
        midSum += val;
      } else {
        trebleSum += val;
      }
    }

    const bass = bassSum / (bassEnd || 1);
    const mid = midEnd > bassEnd ? midSum / (midEnd - bassEnd) : 0;
    const treble = len > midEnd ? trebleSum / (len - midEnd) : 0;
    const overallVolume = totalSum / len;
    const energy = bass * 0.5 + mid * 0.3 + treble * 0.2;

    return {
      bass,
      mid,
      treble,
      overallVolume,
      energy,
      isPeak: bass > 0.68 || energy > 0.72
    };
  }

  public subscribe(listener: AudioEventListener): () => void {
    this.listeners.add(listener);
    listener({
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      isMuted: this.isMuted,
      trackId: this.currentTrack?.id || null,
      audioError: this.audioError
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const state = {
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      isMuted: this.isMuted,
      trackId: this.currentTrack?.id || null,
      audioError: this.audioError
    };
    this.listeners.forEach((fn) => fn(state));
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      isMuted: this.isMuted,
      currentTrack: this.currentTrack,
      audioError: this.audioError
    };
  }
}

export const audioEngine = new AudioEngine();
