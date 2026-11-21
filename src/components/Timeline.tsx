"use client";

import { useEffect, useRef, useCallback } from "react";
import { EventBookmark } from "@/lib/types";

interface TimelineProps {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  speed: number;
  events?: EventBookmark[];
  onTimeChange: (t: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (s: number) => void;
  onEventJump?: (event: EventBookmark) => void;
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
  events = [],
  onTimeChange,
  onPlayToggle,
  onSpeedChange,
  onEventJump,
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

  const jumpNextEvent = () => {
    if (!events || events.length === 0) return;
    const next = events.find((e) => e.ts > currentTime + 0.8);
    if (next) {
      onTimeChange(Math.max(0, next.ts - 2.5));
      onEventJump?.(next);
    } else {
      // Loop to first event
      onTimeChange(Math.max(0, events[0].ts - 2.5));
      onEventJump?.(events[0]);
    }
  };

  const jumpPrevEvent = () => {
    if (!events || events.length === 0) return;
    const prev = [...events].reverse().find((e) => e.ts < currentTime - 1.0);
    if (prev) {
      onTimeChange(Math.max(0, prev.ts - 2.5));
      onEventJump?.(prev);
    }
  };

  const progress = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

  return (
    <div className="px-4 py-2 flex items-center gap-3 select-none">
      {/* Prev Event Jump Button */}
      {events.length > 0 && (
        <button
          onClick={jumpPrevEvent}
          title="Jump to Previous Combat / Event"
          className="w-7 h-7 flex items-center justify-center rounded bg-lila-border/60 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
        >
          ⏮
        </button>
      )}

      {/* Play/Pause button */}
      <button
        onClick={handlePlayClick}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-lila-accent hover:bg-lila-accent/80 transition-colors text-white shadow-lg shadow-indigo-500/20"
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

      {/* Next Event Jump Button */}
      {events.length > 0 && (
        <button
          onClick={jumpNextEvent}
          title="Jump to Next Combat / Event"
          className="w-7 h-7 flex items-center justify-center rounded bg-lila-border/60 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
        >
          ⏭
        </button>
      )}

      {/* Current time */}
      <span className="text-xs text-slate-300 font-mono w-12 text-right font-medium">
        {formatTime(currentTime)}
      </span>

      {/* Progress slider track with Event Bookmark Pins */}
      <div className="flex-1 relative h-6 flex items-center group">
        <div className="absolute inset-x-0 h-1.5 bg-lila-border rounded-full overflow-hidden">
          <div
            className="h-full bg-lila-accent rounded-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Event Bookmark Pins */}
        {events.map((ev, idx) => {
          const leftPct = maxTime > 0 ? (ev.ts / maxTime) * 100 : 0;
          const isKill = ev.type === "Kill" || ev.type === "BotKill";
          const isDeath = ev.type === "Killed" || ev.type === "BotKilled";
          const isStorm = ev.type === "KilledByStorm";

          const color = isKill
            ? "#ef4444"
            : isDeath
            ? "#f97316"
            : isStorm
            ? "#a855f7"
            : "#eab308";

          const icon = isKill ? "⚔️" : isDeath ? "💀" : isStorm ? "⚡" : "📦";

          return (
            <button
              key={`${ev.type}_${ev.ts}_${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                onTimeChange(Math.max(0, ev.ts - 2.5));
                onEventJump?.(ev);
              }}
              title={`[${formatTime(ev.ts)}] ${ev.type} (${ev.isHuman ? "Human" : "Bot"})`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:scale-150 transition-transform z-10 group/pin"
              style={{ left: `${leftPct}%` }}
            >
              <span
                className="w-1.5 h-3 rounded-full shadow-md"
                style={{ backgroundColor: color }}
              />
              {/* Tooltip on pin hover */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover/pin:flex flex-col items-center pointer-events-none z-30 whitespace-nowrap bg-black/95 text-white text-[10px] px-2 py-0.5 rounded border border-white/20 shadow-xl">
                <span>
                  {icon} {ev.type} at {formatTime(ev.ts)}
                </span>
                <span className="text-slate-400 text-[9px]">
                  {ev.isHuman ? "Human" : "Bot"}
                </span>
              </div>
            </button>
          );
        })}

        <input
          type="range"
          min="0"
          max={maxTime}
          step="0.1"
          value={currentTime}
          onChange={handleSliderChange}
          className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer z-20"
        />

        {/* Thumb indicator */}
        <div
          className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 ring-2 ring-indigo-500/50"
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
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              speed === s
                ? "bg-lila-accent text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
