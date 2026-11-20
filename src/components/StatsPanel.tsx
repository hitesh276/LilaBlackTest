"use client";

import { MatchSummary } from "@/lib/types";

interface StatsPanelProps {
  stats: MatchSummary;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="bg-lila-panel/80 backdrop-blur-md border border-lila-border rounded-lg p-3 min-w-[160px]">
      <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
        Match Info
      </h3>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">ID</span>
          <span className="text-slate-300 font-mono">
            {stats.matchId.substring(0, 8)}…
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Humans</span>
          <span className="text-lila-human font-medium">{stats.humanCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Bots</span>
          <span className="text-lila-bot font-medium">{stats.botCount}</span>
        </div>
        <div className="border-t border-lila-border my-1" />
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Kills</span>
          <span className="text-lila-kill font-medium">{stats.kills}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Deaths</span>
          <span className="text-lila-death font-medium">{stats.deaths}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Loots</span>
          <span className="text-lila-loot font-medium">{stats.loots}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Storm ☠</span>
          <span className="text-lila-storm font-medium">{stats.stormDeaths}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Duration</span>
          <span className="text-slate-300">
            {Math.floor(stats.durationSeconds / 60)}m{" "}
            {Math.floor(stats.durationSeconds % 60)}s
          </span>
        </div>
      </div>
    </div>
  );
}
