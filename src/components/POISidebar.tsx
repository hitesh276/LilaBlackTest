"use client";

import { POISummary } from "@/lib/types";

interface POISidebarProps {
  isOpen: boolean;
  mapName: string;
  summaries: POISummary[];
  selectedPOIId: string | null;
  onSelectPOI: (poiId: string | null) => void;
  onClose: () => void;
}

export default function POISidebar({
  isOpen,
  mapName,
  summaries,
  selectedPOIId,
  onSelectPOI,
  onClose,
}: POISidebarProps) {
  if (!isOpen) return null;

  // Key stats
  const mostContested = [...summaries].sort(
    (a, b) => b.kills + b.deaths - (a.kills + a.deaths)
  )[0];
  const deadZones = summaries.filter((s) => s.threatLevel === "Dead Zone");
  const safestFarm = [...summaries].sort(
    (a, b) => b.loots / Math.max(1, b.deaths) - a.loots / Math.max(1, a.deaths)
  )[0];

  const getBadgeStyle = (threat: POISummary["threatLevel"]) => {
    switch (threat) {
      case "Hot Contested":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      case "Safe Farming":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "Dead Zone":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  const getThreatIcon = (threat: POISummary["threatLevel"]) => {
    switch (threat) {
      case "Hot Contested":
        return "🔥";
      case "Safe Farming":
        return "💎";
      case "Dead Zone":
        return "❄️";
      default:
        return "⚖️";
    }
  };

  return (
    <aside className="w-80 h-full bg-lila-panel/95 backdrop-blur-md border-l border-lila-border flex flex-col z-30 shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-3 border-b border-lila-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🏷️</span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              POI Analytics
            </h2>
            <p className="text-[10px] text-slate-500">{mapName} Zones</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Quick Insights Cards */}
      <div className="p-3 border-b border-lila-border grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-lila-bg/80 border border-lila-border rounded p-2">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">
            Most Contested
          </span>
          <span className="font-semibold text-red-400 truncate block mt-0.5">
            {mostContested ? mostContested.name : "N/A"}
          </span>
          <span className="text-[10px] text-slate-400">
            {mostContested ? `${mostContested.kills + mostContested.deaths} fights` : "-"}
          </span>
        </div>

        <div className="bg-lila-bg/80 border border-lila-border rounded p-2">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">
            Dead Zones
          </span>
          <span className="font-semibold text-cyan-400 truncate block mt-0.5">
            {deadZones.length} Zone{deadZones.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-slate-400">Under 3% traffic</span>
        </div>
      </div>

      {/* POI List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-1">
          Named Points of Interest ({summaries.length})
        </div>

        {summaries.map((poi) => {
          const isSelected = selectedPOIId === poi.id;
          return (
            <div
              key={poi.id}
              onClick={() => onSelectPOI(isSelected ? null : poi.id)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? "bg-lila-accent/20 border-lila-accent shadow-lg shadow-indigo-500/10"
                  : "bg-lila-bg/50 border-lila-border/70 hover:border-slate-500 hover:bg-lila-bg/80"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: poi.color }}
                  />
                  <h3 className="text-xs font-semibold text-slate-200 truncate">
                    {poi.name}
                  </h3>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 font-medium ${getBadgeStyle(
                    poi.threatLevel
                  )}`}
                >
                  {getThreatIcon(poi.threatLevel)} {poi.threatLevel}
                </span>
              </div>

              {/* Role description */}
              <p className="text-[10px] text-slate-400 mb-2 line-clamp-1">
                {poi.role}
              </p>

              {/* Traffic bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Traffic Share</span>
                  <span className="font-mono font-medium text-slate-300">
                    {poi.trafficPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-lila-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, poi.trafficPercent * 2)}%`,
                      backgroundColor: poi.color,
                    }}
                  />
                </div>
              </div>

              {/* Stats pill row */}
              <div className="flex items-center justify-between text-[10px] pt-2 border-t border-lila-border/40 mt-2">
                <span className="text-slate-400">
                  ⚔️ <strong className="text-lila-kill">{poi.kills}</strong> kills
                </span>
                <span className="text-slate-400">
                  💀 <strong className="text-lila-death">{poi.deaths}</strong> deaths
                </span>
                <span className="text-slate-400">
                  📦 <strong className="text-lila-loot">{poi.loots}</strong> loots
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
