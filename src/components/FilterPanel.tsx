"use client";

import { useMemo } from "react";
import { DataIndex, FilterState, MatchSummary } from "@/lib/types";
import { MAP_CONFIGS, FEATURED_MATCHES } from "@/lib/mapConfig";

interface FilterPanelProps {
  index: DataIndex;
  filters: FilterState;
  matchSummaries: MatchSummary[];
  onChange: (f: Partial<FilterState>) => void;
}

export default function FilterPanel({
  index,
  filters,
  matchSummaries,
  onChange,
}: FilterPanelProps) {
  const selectClass =
    "bg-lila-bg border border-lila-border rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-lila-accent transition-colors cursor-pointer hover:border-slate-500";

  const featuredMatchId = FEATURED_MATCHES[filters.selectedMap];

  // Sort match summaries: featured match first, then by total players + kills descending
  const sortedMatches = useMemo(() => {
    return [...matchSummaries].sort((a, b) => {
      if (a.matchId === featuredMatchId) return -1;
      if (b.matchId === featuredMatchId) return 1;
      const scoreA = (a.humanCount + a.botCount) * 10 + a.kills;
      const scoreB = (b.humanCount + b.botCount) * 10 + b.kills;
      return scoreB - scoreA;
    });
  }, [matchSummaries, featuredMatchId]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Map selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500 uppercase tracking-wide">
          Map
        </label>
        <select
          className={selectClass}
          value={filters.selectedMap}
          onChange={(e) => {
            const newMap = e.target.value;
            const feat = FEATURED_MATCHES[newMap] || null;
            onChange({ selectedMap: newMap, selectedMatch: feat });
          }}
        >
          {index.maps.map((m) => (
            <option key={m} value={m}>
              {MAP_CONFIGS[m]?.name || m}
            </option>
          ))}
        </select>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500 uppercase tracking-wide">
          Date
        </label>
        <select
          className={selectClass}
          value={filters.selectedDate}
          onChange={(e) =>
            onChange({ selectedDate: e.target.value })
          }
        >
          {index.dates.map((d) => (
            <option key={d} value={d}>
              {d.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Match selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500 uppercase tracking-wide">
          Match
        </label>
        <select
          className={selectClass + " min-w-[240px]"}
          value={filters.selectedMatch || "__all__"}
          onChange={(e) =>
            onChange({
              selectedMatch: e.target.value === "__all__" ? null : e.target.value,
            })
          }
        >
          <option value="__all__">
            🌐 All Matches ({matchSummaries.length} matches)
          </option>
          {sortedMatches.map((s) => {
            const isFeatured = s.matchId === featuredMatchId;
            const totalPlayers = s.humanCount + s.botCount;
            const prefix = isFeatured ? "⭐ Featured: " : "";
            return (
              <option key={s.matchId} value={s.matchId}>
                {prefix}
                {s.matchId.substring(0, 8)}… ({totalPlayers}P: {s.humanCount}H/{s.botCount}B • {s.kills}K)
              </option>
            );
          })}
        </select>
      </div>

      {/* Quick info */}
      <div className="text-xs text-slate-500 ml-2 hidden lg:flex items-center gap-2">
        <span>{matchSummaries.length} matches</span>
        <span>•</span>
        <span className="text-cyan-400 font-medium">
          {matchSummaries.reduce((a, s) => a + s.humanCount, 0)} humans
        </span>
        <span>•</span>
        <span className="text-slate-300 font-medium">
          {matchSummaries.reduce((a, s) => a + s.botCount, 0)} bots
        </span>
      </div>
    </div>
  );
}
