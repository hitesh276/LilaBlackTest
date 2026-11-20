"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DataIndex,
  FilterState,
  LayerState,
  HeatmapMode,
  MapDayData,
  PlayerJourney,
  MatchSummary,
} from "@/lib/types";
import { loadIndex, loadMapDayData } from "@/lib/dataLoader";
import FilterPanel from "@/components/FilterPanel";
import LayerControls from "@/components/LayerControls";
import MapViewer from "@/components/MapViewer";
import Timeline from "@/components/Timeline";
import Legend from "@/components/Legend";
import StatsPanel from "@/components/StatsPanel";

export default function Home() {
  // ─── Data state ───
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [mapDayData, setMapDayData] = useState<MapDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filter state ───
  const [filters, setFilters] = useState<FilterState>({
    selectedMap: "AmbroseValley",
    selectedDate: "February_10",
    selectedMatch: null,
  });

  // ─── Layer visibility ───
  const [layers, setLayers] = useState<LayerState>({
    showHumanTrails: true,
    showBotTrails: false,
    showKills: true,
    showDeaths: true,
    showLoot: false,
    showStorm: true,
    heatmapMode: "off",
  });

  // ─── Playback state ───
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  // ─── Load index on mount ───
  useEffect(() => {
    loadIndex()
      .then((idx) => {
        setIndex(idx);
        // Set initial filters to first available map/date
        if (idx.maps.length > 0 && idx.dates.length > 0) {
          setFilters((prev) => ({
            ...prev,
            selectedMap: idx.maps[0],
            selectedDate: idx.dates[0],
          }));
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(`Failed to load data: ${e.message}`);
        setLoading(false);
      });
  }, []);

  // ─── Load map+day data when filters change ───
  useEffect(() => {
    if (!filters.selectedMap || !filters.selectedDate) return;
    setLoading(true);
    loadMapDayData(filters.selectedMap, filters.selectedDate)
      .then((data) => {
        setMapDayData(data);
        setCurrentTime(0);
        setIsPlaying(false);
        setLoading(false);
      })
      .catch(() => {
        setMapDayData({ matches: {} });
        setLoading(false);
      });
  }, [filters.selectedMap, filters.selectedDate]);

  // ─── Filtered match summaries for current map+date ───
  const filteredSummaries = useMemo(() => {
    if (!index) return [];
    return index.matchSummaries.filter(
      (s) => s.map === filters.selectedMap && s.date === filters.selectedDate
    );
  }, [index, filters.selectedMap, filters.selectedDate]);

  // ─── Current match players ───
  const currentPlayers = useMemo((): PlayerJourney[] => {
    if (!mapDayData) return [];

    if (filters.selectedMatch) {
      return mapDayData.matches[filters.selectedMatch] || [];
    }

    // If no match selected, combine all matches for aggregate view
    const all: PlayerJourney[] = [];
    for (const players of Object.values(mapDayData.matches)) {
      all.push(...players);
    }
    return all;
  }, [mapDayData, filters.selectedMatch]);

  // ─── Max time for playback ───
  const maxTime = useMemo(() => {
    if (filters.selectedMatch && mapDayData?.matches[filters.selectedMatch]) {
      const players = mapDayData.matches[filters.selectedMatch];
      let max = 0;
      for (const p of players) {
        for (const pos of p.positions) {
          if (pos[2] > max) max = pos[2];
        }
        for (const ev of p.events) {
          if (ev.ts > max) max = ev.ts;
        }
      }
      return max;
    }
    return 0;
  }, [filters.selectedMatch, mapDayData]);

  // ─── Current match summary stats ───
  const currentStats = useMemo((): MatchSummary | null => {
    if (!filters.selectedMatch || !index) return null;
    return (
      index.matchSummaries.find((s) => s.matchId === filters.selectedMatch) ??
      null
    );
  }, [filters.selectedMatch, index]);

  // ─── Handlers ───
  const handleFilterChange = useCallback((f: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...f }));
  }, []);

  const handleLayerChange = useCallback((l: Partial<LayerState>) => {
    setLayers((prev) => ({ ...prev, ...l }));
  }, []);

  // ─── Loading / Error states ───
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-lila-bg">
        <div className="text-center p-8 bg-lila-panel rounded-lg border border-red-500/30">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-lila-bg overflow-hidden">
      {/* ── Top Bar: Filters ── */}
      <header className="flex-shrink-0 border-b border-lila-border bg-lila-panel">
        <div className="flex items-center gap-4 px-4 py-2">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-2 h-2 rounded-full bg-lila-accent animate-pulse" />
            <h1 className="text-sm font-bold tracking-wider uppercase text-slate-300">
              LILA BLACK
            </h1>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Player Journey Visualizer
            </span>
          </div>

          {index && (
            <FilterPanel
              index={index}
              filters={filters}
              matchSummaries={filteredSummaries}
              onChange={handleFilterChange}
            />
          )}
        </div>
      </header>

      {/* ── Main Content: Map + Controls ── */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-lila-bg/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-lila-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading data...</p>
            </div>
          </div>
        )}

        {/* Map Canvas — takes full remaining space */}
        <div className="flex-1 relative">
          <MapViewer
            mapId={filters.selectedMap}
            players={currentPlayers}
            layers={layers}
            currentTime={currentTime}
            maxTime={maxTime}
            isMatchView={!!filters.selectedMatch}
          />

          {/* Layer controls — floating bottom-left */}
          <div className="absolute bottom-14 left-4 z-10">
            <LayerControls layers={layers} onChange={handleLayerChange} />
          </div>

          {/* Legend — floating top-right */}
          <div className="absolute top-4 right-4 z-10">
            <Legend layers={layers} />
          </div>

          {/* Stats panel — floating top-left */}
          {currentStats && (
            <div className="absolute top-4 left-4 z-10">
              <StatsPanel stats={currentStats} />
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom Bar: Timeline ── */}
      {filters.selectedMatch && maxTime > 0 && (
        <footer className="flex-shrink-0 border-t border-lila-border bg-lila-panel">
          <Timeline
            currentTime={currentTime}
            maxTime={maxTime}
            isPlaying={isPlaying}
            speed={speed}
            onTimeChange={setCurrentTime}
            onPlayToggle={() => setIsPlaying((p) => !p)}
            onSpeedChange={setSpeed}
          />
        </footer>
      )}
    </div>
  );
}
