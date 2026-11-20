"use client";

import { DataIndex, FilterState, MatchSummary } from "@/lib/types";
import { MAP_CONFIGS } from "@/lib/mapConfig";

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
          onChange={(e) =>
            onChange({ selectedMap: e.target.value, selectedMatch: null })
          }
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
            onChange({ selectedDate: e.target.value, selectedMatch: null })
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
          className={selectClass + " min-w-[180px]"}
          value={filters.selectedMatch || "__all__"}
          onChange={(e) =>
            onChange({
              selectedMatch: e.target.value === "__all__" ? null : e.target.value,
            })
          }
        >
          <option value="__all__">
            All Matches ({matchSummaries.length})
          </option>
          {matchSummaries.map((s) => (
            <option key={s.matchId} value={s.matchId}>
              {s.matchId.substring(0, 8)}… ({s.humanCount}H / {s.botCount}B)
            </option>
          ))}
        </select>
      </div>

      {/* Quick info */}
      <div className="text-xs text-slate-600 ml-2 hidden md:block">
        {matchSummaries.length} matches •{" "}
        {matchSummaries.reduce((a, s) => a + s.humanCount, 0)} humans •{" "}
        {matchSummaries.reduce((a, s) => a + s.botCount, 0)} bots
      </div>
    </div>
  );
}
