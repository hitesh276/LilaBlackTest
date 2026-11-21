"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  DataIndex,
  FilterState,
  LayerState,
  HeatmapMode,
  MapDayData,
  PlayerJourney,
  MatchSummary,
  EventBookmark,
} from "@/lib/types";
import { loadIndex, loadMapDayData } from "@/lib/dataLoader";
import { FEATURED_MATCHES } from "@/lib/mapConfig";
import { computePOISummaries } from "@/lib/poiConfig";
import { detectDwellClusters } from "@/lib/dwellDetection";
import FilterPanel from "@/components/FilterPanel";
import LayerControls from "@/components/LayerControls";
import MapViewer from "@/components/MapViewer";
import Timeline from "@/components/Timeline";
import Legend from "@/components/Legend";
import StatsPanel from "@/components/StatsPanel";
import POISidebar from "@/components/POISidebar";

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
    selectedMatch: FEATURED_MATCHES["AmbroseValley"] || null,
  });

  // ─── Layer visibility ───
  const [layers, setLayers] = useState<LayerState>({
    showHumanTrails: true,
    showBotTrails: true,
    showKills: true,
    showDeaths: true,
    showLoot: false,
    showStorm: true,
    showPOIZones: false,
    showCampers: false,
    heatmapMode: "off",
  });

  // ─── Playback state ───
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(4);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // ─── Game Designer Features: POI, Radar & Camping state ───
  const [isPOISidebarOpen, setIsPOISidebarOpen] = useState(false);
  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null);
  const [radarEvent, setRadarEvent] = useState<EventBookmark | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const initialUrlParsed = useRef(false);

  // ─── Parse URL Query Parameters on Client Mount ───
  useEffect(() => {
    if (typeof window === "undefined" || initialUrlParsed.current) return;
    initialUrlParsed.current = true;

    const params = new URLSearchParams(window.location.search);
    const qMap = params.get("map");
    const qDate = params.get("date");
    const qMatch = params.get("match");
    const qHeat = params.get("heat") as HeatmapMode | null;
    const qTime = params.get("t");
    const qCamp = params.get("camp");
    const qPoi = params.get("poi");
    const qPoiId = params.get("poiId");

    if (qMap || qDate || qMatch) {
      const chosenMap = qMap || "AmbroseValley";
      const chosenMatch =
        qMatch === "all"
          ? null
          : qMatch || FEATURED_MATCHES[chosenMap] || null;

      setFilters((prev) => ({
        selectedMap: chosenMap,
        selectedDate: qDate || prev.selectedDate,
        selectedMatch: chosenMatch,
      }));
    }

    if (qHeat || qCamp || qPoi) {
      setLayers((prev) => ({
        ...prev,
        heatmapMode: qHeat || prev.heatmapMode,
        showCampers: qCamp === "1" ? true : prev.showCampers,
        showPOIZones: qPoi === "1" ? true : prev.showPOIZones,
      }));
    }

    if (qTime) {
      const parsedT = parseFloat(qTime);
      if (!isNaN(parsedT)) setCurrentTime(parsedT);
    }

    if (qPoiId) {
      setSelectedPOIId(qPoiId);
      setIsPOISidebarOpen(true);
    }
  }, []);

  // ─── Sync State to URL Query Parameters (Debounced) ───
  useEffect(() => {
    if (typeof window === "undefined" || !index || isPlaying) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("map", filters.selectedMap);
      params.set("date", filters.selectedDate);
      if (filters.selectedMatch) {
        params.set("match", filters.selectedMatch);
        if (currentTime > 0) {
          params.set("t", currentTime.toFixed(1));
        }
      }
      if (layers.heatmapMode !== "off") {
        params.set("heat", layers.heatmapMode);
      }
      if (layers.showCampers) {
        params.set("camp", "1");
      }
      if (layers.showPOIZones) {
        params.set("poi", "1");
      }
      if (selectedPOIId) {
        params.set("poiId", selectedPOIId);
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }, 300);

    return () => clearTimeout(timeout);
  }, [filters, layers, currentTime, selectedPOIId, index]);

  // ─── Load index on mount ───
  useEffect(() => {
    loadIndex()
      .then((idx) => {
        setIndex(idx);
        setFilters((prev) => ({
          ...prev,
          selectedMap: prev.selectedMap || idx.maps[0],
          selectedDate: prev.selectedDate || idx.dates[0],
        }));
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
    // Remember whether play mode was active before switching map
    const shouldKeepPlaying = isPlayingRef.current;

    loadMapDayData(filters.selectedMap, filters.selectedDate)
      .then((data) => {
        setMapDayData(data);
        setCurrentTime(0);
        // If play mode was enabled, start playing from the beginning for the new map
        if (shouldKeepPlaying) {
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
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

    // Combine all matches for aggregate view
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
      return max > 0 ? max : 600;
    }

    // In All Matches mode, calculate the maximum elapsed match time
    if (mapDayData?.matches) {
      let max = 0;
      for (const players of Object.values(mapDayData.matches)) {
        for (const p of players) {
          if (p.positions.length > 0) {
            const lastPosT = p.positions[p.positions.length - 1][2];
            if (lastPosT > max) max = lastPosT;
          }
          for (const ev of p.events) {
            if (ev.ts > max) max = ev.ts;
          }
        }
      }
      return max > 0 ? max : 720;
    }

    return 600;
  }, [filters.selectedMatch, mapDayData]);

  // ─── Event Bookmarks for Timeline Scrubber ───
  const matchEventBookmarks = useMemo((): EventBookmark[] => {
    if (filters.selectedMatch) {
      // In single match view, include all events for this match
      const bookmarks: EventBookmark[] = [];
      for (const player of currentPlayers) {
        for (const ev of player.events) {
          bookmarks.push({
            type: ev.type,
            x: ev.x,
            y: ev.y,
            ts: ev.ts,
            userId: player.userId,
            isHuman: player.isHuman,
          });
        }
      }
      return bookmarks.sort((a, b) => a.ts - b.ts);
    }

    // In All Matches macro mode: sample combat events uniformly across the full timeline (0s to maxTime)
    // This prevents all pins from being crammed into the first 30 seconds of loot pickups.
    const combatEvents: EventBookmark[] = [];
    const otherEvents: EventBookmark[] = [];

    for (const player of currentPlayers) {
      for (const ev of player.events) {
        const item: EventBookmark = {
          type: ev.type,
          x: ev.x,
          y: ev.y,
          ts: ev.ts,
          userId: player.userId,
          isHuman: player.isHuman,
        };
        if (ev.type.includes("Kill") || ev.type.includes("Killed")) {
          combatEvents.push(item);
        } else {
          otherEvents.push(item);
        }
      }
    }

    combatEvents.sort((a, b) => a.ts - b.ts);

    if (combatEvents.length === 0) {
      return otherEvents.slice(0, 60).sort((a, b) => a.ts - b.ts);
    }

    const matchDuration = maxTime > 0 ? maxTime : combatEvents[combatEvents.length - 1].ts;
    const numBuckets = 60;
    const bucketSize = matchDuration / numBuckets;
    const sampled: EventBookmark[] = [];

    for (let b = 0; b < numBuckets; b++) {
      const tStart = b * bucketSize;
      const tEnd = (b + 1) * bucketSize;
      const inBucket = combatEvents.filter((e) => e.ts >= tStart && e.ts < tEnd);
      if (inBucket.length > 0) {
        // Prioritize Player Kill > BotKill > Deaths
        inBucket.sort((a, b) => {
          const scoreA = a.type === "Kill" ? 3 : a.type === "BotKill" ? 2 : 1;
          const scoreB = b.type === "Kill" ? 3 : b.type === "BotKill" ? 2 : 1;
          return scoreB - scoreA;
        });
        sampled.push(inBucket[0]);
      }
    }

    return sampled.sort((a, b) => a.ts - b.ts);
  }, [filters.selectedMatch, currentPlayers, maxTime]);

  // ─── POI Zone Analytics ───
  const poiSummaries = useMemo(() => {
    return computePOISummaries(currentPlayers, filters.selectedMap);
  }, [currentPlayers, filters.selectedMap]);

  // ─── Camping & Dwell Clusters Detection ───
  const dwellClusters = useMemo(() => {
    if (!layers.showCampers || currentPlayers.length === 0) return [];
    return detectDwellClusters(currentPlayers, 15, 16);
  }, [layers.showCampers, currentPlayers]);

  // ─── Current match summary stats ───
  const currentStats = useMemo((): MatchSummary | null => {
    if (!filters.selectedMatch || !index) return null;
    return (
      index.matchSummaries.find((s) => s.matchId === filters.selectedMatch) ??
      null
    );
  }, [filters.selectedMatch, index]);

  // ─── Handlers ───
  const handlePlayToggle = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleFilterChange = useCallback((f: Partial<FilterState>) => {
    if (f.selectedMap !== undefined || f.selectedMatch !== undefined) {
      setCurrentTime(0);
    }
    setFilters((prev) => ({ ...prev, ...f }));
  }, []);

  const handleLayerChange = useCallback((l: Partial<LayerState>) => {
    setLayers((prev) => ({ ...prev, ...l }));
  }, []);

  const handleEventJump = useCallback((ev: EventBookmark) => {
    setRadarEvent(ev);
  }, []);

  const handleShareLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setToastMessage("✓ Copied shareable link to clipboard!");
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

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
    <div className="h-screen flex flex-col bg-lila-bg overflow-hidden select-none">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl border border-indigo-400 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Bar: Filters & Share ── */}
      <header className="flex-shrink-0 border-b border-lila-border bg-lila-panel">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <div className="w-2 h-2 rounded-full bg-lila-accent animate-pulse" />
              <h1 className="text-sm font-bold tracking-wider uppercase text-slate-200">
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

          {/* Share View Button */}
          <button
            onClick={handleShareLink}
            className="px-3 py-1.5 rounded bg-lila-accent/20 border border-lila-accent/40 text-indigo-300 hover:bg-lila-accent hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            title="Copy shareable link with current map, match, and layer settings"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">Share View</span>
          </button>
        </div>
      </header>

      {/* ── Main Content: Map + Controls + POI Drawer ── */}
      <main className="flex-1 flex overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-lila-bg/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-lila-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading data...</p>
            </div>
          </div>
        )}

        {/* Map Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <MapViewer
            mapId={filters.selectedMap}
            players={currentPlayers}
            layers={layers}
            currentTime={currentTime}
            maxTime={maxTime}
            isMatchView={!!filters.selectedMatch}
            selectedPOIId={selectedPOIId}
            dwellClusters={dwellClusters}
            radarEvent={radarEvent}
            onSelectPOI={(id) => {
              setSelectedPOIId(id);
              if (id) setIsPOISidebarOpen(true);
            }}
          />

          {/* Layer controls — floating bottom-left */}
          <div className="absolute bottom-14 left-4 z-10">
            <LayerControls
              layers={layers}
              onChange={handleLayerChange}
              onTogglePOISidebar={() => setIsPOISidebarOpen((o) => !o)}
              isPOISidebarOpen={isPOISidebarOpen}
            />
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

        {/* POI Analytics Sidebar (Right Drawer) */}
        <POISidebar
          isOpen={isPOISidebarOpen}
          mapName={filters.selectedMap}
          summaries={poiSummaries}
          selectedPOIId={selectedPOIId}
          onSelectPOI={setSelectedPOIId}
          onClose={() => setIsPOISidebarOpen(false)}
        />
      </main>

      {/* ── Bottom Bar: Timeline with Bookmarks & Jump Controls ── */}
      <footer className="flex-shrink-0 border-t border-lila-border bg-lila-panel">
        <Timeline
          currentTime={currentTime}
          maxTime={maxTime > 0 ? maxTime : 600}
          isPlaying={isPlaying}
          speed={speed}
          events={matchEventBookmarks}
          selectedMatchId={filters.selectedMatch}
          totalPlayersCount={currentPlayers.length}
          onTimeChange={setCurrentTime}
          onPlayToggle={handlePlayToggle}
          onSpeedChange={setSpeed}
          onEventJump={handleEventJump}
          onPickFeatured={() => {
            const feat = FEATURED_MATCHES[filters.selectedMap];
            if (feat) handleFilterChange({ selectedMatch: feat });
          }}
        />
      </footer>
    </div>
  );
}
