// ===== Map Configuration =====

export interface MapConfig {
  name: string;
  scale: number;
  originX: number;
  originZ: number;
  minimapImage: string;
}

// ===== Data Index (loaded once at startup) =====

export interface MatchSummary {
  matchId: string;
  map: string;
  date: string;
  humanCount: number;
  botCount: number;
  totalEvents: number;
  kills: number;
  deaths: number;
  loots: number;
  stormDeaths: number;
  durationSeconds: number;
}

export interface DataIndex {
  maps: string[];
  dates: string[];
  matchSummaries: MatchSummary[];
}

// ===== Match Event Data (loaded per map+date) =====

/** Position as [pixelX, pixelY, timeOffsetSeconds] */
export type PositionTuple = [number, number, number];

export interface PlayerEvent {
  type: EventType;
  x: number;  // pixel X on 1024x1024 minimap
  y: number;  // pixel Y on 1024x1024 minimap
  ts: number; // seconds from match start
}

export interface PlayerJourney {
  userId: string;
  isHuman: boolean;
  positions: PositionTuple[];
  events: PlayerEvent[];
}

export interface MatchData {
  [matchId: string]: PlayerJourney[];
}

export interface MapDayData {
  matches: MatchData;
}

// ===== Event Types =====

export type EventType =
  | "Kill"
  | "Killed"
  | "BotKill"
  | "BotKilled"
  | "KilledByStorm"
  | "Loot";

// ===== Filter State =====

export interface FilterState {
  selectedMap: string;
  selectedDate: string;
  selectedMatch: string | null; // null = show all matches (aggregate view)
}

// ===== Layer Visibility =====

export interface LayerState {
  showHumanTrails: boolean;
  showBotTrails: boolean;
  showKills: boolean;
  showDeaths: boolean;
  showLoot: boolean;
  showStorm: boolean;
  showPOIZones: boolean;
  showCampers: boolean;
  heatmapMode: HeatmapMode;
}

export type HeatmapMode = "off" | "traffic" | "kills" | "deaths" | "loot";

// ===== Playback State =====

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;  // seconds from match start
  maxTime: number;      // match duration in seconds
  speed: number;        // playback speed multiplier
}

// ===== POI Zone Analytics =====

export interface POIZone {
  id: string;
  name: string;
  bounds: [number, number, number, number]; // [minX, minY, maxX, maxY] in 1024x1024 space
  color: string;
  role: string;
}

export type ThreatLevel = "Hot Contested" | "Balanced" | "Safe Farming" | "Dead Zone";

export interface POISummary {
  id: string;
  name: string;
  role: string;
  color: string;
  trafficCount: number;
  trafficPercent: number;
  kills: number;
  deaths: number;
  loots: number;
  threatLevel: ThreatLevel;
}

// ===== Camping & Dwell Detection =====

export interface DwellCluster {
  x: number;
  y: number;
  duration: number; // in seconds
  userId: string;
  isHuman: boolean;
  startTime: number;
  endTime: number;
}

// ===== Event Bookmarks for Timeline =====

export interface EventBookmark {
  type: EventType;
  x: number;
  y: number;
  ts: number;
  userId: string;
  isHuman: boolean;
}
