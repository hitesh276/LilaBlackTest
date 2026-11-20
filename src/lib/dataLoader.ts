import { DataIndex, MapDayData } from "./types";

/** Cache loaded data to avoid re-fetching */
const dataCache = new Map<string, MapDayData>();
let indexCache: DataIndex | null = null;

/**
 * Load the global data index (match summaries, available maps/dates).
 * Fetched once and cached.
 */
export async function loadIndex(): Promise<DataIndex> {
  if (indexCache) return indexCache;

  const res = await fetch("/data/index.json");
  if (!res.ok) throw new Error(`Failed to load data index: ${res.status}`);

  indexCache = await res.json();
  return indexCache!;
}

/**
 * Load event data for a specific map + date combination.
 * Files are lazy-loaded and cached.
 */
export async function loadMapDayData(
  map: string,
  date: string
): Promise<MapDayData> {
  const key = `${map}_${date}`;

  if (dataCache.has(key)) {
    return dataCache.get(key)!;
  }

  const res = await fetch(`/data/events/${key}.json`);
  if (!res.ok) {
    // Return empty data if file doesn't exist (some map+date combos may have no data)
    return { matches: {} };
  }

  const data: MapDayData = await res.json();
  dataCache.set(key, data);
  return data;
}

/**
 * Clear cached data (e.g., when switching context significantly).
 */
export function clearCache(): void {
  dataCache.clear();
}
