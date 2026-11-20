"use client";

import { LayerState } from "@/lib/types";

interface LegendProps {
  layers: LayerState;
}

export default function Legend({ layers }: LegendProps) {
  const items: { label: string; color: string; type: "line" | "marker"; visible: boolean }[] = [
    {
      label: "Human Trail",
      color: "#22d3ee",
      type: "line",
      visible: layers.showHumanTrails,
    },
    {
      label: "Bot Trail",
      color: "#6b7280",
      type: "line",
      visible: layers.showBotTrails,
    },
    {
      label: "Player Kill",
      color: "#ef4444",
      type: "marker",
      visible: layers.showKills,
    },
    {
      label: "Player Death",
      color: "#f97316",
      type: "marker",
      visible: layers.showDeaths,
    },
    {
      label: "Loot Pickup",
      color: "#eab308",
      type: "marker",
      visible: layers.showLoot,
    },
    {
      label: "Storm Death",
      color: "#a855f7",
      type: "marker",
      visible: layers.showStorm,
    },
  ];

  const visibleItems = items.filter((i) => i.visible);
  if (visibleItems.length === 0) return null;

  return (
    <div className="bg-lila-panel/80 backdrop-blur-md border border-lila-border rounded-lg p-3 min-w-[140px]">
      <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
        Legend
      </h3>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {item.type === "line" ? (
              <div
                className="w-5 h-0.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            ) : (
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {layers.heatmapMode !== "off" && (
        <>
          <div className="border-t border-lila-border my-2" />
          <div className="flex items-center gap-2">
            <div
              className="w-16 h-2 rounded-sm"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,255,0.4), rgba(0,255,255,0.5), rgba(0,255,0,0.6), rgba(255,255,0,0.7), rgba(255,0,0,0.8))",
              }}
            />
            <span className="text-xs text-slate-400">
              {layers.heatmapMode} density
            </span>
          </div>
        </>
      )}
    </div>
  );
}
