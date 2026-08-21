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
      ctx.scale(dpr, dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, canvasHeight);

      const freqData = audioEngine.getFrequencyData();
      const timeData = audioEngine.getTimeDomainData();
      const metrics = audioEngine.getAudioMetrics();
      const isPlaying = audioEngine.getState().isPlaying;

      phase += isPlaying ? 0.05 + metrics.energy * 0.05 : 0.015;

      if (mode === 'spectral-bars') {
        renderSpectralBars(ctx, width, canvasHeight, freqData, isPlaying, accentColor, playbackRatio, phase);
      } else if (mode === 'fine-frequencies') {
        renderFineFrequencies(ctx, width, canvasHeight, timeData, freqData, isPlaying, accentColor, phase);
      } else if (mode === 'organic-ring') {
        renderOrganicRing(ctx, width, canvasHeight, freqData, metrics, isPlaying, accentColor, phase);
      } else if (mode === 'ethereal-particles') {
        renderEtherealParticles(ctx, width, canvasHeight, freqData, metrics, isPlaying, accentColor, phase);
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
  }, [mode, height, accentColor, playbackRatio]);

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

// Spectral Waveform Bar Renderer (Matches Image 1 reference)
function renderSpectralBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  isPlaying: boolean,
  accentColor: string,
  playbackRatio: number,
  phase: number
) {
  const barCount = Math.min(140, Math.floor(width / 4));
  const barSpacing = width / barCount;
  const barWidth = Math.max(1, barSpacing * 0.45);

  const playedIndex = Math.floor(barCount * playbackRatio);

  for (let i = 0; i < barCount; i++) {
    const dataIdx = Math.floor((i / barCount) * (freqData.length * 0.75));
    const rawVal = freqData[dataIdx] || 0;
    
    let norm = isPlaying ? rawVal / 255 : 0.08;
    // Add subtle organic undulating variance
    norm = Math.max(0.06, norm + Math.sin(phase + i * 0.12) * (isPlaying ? 0.12 : 0.03));

    const barHeight = Math.max(3, norm * (height * 0.92));
    const x = i * barSpacing + (barSpacing - barWidth) / 2;
    const y = height - barHeight;

    const isPast = i <= playedIndex;

    ctx.fillStyle = isPast
      ? accentColor
      : 'rgba(17, 18, 15, 0.28)';

    ctx.fillRect(x, y, barWidth, barHeight);

    // Subtle golden peak dot on past bars when energy is high
    if (isPast && norm > 0.65) {
      ctx.fillStyle = '#EDE686';
      ctx.fillRect(x, y - 2, barWidth, 1.5);
    }
  }
}

// Fine Frequency Lines Renderer (Editorial harmonic waves)
function renderFineFrequencies(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeData: Uint8Array,
  freqData: Uint8Array,
  isPlaying: boolean,
  accentColor: string,
  phase: number
) {
  const midY = height / 2;
  const layers = 3;

  for (let layer = 0; layer < layers; layer++) {
    ctx.beginPath();
    ctx.lineWidth = layer === 0 ? 1.5 : 0.8;
    ctx.strokeStyle = layer === 0
      ? accentColor
      : `rgba(100, 102, 49, ${0.4 - layer * 0.12})`;

    const step = width / 64;
    for (let x = 0; x <= width; x += step) {
      const idx = Math.floor((x / width) * (timeData.length - 1));
      const timeVal = isPlaying ? (timeData[idx] - 128) / 128 : 0;
      const freqVal = isPlaying ? freqData[idx] / 255 : 0.1;

      const wave = Math.sin(phase * (1 + layer * 0.3) + x * 0.02) * (height * 0.25 * (freqVal + 0.2));
      const y = midY + wave + timeVal * (height * 0.3);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

// Organic Breathing Ring (For album hero & modal spotlights)
function renderOrganicRing(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  metrics: { bass: number; energy: number },
  isPlaying: boolean,
  accentColor: string,
  phase: number
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) * 0.65;

  ctx.save();
  ctx.translate(centerX, centerY);

  const points = 48;
  const angleStep = (Math.PI * 2) / points;

  // Outer reactive ring
  ctx.beginPath();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.2;

  for (let i = 0; i <= points; i++) {
    const angle = i * angleStep;
    const dataIdx = Math.floor((i / points) * (freqData.length * 0.5));
    const val = isPlaying ? freqData[dataIdx] / 255 : 0.08;
    
    const displacement = Math.sin(phase + i * 0.4) * 4 + val * (22 * (metrics.bass + 0.5));
    const r = baseRadius + displacement;

    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Subtle interior concentric geometric ring
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(17, 18, 15, 0.15)';
  ctx.lineWidth = 0.8;
  ctx.arc(0, 0, baseRadius * 0.5 + (isPlaying ? metrics.energy * 8 : 0), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Ethereal Particle Field (Fine architectural light dust)
function renderEtherealParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _freqData: Uint8Array,
  metrics: { bass: number; energy: number },
  isPlaying: boolean,
  accentColor: string,
  phase: number
) {
  const count = 36;
  const speed = isPlaying ? 0.8 + metrics.energy * 1.5 : 0.3;

  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const x = (Math.sin(seed + phase * 0.2 * speed) * 0.5 + 0.5) * width;
    const y = (Math.cos(seed * 0.8 + phase * 0.15 * speed) * 0.5 + 0.5) * height;
    const size = ((i % 3) + 1) * (isPlaying ? 1 + metrics.bass * 0.8 : 1);
    const alpha = (Math.sin(phase + i) * 0.3 + 0.5) * (isPlaying ? 0.7 : 0.25);

    ctx.fillStyle = i % 4 === 0 ? '#EDE686' : accentColor;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}
