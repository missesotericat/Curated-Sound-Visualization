import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface SpotifyCtaProps {
  spotifyUrl?: string | null;
  variant?: 'top-nav' | 'featured-cover';
  trackTitle?: string;
  className?: string;
}

// Crisp, accurate vector glyph for Spotify
export const SpotifyIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308a.75.75 0 0 1-1.031.25c-2.822-1.724-6.374-2.114-10.558-1.158a.751.751 0 0 1-.336-1.464c4.582-1.047 8.528-.6 11.675 1.341.353.216.466.678.25 1.031zm1.47-3.264a.938.938 0 0 1-1.288.31c-3.23-1.986-8.156-2.56-11.977-1.4a.938.938 0 1 1-.544-1.794c4.372-1.326 9.805-.683 13.5 1.595.44.272.58.85.309 1.289zm.126-3.41c-3.873-2.3-10.264-2.512-13.974-1.385a1.125 1.125 0 1 1-.652-2.155c4.26-1.293 11.31-1.048 15.766 1.597a1.125 1.125 0 0 1-1.14 1.943z" />
  </svg>
);

export const SpotifyCta: React.FC<SpotifyCtaProps> = ({
  spotifyUrl,
  variant = 'top-nav',
  trackTitle,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isAvailable = Boolean(spotifyUrl && spotifyUrl.trim().length > 0);

  const handleMouseEnter = () => {
    if (!isAvailable) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isAvailable) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        setShowTooltip(false);
      }, 400);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isAvailable && spotifyUrl) {
      window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
    } else {
      e.preventDefault();
      setShowTooltip((prev) => !prev);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        setShowTooltip(false);
      }, 4000);
    }
  };

  // Close tooltip on click outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (variant === 'top-nav') {
    return (
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative inline-flex items-center ${className}`}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label={isAvailable ? 'Listen on Spotify' : 'Spotify (Coming Soon)'}
          className="group flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-widest font-sans-clean border hairline-border bg-[var(--bg-chip)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] transition-all duration-200 cursor-pointer select-none"
          title={isAvailable ? 'Listen on Spotify' : 'Spotify release pending'}
        >
          <SpotifyIcon className="w-3.5 h-3.5 text-[#1DB954] dark:text-[#1ED760] transition-transform duration-200 group-hover:scale-110" />
          <span className="hidden sm:inline font-mono font-medium">SPOTIFY</span>
          
          {isAvailable ? (
            <ArrowUpRight className="w-3 h-3 text-[var(--accent-primary)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          ) : (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] opacity-80"
              title="Coming Soon"
            />
          )}
        </button>

        {/* Coming Soon Popover Tooltip */}
        {showTooltip && (
          <div
            role="tooltip"
            className="absolute right-0 top-full mt-2 w-52 z-50 p-2.5 bg-[var(--bg-surface-elevated)] border hairline-border-accent shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--accent-primary)] font-bold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span>COMING SOON</span>
            </div>
            <p className="font-sans-clean text-[11px] text-[var(--text-primary)] leading-snug">
              {trackTitle
                ? `"${trackTitle}" will be available on Spotify soon.`
                : 'This track will be available on Spotify soon.'}
            </p>
            <span className="block mt-1 text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
              Spotify release pending
            </span>
          </div>
        )}
      </div>
    );
  }

  // variant === 'featured-cover'
  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center ${className}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={isAvailable ? 'Listen on Spotify' : 'Listen on Spotify (Coming Soon)'}
        className="group flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider font-sans-clean font-medium border hairline-border bg-[var(--bg-surface)] hover:bg-[var(--accent-primary)] hover:text-[#FFFFFF] dark:hover:text-[#10110E] hover:border-[var(--accent-primary)] text-[var(--text-primary)] transition-all duration-200 cursor-pointer shadow-sm"
      >
        <SpotifyIcon className="w-3.5 h-3.5 text-[#1DB954] dark:text-[#1ED760] transition-transform duration-200 group-hover:scale-110" />
        <span className="font-mono text-[10px] tracking-widest">LISTEN ON SPOTIFY</span>
        
        {isAvailable ? (
          <ArrowUpRight className="w-3 h-3 text-[var(--accent-primary)] group-hover:text-inherit transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        ) : (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] group-hover:bg-current" />
            <span className="text-[9px] font-mono text-[var(--text-muted)] group-hover:text-inherit tracking-widest">
              SOON
            </span>
          </span>
        )}
      </button>

      {/* Coming Soon Popover Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 z-50 p-2.5 bg-[var(--bg-surface-elevated)] border hairline-border-accent shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 duration-200 pointer-events-none text-center"
        >
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--accent-primary)] font-bold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span>COMING SOON</span>
          </div>
          <p className="font-sans-clean text-[11px] text-[var(--text-primary)] leading-snug">
            {trackTitle
              ? `"${trackTitle}" will be available on Spotify soon.`
              : 'This track will be available on Spotify soon.'}
          </p>
          <span className="block mt-1 text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            Spotify release pending
          </span>
        </div>
      )}
    </div>
  );
};
