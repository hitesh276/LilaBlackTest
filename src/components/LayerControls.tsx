"use client";

import { LayerState, HeatmapMode } from "@/lib/types";

interface LayerControlsProps {
  layers: LayerState;
  onChange: (l: Partial<LayerState>) => void;
  onTogglePOISidebar?: () => void;
  isPOISidebarOpen?: boolean;
}

const HEATMAP_OPTIONS: { value: HeatmapMode; label: string; icon: string }[] = [
  { value: "off", label: "Off", icon: "✕" },
  { value: "traffic", label: "Traffic", icon: "👣" },
  { value: "kills", label: "Kills", icon: "⚔️" },
  { value: "deaths", label: "Deaths", icon: "💀" },
  { value: "loot", label: "Loot", icon: "📦" },
];

export default function LayerControls({
  layers,
  onChange,
  onTogglePOISidebar,
  isPOISidebarOpen = false,
}: LayerControlsProps) {
  const toggleBtnClass = (active: boolean) =>
    `px-3 py-1.5 rounded text-xs font-medium transition-all ${
      active
        ? "bg-white/10 text-white border border-white/20 shadow-sm"
        : "bg-lila-bg/60 text-slate-500 border border-transparent hover:text-slate-300 hover:bg-white/5"
    }`;

  return (
    <div className="bg-lila-panel/90 backdrop-blur-md border border-lila-border rounded-lg p-3 space-y-2 select-none shadow-xl">
      {/* Trail toggles */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-14">
          Trails
        </span>
        <button
          className={toggleBtnClass(layers.showHumanTrails)}
          onClick={() => onChange({ showHumanTrails: !layers.showHumanTrails })}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-lila-human mr-1" />
          Human
        </button>
        <button
          className={toggleBtnClass(layers.showBotTrails)}
          onClick={() => onChange({ showBotTrails: !layers.showBotTrails })}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-slate-100 ring-1 ring-white/50 mr-1" />
          Bot (Dashed)
        </button>
      </div>

      {/* Event toggles */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-14">
          Events
        </span>
        <button
          className={toggleBtnClass(layers.showKills)}
          onClick={() => onChange({ showKills: !layers.showKills })}
        >
          <span className="text-lila-kill mr-1">⚔️</span> Kills
        </button>
        <button
          className={toggleBtnClass(layers.showDeaths)}
          onClick={() => onChange({ showDeaths: !layers.showDeaths })}
        >
          <span className="text-lila-death mr-1">💀</span> Deaths
        </button>
        <button
          className={toggleBtnClass(layers.showLoot)}
          onClick={() => onChange({ showLoot: !layers.showLoot })}
        >
          <span className="text-lila-loot mr-1">📦</span> Loot
        </button>
        <button
          className={toggleBtnClass(layers.showStorm)}
          onClick={() => onChange({ showStorm: !layers.showStorm })}
        >
          <span className="text-lila-storm mr-1">⚡</span> Storm
        </button>
      </div>

      {/* Heatmap mode */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-14">
          Heat
        </span>
        {HEATMAP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={toggleBtnClass(layers.heatmapMode === opt.value)}
            onClick={() => onChange({ heatmapMode: opt.value })}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Game Design Overlays: POIs & Camping */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-lila-border/50">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-14">
          Design
        </span>
        <button
          className={toggleBtnClass(layers.showPOIZones)}
          onClick={() => onChange({ showPOIZones: !layers.showPOIZones })}
          title="Toggle Named Point-of-Interest map zones"
        >
          🏷️ POI Zones
        </button>
        <button
          className={toggleBtnClass(layers.showCampers)}
          onClick={() => onChange({ showCampers: !layers.showCampers })}
          title="Highlight stationary camping spots (>15s dwell)"
        >
          ⛺ Campers
        </button>
        {onTogglePOISidebar && (
          <button
            onClick={onTogglePOISidebar}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ml-auto ${
              isPOISidebarOpen
                ? "bg-lila-accent text-white shadow-md shadow-indigo-500/20"
                : "bg-lila-bg text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="Open detailed POI metrics and threat classification"
          >
            📊 POI Stats
          </button>
        )}
      </div>
    </div>
  );
}
