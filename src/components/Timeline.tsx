"use client";

import { useEffect, useRef, useCallback } from "react";

interface TimelineProps {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  speed: number;
  onTimeChange: (t: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (s: number) => void;
}

const SPEED_OPTIONS = [1, 2, 4, 8, 16];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function Timeline({
  currentTime,
  maxTime,
  isPlaying,
  speed,
  onTimeChange,
  onPlayToggle,
  onSpeedChange,
}: TimelineProps) {
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Animation loop for playback (using ref for smooth 60fps without hook churn)
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastFrameRef.current) / 1000; // seconds
      lastFrameRef.current = now;

      const nextTime = Math.min(currentTimeRef.current + delta * speed, maxTime);
      onTimeChange(nextTime);

      if (nextTime >= maxTime) {
        onPlayToggle(); // auto-pause at end
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, maxTime, onTimeChange, onPlayToggle]);

  const handlePlayClick = () => {
    if (!isPlaying && currentTime >= maxTime) {
      onTimeChange(0);
    }
    onPlayToggle();
  };

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTimeChange(parseFloat(e.target.value));
    },
    [onTimeChange]
  );

  const progress = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

  return (
    <div className="px-4 py-2 flex items-center gap-3">
      {/* Play/Pause button */}
      <button
        onClick={handlePlayClick}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-lila-accent hover:bg-lila-accent/80 transition-colors text-white"
      >
        {isPlaying ? (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <rect x="1" y="1" width="3" height="12" rx="1" />
            <rect x="8" y="1" width="3" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <path d="M1 1l10 6-10 6V1z" />
          </svg>
        )}
      </button>

      {/* Current time */}
      <span className="text-xs text-slate-400 font-mono w-12 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Progress slider */}
      <div className="flex-1 relative h-6 flex items-center group">
        <div className="absolute inset-x-0 h-1 bg-lila-border rounded-full overflow-hidden">
          <div
            className="h-full bg-lila-accent rounded-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min="0"
          max={maxTime}
          step="0.1"
          value={currentTime}
          onChange={handleSliderChange}
          className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer"
        />
        {/* Thumb indicator */}
        <div
          className="absolute w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Max time */}
      <span className="text-xs text-slate-400 font-mono w-12">
        {formatTime(maxTime)}
      </span>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-2">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 rounded text-xs transition-all ${
              speed === s
                ? "bg-lila-accent text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
