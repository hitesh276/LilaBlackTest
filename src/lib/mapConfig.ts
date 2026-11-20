import { MapConfig } from "./types";

export const MAP_CONFIGS: Record<string, MapConfig> = {
  AmbroseValley: {
    name: "Ambrose Valley",
    scale: 900,
    originX: -370,
    originZ: -473,
    minimapImage: "/minimaps/AmbroseValley_Minimap.png",
  },
  GrandRift: {
    name: "Grand Rift",
    scale: 581,
    originX: -290,
    originZ: -290,
    minimapImage: "/minimaps/GrandRift_Minimap.png",
  },
  Lockdown: {
    name: "Lockdown",
    scale: 1000,
    originX: -500,
    originZ: -500,
    minimapImage: "/minimaps/Lockdown_Minimap.jpg",
  },
};

/** Image size in pixels (all minimaps are 1024x1024) */
export const MINIMAP_SIZE = 1024;

/**
 * Convert world coordinates (x, z) to minimap pixel coordinates.
 * Returns [pixelX, pixelY] in the 1024×1024 image space.
 */
export function worldToPixel(
  worldX: number,
  worldZ: number,
  mapId: string
): [number, number] {
  const cfg = MAP_CONFIGS[mapId];
  if (!cfg) return [0, 0];

  const u = (worldX - cfg.originX) / cfg.scale;
  const v = (worldZ - cfg.originZ) / cfg.scale;

  const pixelX = u * MINIMAP_SIZE;
  const pixelY = (1 - v) * MINIMAP_SIZE; // Y-flip: image origin is top-left

  return [Math.round(pixelX), Math.round(pixelY)];
}

/** Event type color mapping */
export const EVENT_COLORS: Record<string, string> = {
  Kill: "#ef4444",       // red
  Killed: "#f97316",     // orange
  BotKill: "#f87171",    // lighter red
  BotKilled: "#fb923c",  // lighter orange
  KilledByStorm: "#a855f7", // purple
  Loot: "#eab308",       // yellow/gold
};

/** Event type display labels */
export const EVENT_LABELS: Record<string, string> = {
  Kill: "Player Kill",
  Killed: "Player Death",
  BotKill: "Bot Kill",
  BotKilled: "Killed by Bot",
  KilledByStorm: "Storm Death",
  Loot: "Loot Pickup",
};
