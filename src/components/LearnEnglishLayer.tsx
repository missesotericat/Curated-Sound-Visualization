import React from 'react';
import { LyricLearningItem } from '../types';
import { X, Volume2, Sparkles, BookOpen, Quote } from 'lucide-react';

interface LearnEnglishLayerProps {
  item: LyricLearningItem | null;
  onClose: () => void;
}

export const LearnEnglishLayer: React.FC<LearnEnglishLayerProps> = ({ item, onClose }) => {
  if (!item) return null;

  const playPronunciation = () => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(item.phrase);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] border hairline-border max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 border border-transparent hover:border-white/20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Eyebrow */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-sans-clean text-[var(--accent-primary)] font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>LINGUISTIC ANNOTATION / LEARN ENGLISH</span>
        </div>

        {/* Phrase & Pronunciation */}
        <div className="border-b hairline-border pb-4 mb-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="font-heading-jost text-2xl md:text-3xl text-[var(--text-primary)] font-medium">
              {item.phrase}
            </h3>
            {item.phonetic && (
              <button
                onClick={playPronunciation}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-primary)] bg-[var(--accent-primary)]/20 px-2.5 py-1 border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/40 transition-colors cursor-pointer"
                title="Listen to pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="font-mono">{item.phonetic}</span>
              </button>
            )}
          </div>
          {item.partOfSpeech && (
            <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)] mt-1 font-sans-clean">
              {item.partOfSpeech}
            </p>
          )}
        </div>

        {/* Definition & Meaning */}
        <div className="space-y-4 font-sans-clean">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold block mb-1">
              Editorial Definition & Context
            </span>
            <p className="text-[15px] leading-relaxed text-[var(--text-primary)]">
              {item.meaning}
            </p>
          </div>

          {/* Contextual Nuance / Note */}
          {item.note && (
            <div className="bg-[var(--bg-chip)] p-3.5 border-l-2 border-[var(--accent-primary)]">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold mb-1">
                <Quote className="w-3 h-3" />
                <span>Philosophical / Musical Context</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                {item.note}
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t hairline-border flex justify-between items-center text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
          <span>AI MUSIC DIALECTICS</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            RETURN TO SONG
          </button>
        </div>
      </div>
    </div>
  );
};
