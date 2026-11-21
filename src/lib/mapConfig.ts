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

/** Curated action-packed featured matches per map */
export const FEATURED_MATCHES: Record<string, string> = {
  AmbroseValley: "b971c686-07f6-4378-ad00-71b0b610414e", // 15 players (1H/14B), 26 kills, 12m 9s
  GrandRift: "7abc3541-fa03-45b8-975b-d754ff33acad",     // 5 players (1H/4B), 4 kills, 8m 38s
  Lockdown: "ead4c72d-0e3b-49b4-a91b-a9a21bed8012",      // 14 players (1H/13B), 19 kills, 11m 34s
};
