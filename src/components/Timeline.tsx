"use client";

import { useEffect, useRef, useCallback } from "react";
import { EventBookmark } from "@/lib/types";

interface TimelineProps {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  speed: number;
  events?: EventBookmark[];
  selectedMatchId?: string | null;
  totalPlayersCount?: number;
  onTimeChange: (t: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (s: number) => void;
  onEventJump?: (event: EventBookmark) => void;
  onPickFeatured?: () => void;
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
  selectedMatchId = null,
  totalPlayersCount = 0,
  onTimeChange,
  onPlayToggle,
  onSpeedChange,
  onEventJump,
  onPickFeatured,
}: TimelineProps) {
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const animTimeRef = useRef<number>(currentTime);

  // Sync animTimeRef when currentTime prop changes while not playing (e.g. initial load or jump)
  useEffect(() => {
    if (!isPlaying) {
      animTimeRef.current = currentTime;
    }
  }, [currentTime, isPlaying]);

  // Keep latest callbacks and state in refs so the animation loop never restarts or tears down
  const onTimeChangeRef = useRef(onTimeChange);
  onTimeChangeRef.current = onTimeChange;

  const onPlayToggleRef = useRef(onPlayToggle);
  onPlayToggleRef.current = onPlayToggle;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const maxTimeRef = useRef(maxTime);
  maxTimeRef.current = maxTime;

  // Animation loop for smooth 60fps playback
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // If starting at or near the end, wrap to beginning
    if (animTimeRef.current >= maxTimeRef.current - 0.5) {
      animTimeRef.current = 0;
      onTimeChangeRef.current(0);
    }

    lastFrameRef.current = performance.now();

    const animate = (now: number) => {
      // Clamp delta to prevent erratic jumps on background tabs
      const delta = Math.min(0.1, Math.max(0.001, (now - lastFrameRef.current) / 1000));
      lastFrameRef.current = now;

      // Smoothly advance time accumulator
      const nextTime = Math.min(animTimeRef.current + delta * speedRef.current, maxTimeRef.current);
      animTimeRef.current = nextTime;

      // Notify parent to re-render map with new currentTime
      onTimeChangeRef.current(nextTime);

      if (nextTime >= maxTimeRef.current) {
        onPlayToggleRef.current(); // auto-pause at end
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  const handlePlayClick = () => {
    if (!isPlaying && animTimeRef.current >= maxTime - 0.5) {
      animTimeRef.current = 0;
      onTimeChange(0);
    }
    onPlayToggle();
  };

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      animTimeRef.current = val;
      onTimeChange(val);
    },
    [onTimeChange]
  );

  const combatEvents = events.filter(
    (e) => e.type.includes("Kill") || e.type.includes("Killed")
  );

  const jumpNextEvent = () => {
    const list = combatEvents.length > 0 ? combatEvents : events;
    if (list.length === 0) return;
    const next = list.find((e) => e.ts > animTimeRef.current + 0.8);
    const targetEvent = next || list[0];
    const targetTime = Math.max(0, targetEvent.ts - 2.0);
    animTimeRef.current = targetTime;
    onTimeChange(targetTime);
    onEventJump?.(targetEvent);
  };

  const jumpPrevEvent = () => {
    const list = combatEvents.length > 0 ? combatEvents : events;
    if (list.length === 0) return;
    const prev = [...list].reverse().find((e) => e.ts < animTimeRef.current - 1.0);
    const targetEvent = prev || list[list.length - 1];
    const targetTime = Math.max(0, targetEvent.ts - 2.0);
    animTimeRef.current = targetTime;
    onTimeChange(targetTime);
    onEventJump?.(targetEvent);
  };

  const progress = maxTime > 0 ? Math.min(100, Math.max(0, (currentTime / maxTime) * 100)) : 0;
  const killCount = events.filter((e) => e.type === "Kill" || e.type === "BotKill").length;
  const deathCount = events.filter((e) => e.type === "Killed" || e.type === "BotKilled" || e.type === "KilledByStorm").length;

  return (
    <div className="flex flex-col px-4 py-2 select-none bg-lila-panel border-t border-lila-border">
      {/* ── Status Header ── */}
      <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
        <div className="flex items-center gap-2">
          {selectedMatchId ? (
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Match Playback:</span>
              <span className="font-mono text-cyan-300 font-semibold">
                {selectedMatchId.substring(0, 8)}…
              </span>
              <span className="text-slate-500 font-normal">
                ({totalPlayersCount} Players • {killCount} Kills • {deathCount} Deaths)
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="font-medium text-slate-300">Macro View:</span>
              <span>All Matches Normalized across Match Time</span>
              {onPickFeatured && (
                <button
                  onClick={onPickFeatured}
                  className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black font-semibold text-[11px] transition-all flex items-center gap-1 shadow-sm"
                  title="Switch to curated action-packed featured match"
                >
                  <span>⭐</span>
                  <span>View Featured Match</span>
                </button>
              )}
            </span>
          )}
        </div>

        {/* Combat quick stats */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="text-red-400">⚔️</span> {killCount} Kills
          </span>
          <span className="flex items-center gap-1">
            <span className="text-orange-400">💀</span> {deathCount} Deaths
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-400 font-mono">
            {formatTime(currentTime)} / {formatTime(maxTime)}
          </span>
        </div>
      </div>

      {/* ── Scrubber & Controls Row ── */}
      <div className="flex items-center gap-3">
        {/* Prev Event Jump Button */}
        {events.length > 0 && (
          <button
            onClick={jumpPrevEvent}
            title="Jump to Previous Combat / Event"
            className="w-7 h-7 flex items-center justify-center rounded bg-lila-border/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs shrink-0"
          >
            ⏮
          </button>
        )}

        {/* Play/Pause button */}
        <button
          onClick={handlePlayClick}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-lila-accent hover:bg-lila-accent/80 transition-all text-white shadow-lg shadow-indigo-500/25 shrink-0 hover:scale-105 active:scale-95"
          title={isPlaying ? "Pause Playback" : "Start Playback"}
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
            className="w-7 h-7 flex items-center justify-center rounded bg-lila-border/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs shrink-0"
          >
            ⏭
          </button>
        )}

        {/* Current time */}
        <span className="text-xs text-slate-200 font-mono w-11 text-right font-semibold shrink-0">
          {formatTime(currentTime)}
        </span>

        {/* Progress slider track with Event Bookmark Pins */}
        <div className="flex-1 relative h-6 flex items-center group">
          <div className="absolute inset-x-0 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Event Bookmark Pins (z-30 with pointer-events-auto so clicks & hovers hit the pins directly) */}
          <div className="absolute inset-0 pointer-events-none z-30">
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
                    e.preventDefault();
                    e.stopPropagation();
                    const targetTime = Math.max(0, ev.ts - 2.0);
                    animTimeRef.current = targetTime;
                    onTimeChange(targetTime);
                    onEventJump?.(ev);
                  }}
                  title={`[${formatTime(ev.ts)}] ${ev.type} (${ev.isHuman ? "Human" : "Bot"})`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 flex items-center justify-center cursor-pointer pointer-events-auto hover:scale-150 transition-transform group/pin"
                  style={{ left: `${leftPct}%` }}
                >
                  <span
                    className="w-1.5 h-3.5 rounded-full shadow-md transition-all group-hover/pin:ring-2 group-hover/pin:ring-white pointer-events-none"
                    style={{ backgroundColor: color }}
                  />
                  {/* Tooltip on pin hover */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover/pin:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap bg-black/95 text-white text-[10px] px-2.5 py-1 rounded-md border border-white/20 shadow-2xl">
                    <span className="font-semibold text-slate-100">
                      {icon} {ev.type} at {formatTime(ev.ts)}
                    </span>
                    <span className="text-slate-400 text-[9px]">
                      {ev.isHuman ? "Human Player" : "Bot"}
                    </span>
                    <span className="text-cyan-400 text-[8px] font-mono mt-0.5">
                      Click to jump & locate fight
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

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
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none transform -translate-x-1/2 ring-2 ring-indigo-500/80 z-20 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Max time */}
        <span className="text-xs text-slate-400 font-mono w-11 shrink-0">
          {formatTime(maxTime)}
        </span>

        {/* Speed selector */}
        <div className="flex items-center gap-1 ml-1 shrink-0">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                speed === s
                  ? "bg-lila-accent text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
