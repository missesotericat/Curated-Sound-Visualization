import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { VisualizerMode } from '../types';

interface AudioVisualizerProps {
  mode?: VisualizerMode;
  height?: number | string;
  className?: string;
  accentColor?: string;
  interactive?: boolean;
  onSeek?: (ratio: number) => void;
  playbackRatio?: number;
}

const MAX_BARS = 160;
const WAVE_POINTS = 80;
const GROUP_SIZE = 5; // 5 bars per color group

// Exact palette specification
const GROUP_PALETTE = ['#646631', '#f1ea8a', '#c9dce9'];
const UNPLAYED_PALETTE = [
  'rgba(100, 102, 49, 0.32)',
  'rgba(241, 234, 138, 0.28)',
  'rgba(201, 220, 233, 0.24)'
];

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode = 'spectral-bars',
  height = 48,
  className = '',
  accentColor = '#646631',
  interactive = false,
  onSeek,
  playbackRatio = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Store playbackRatio in a ref so continuous currentTime updates do NOT trigger useEffect re-runs
  // and do NOT re-instantiate or zero-out the smoothing buffers.
  const playbackRatioRef = useRef(playbackRatio);
  playbackRatioRef.current = playbackRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || 300;
    let canvasHeight = typeof height === 'number' ? height : container.clientHeight || 48;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = container.clientWidth || 300;
      canvasHeight = typeof height === 'number' ? height : container.clientHeight || 48;
      canvas.width = width * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform before re-scaling
      ctx.scale(dpr, dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let phase = 0;

    // Persistent smoothed state buffers across frames
    const smoothedBars = new Float32Array(MAX_BARS);
    const peakBars = new Float32Array(MAX_BARS);
    const peakAlphas = new Float32Array(MAX_BARS);
    const smoothedWave = new Float32Array(WAVE_POINTS);

    const render = () => {
      ctx.clearRect(0, 0, width, canvasHeight);

      const freqData = audioEngine.getFrequencyData();
      const timeData = audioEngine.getTimeDomainData();
      const metrics = audioEngine.getAudioMetrics();
      const isPlaying = audioEngine.getState().isPlaying;
      const currentPlaybackRatio = playbackRatioRef.current;

      // Continuous fluid phase with gentle idle drift and subtle energy modulation
      const phaseDelta = isPlaying ? 0.022 + metrics.energy * 0.03 : 0.008;
      phase += phaseDelta;

      if (mode === 'fine-frequencies' || mode === 'organic-ring') {
        renderFluidWaves(
          ctx,
          width,
          canvasHeight,
          timeData,
          freqData,
          metrics,
          isPlaying,
          phase,
          smoothedWave
        );
      } else {
        // Default: spectral-bars with grouped 3-color system
        renderGroupedSpectralBars(
          ctx,
          width,
          canvasHeight,
          freqData,
          metrics,
          isPlaying,
          currentPlaybackRatio,
          phase,
          smoothedBars,
          peakBars,
          peakAlphas
        );
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      observer.disconnect();
    };
  }, [mode, height, accentColor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onSeek(ratio);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      className={`relative w-full ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};

/**
 * Smooth Spectral Bars with Grouped 3-Color Pattern (#646631 → #f1ea8a → #c9dce9)
 * 5 bars per color group, repeating horizontally.
 * Color remains fixed by bar index while amplitude smoothly animates height.
 */
function renderGroupedSpectralBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  metrics: { bass: number; energy: number },
  isPlaying: boolean,
  playbackRatio: number,
  phase: number,
  smoothedBars: Float32Array,
  peakBars: Float32Array,
  peakAlphas: Float32Array
) {
  const barCount = Math.min(120, Math.max(32, Math.floor(width / 5)));
  const barSpacing = width / barCount;
  const barWidth = Math.max(1.5, barSpacing * 0.52);
  const playedIndex = Math.floor(barCount * playbackRatio);

  for (let i = 0; i < barCount; i++) {
    const dataIdx = Math.floor((i / barCount) * (freqData.length * 0.72));
    const rawVal = freqData[dataIdx] || 0;

    let targetNorm = isPlaying
      ? (rawVal / 255) * (0.85 + metrics.energy * 0.2)
      : 0.05 + Math.sin(phase * 0.6 + i * 0.14) * 0.02;

    // Floor baseline height for delicate resting state
    targetNorm = Math.max(0.04, targetNorm);

    // Asymmetric Lerp: Attack (0.18 responsive) vs Decay (0.05 slow & smooth, eliminates flashing)
    const current = smoothedBars[i];
    const attackFactor = 0.18;
    const decayFactor = 0.05;

    if (targetNorm > current) {
      smoothedBars[i] += (targetNorm - current) * attackFactor;
    } else {
      smoothedBars[i] += (targetNorm - current) * decayFactor;
    }

    const norm = smoothedBars[i];
    const barHeight = Math.max(2.5, norm * (height * 0.90));
    const x = i * barSpacing + (barSpacing - barWidth) / 2;
    const y = height - barHeight;

    // Determine fixed group color by bar index
    const colorGroupIndex = Math.floor(i / GROUP_SIZE) % 3;
    const isPast = playbackRatio > 0 ? i <= playedIndex : true;

    ctx.fillStyle = isPast
      ? GROUP_PALETTE[colorGroupIndex]
      : UNPLAYED_PALETTE[colorGroupIndex];

    ctx.fillRect(x, y, barWidth, barHeight);

    // Subtle peak tracker
    if (barHeight > peakBars[i]) {
      peakBars[i] = barHeight;
      peakAlphas[i] = 1.0;
    } else {
      peakBars[i] -= 0.5; // slow downward gravity
      peakAlphas[i] = Math.max(0, peakAlphas[i] - 0.015);
    }

    if (isPast && peakAlphas[i] > 0.05 && peakBars[i] > 5) {
      const peakY = height - peakBars[i] - 1.5;
      if (peakY >= 0 && peakY < y - 1) {
        ctx.fillStyle = `rgba(245, 243, 236, ${peakAlphas[i] * 0.6})`;
        ctx.fillRect(x, peakY, barWidth, 1.2);
      }
    }
  }
}

/**
 * Fluid Harmonic Waves with Continuous 3-Color Signal Palette (#646631, #f1ea8a, #c9dce9)
 * Represents continuous physical signals passing through the exhibition archive.
 */
function renderFluidWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeData: Uint8Array,
  freqData: Uint8Array,
  metrics: { bass: number; energy: number },
  isPlaying: boolean,
  phase: number,
  smoothedWave: Float32Array
) {
  const midY = height / 2;
  const points = Math.min(WAVE_POINTS, Math.floor(width / 6));

  // Update smoothed waveform values
  for (let i = 0; i <= points; i++) {
    const dataIdx = Math.floor((i / points) * (timeData.length - 1));
    const rawTime = isPlaying ? (timeData[dataIdx] - 128) / 128 : 0;
    const rawFreq = isPlaying ? freqData[dataIdx] / 255 : 0.05;

    const targetVal = rawTime * 0.6 + rawFreq * 0.4;
    smoothedWave[i] += (targetVal - smoothedWave[i]) * (isPlaying ? 0.18 : 0.06);
  }

  // 3 Distinct harmonic layers corresponding to the 3 palette colors:
  // Layer 0: #f1ea8a (primary luminous harmonic)
  // Layer 1: #646631 (earthy foundation harmonic)
  // Layer 2: #c9dce9 (silver-blue high harmonic)
  const layerColors = [
    '#f1ea8a',
    '#646631',
    '#c9dce9'
  ];

  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.lineWidth = layer === 0 ? 1.6 : 1.0;
    ctx.strokeStyle = layerColors[layer];

    const step = width / points;
    const layerSpeed = 1 + layer * 0.32;
    const layerAmp = 1 - layer * 0.22;

    for (let i = 0; i <= points; i++) {
      const x = i * step;
      const waveOffset = smoothedWave[i] * (height * 0.32 * layerAmp);
      const idleSine = Math.sin(phase * layerSpeed + (x / width) * Math.PI * 4 + layer * 1.2) *
        (height * (isPlaying ? 0.16 + metrics.energy * 0.12 : 0.08) * layerAmp);

      const y = midY + idleSine + waveOffset;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, y, cpX, y);
      }
    }
    ctx.stroke();
  }
}
