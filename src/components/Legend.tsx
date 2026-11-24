"use client";

import { LayerState } from "@/lib/types";

interface LegendProps {
  layers: LayerState;
}

export default function Legend({ layers }: LegendProps) {
  const showAnyKills =
    layers.showKills &&
    (layers.showHumanKills !== false ||
      layers.showBotKills !== false ||
      layers.showSharedKills !== false);

  const items: {
    label: string;
    color: string;
    type: "line" | "marker" | "ring" | "box" | "dual-ring";
    dashed?: boolean;
    visible: boolean;
  }[] = [
    {
      label: "Human Trail",
      color: "#22d3ee",
      type: "line",
      visible: layers.showHumanTrails,
    },
    {
      label: "Bot Trail (Dashed)",
      color: "#f1f5f9",
      type: "line",
      dashed: true,
      visible: layers.showBotTrails,
    },
    {
      label: "Human Kill",
      color: "#22d3ee",
      type: "marker",
      visible: showAnyKills && (layers.showHumanKills ?? true),
    },
    {
      label: "Bot Kill",
      color: "#ef4444",
      type: "marker",
      visible: showAnyKills && (layers.showBotKills ?? true),
    },
    {
      label: "Shared Kill / Assist",
      color: "#facc15",
      type: "dual-ring",
      visible: showAnyKills && (layers.showSharedKills ?? true),
    },
    {
      label: "Combat Death",
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
    {
      label: "Camping Spot (>15s)",
      color: "#f59e0b",
      type: "ring",
      visible: layers.showCampers,
    },
    {
      label: "POI Zone",
      color: "#6366f1",
      type: "box",
      visible: layers.showPOIZones,
    },
  ];

  const visibleItems = items.filter((i) => i.visible);
  if (visibleItems.length === 0 && layers.heatmapMode === "off") return null;

  return (
    <div className="bg-lila-panel/85 backdrop-blur-md border border-lila-border rounded-lg p-3 min-w-[155px] shadow-xl select-none">
      <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">
        Legend
      </h3>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {item.type === "line" ? (
              item.dashed ? (
                <div
                  className="w-5 h-0 border-b-2 border-dashed"
                  style={{ borderColor: item.color }}
                />
              ) : (
                <div
                  className="w-5 h-0.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )
            ) : item.type === "dual-ring" ? (
              <div className="w-3 h-3 rounded-full border border-amber-400 bg-amber-400/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
            ) : item.type === "ring" ? (
              <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-amber-400/20" />
            ) : item.type === "box" ? (
              <div className="w-3 h-2 rounded-sm border border-indigo-400 border-dashed bg-indigo-400/10" />
            ) : (
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-xs text-slate-300">{item.label}</span>
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
                  layers.heatmapMode === "kills"
                    ? "linear-gradient(to right, #991b1b, #ef4444, #f97316, #fef08a)"
                    : layers.heatmapMode === "deaths"
                    ? "linear-gradient(to right, #6b21a8, #d946ef, #f43f5e, #ffedd5)"
                    : layers.heatmapMode === "loot"
                    ? "linear-gradient(to right, #15803d, #22c55e, #eab308, #fef9c3)"
                    : "linear-gradient(to right, #1e40af, #06b6d4, #22c55e, #eab308, #ef4444)",
              }}
            />
            <span className="text-xs text-slate-300 capitalize font-medium">
              {layers.heatmapMode} Heat
            </span>
          </div>
        </>
      )}
    </div>
  );
}
