import React, { useEffect, useRef, useState } from 'react';
import { prep } from './prepTheme';

const READ_SECONDS = 10;
const THINK_SECONDS = 10;

function FlipDigit({ value }) {
  const [animating, setAnimating] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setAnimating(true);
      prev.current = value;
      const t = setTimeout(() => setAnimating(false), 380);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div
      className={`relative h-12 w-11 sm:h-14 sm:w-12 rounded-lg ${prep.accent} text-white flex items-center justify-center overflow-hidden shadow-sm shadow-[#6B8FD6]/25 ${
        animating ? 'prep-digit-flip' : ''
      }`}
      aria-hidden
    >
      <span className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight">
        {String(value).padStart(2, '0')}
      </span>
    </div>
  );
}

function CuratingPulse() {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[#8FA8D4] prep-curate-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function ThinkTimer({ questionKey, onComplete, className = '' }) {
  const [phase, setPhase] = useState('reading');
  const [readLeft, setReadLeft] = useState(READ_SECONDS);
  const [thinkLeft, setThinkLeft] = useState(THINK_SECONDS);
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase('done');
    onComplete?.();
  };

  useEffect(() => {
    setPhase('reading');
    setReadLeft(READ_SECONDS);
    setThinkLeft(THINK_SECONDS);
    completedRef.current = false;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
    }
  }, [questionKey]);

  useEffect(() => {
    if (phase !== 'reading') return undefined;
    if (readLeft <= 0) {
      setPhase('thinking');
      return undefined;
    }
    const id = setInterval(() => setReadLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, readLeft]);

  useEffect(() => {
    if (phase !== 'thinking') return undefined;
    if (thinkLeft <= 0) {
      finish();
      return undefined;
    }
    const id = setInterval(() => setThinkLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, thinkLeft]);

  if (phase === 'done') {
    return (
      <div className={`flex items-center gap-2 text-sm ${prep.accentText} ${className}`}>
        <span className="inline-flex h-2 w-2 rounded-full bg-[#6B8FD6]" aria-hidden />
        Notes ready — open when you want to compare
      </div>
    );
  }

  if (phase === 'reading') {
    return (
      <div className={`rounded-lg border ${prep.border} ${prep.surface} px-4 py-3 ${className}`}>
        <p className={`text-sm font-medium ${prep.accentText} text-center`}>Take a moment to read the question</p>
        <CuratingPulse />
        <p className={`text-xs ${prep.accentTextMuted} text-center`}>Curating answer notes…</p>
        <p className={`text-[11px] ${prep.accentTextMuted} text-center mt-1.5`}>
          Think time starts in {readLeft}s
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${prep.border} bg-[#F0F4FA] px-4 py-3 ${className}`}>
      <p className={`text-sm font-medium ${prep.accentText} text-center mb-2`}>Think through your answer</p>
      <div className="flex flex-col items-center gap-1">
        <FlipDigit value={thinkLeft} />
        <span className={`text-[10px] font-medium ${prep.accentTextMuted} uppercase tracking-wide`}>seconds</span>
      </div>
      <p className={`text-[11px] ${prep.accentTextMuted} text-center mt-2`}>Notes unlock at 0</p>
    </div>
  );
}

export { READ_SECONDS, THINK_SECONDS };
