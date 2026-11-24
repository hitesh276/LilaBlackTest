"use client";

import { MatchSummary, CombatBreakdown } from "@/lib/types";

interface StatsPanelProps {
  stats: MatchSummary;
  combat?: CombatBreakdown | null;
}

export default function StatsPanel({ stats, combat }: StatsPanelProps) {
  return (
    <div className="bg-lila-panel/90 backdrop-blur-md border border-lila-border rounded-lg p-2.5 min-w-[180px] shadow-xl select-none">
      <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">
        Match Info
      </h3>
      <div className="space-y-0.5">
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
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Duration</span>
          <span className="text-slate-300">
            {Math.floor(stats.durationSeconds / 60)}m{" "}
            {Math.floor(stats.durationSeconds % 60)}s
          </span>
        </div>

        <div className="border-t border-lila-border my-1.5" />

        {/* Combat Overview */}
        <div className="flex justify-between items-baseline text-xs mb-1">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
            Combat Analytics
          </span>
        </div>

        {/* Kills Breakdown */}
        <div className="bg-black/20 rounded p-1 border border-white/5 space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <span>⚔️</span> Total Kills
            </span>
            <span className="text-lila-kill font-bold">{stats.kills}</span>
          </div>
          {combat && (
            <div className="pl-3.5 space-y-0.5 text-[11px] border-l border-white/10 ml-1">
              <div className="flex justify-between text-slate-400">
                <span>By Human</span>
                <span className="text-cyan-400 font-medium">
                  {combat.humanKills}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>By Bot</span>
                <span className="text-red-400 font-medium">
                  {combat.botKills}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <span>🤝</span> Shared / Assists
                </span>
                <span className="text-amber-400 font-medium">
                  {combat.sharedKills}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Deaths Breakdown */}
        <div className="bg-black/20 rounded p-1 border border-white/5 space-y-0.5 mt-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <span>💀</span> Total Deaths
            </span>
            <span className="text-lila-death font-bold">{stats.deaths}</span>
          </div>
          {combat && (
            <div className="pl-3.5 space-y-0.5 text-[11px] border-l border-white/10 ml-1">
              <div className="flex justify-between text-slate-400">
                <span>Killed by Human</span>
                <span className="text-cyan-400 font-medium">
                  {combat.killedByHuman}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Killed by Bot</span>
                <span className="text-orange-400 font-medium">
                  {combat.killedByBot}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Killed by Storm</span>
                <span className="text-purple-400 font-medium">
                  {combat.killedByStorm}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between text-xs pt-0.5">
          <span className="text-slate-500">Loot Items</span>
          <span className="text-lila-loot font-medium">{stats.loots}</span>
        </div>
      </div>
    </div>
  );
}
