"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import {
  PlayerJourney,
  LayerState,
  PlayerEvent,
  DwellCluster,
  EventBookmark,
} from "@/lib/types";
import { MAP_CONFIGS, EVENT_COLORS, MINIMAP_SIZE } from "@/lib/mapConfig";
import { MAP_POIS, isPointInBounds } from "@/lib/poiConfig";
import { renderHeatmap } from "@/lib/heatmap";
import { analyzeCombat, EventCombatMeta } from "@/lib/combatAnalytics";

interface MapViewerProps {
  mapId: string;
  players: PlayerJourney[];
  layers: LayerState;
  currentTime: number;
  maxTime: number;
  isMatchView: boolean;
  selectedPOIId?: string | null;
  dwellClusters?: DwellCluster[];
  radarEvent?: EventBookmark | null;
  onSelectPOI?: (poiId: string | null) => void;
}

const DISPLAY_SIZE = 900;

interface InterpolatedJourney {
  path: [number, number][];
  currentPos: [number, number] | null;
  heading?: number;
  isAlive: boolean;
  hasStarted: boolean;
}

/**
 * Calculates continuous sub-second interpolated player route and moving head position.
 * Prevents 15-second frozen stops and provides smooth 60fps playback motion.
 */
function getInterpolatedJourney(
  positions: [number, number, number][],
  currentTime: number,
  isTimeFiltered: boolean
): InterpolatedJourney {
  if (!positions || positions.length === 0) {
    return { path: [], currentPos: null, isAlive: false, hasStarted: false };
  }

  // If time filtering is off (e.g. static full view at currentTime === 0 in aggregate mode)
  if (!isTimeFiltered || currentTime <= 0) {
    const fullPath: [number, number][] = positions.map((p) => [p[0], p[1]]);
    const last = positions[positions.length - 1];
    return {
      path: fullPath,
      currentPos: [last[0], last[1]],
      isAlive: true,
      hasStarted: true,
    };
  }

  const firstTime = positions[0][2];
  if (currentTime < firstTime) {
    // Player has not yet spawned in match at this time
    return { path: [], currentPos: null, isAlive: false, hasStarted: false };
  }

  const lastIndex = positions.length - 1;
  const lastTime = positions[lastIndex][2];

  // If match time has reached or passed the player's last position
  if (currentTime >= lastTime) {
    const fullPath: [number, number][] = positions.map((p) => [p[0], p[1]]);
    const last = positions[lastIndex];
    return {
      path: fullPath,
      currentPos: [last[0], last[1]],
      isAlive: false,
      hasStarted: true,
    };
  }

  // Find segment k where positions[k][2] <= currentTime < positions[k+1][2]
  let k = 0;
  for (let i = 0; i < lastIndex; i++) {
    if (positions[i][2] <= currentTime && currentTime < positions[i + 1][2]) {
      k = i;
      break;
    }
  }

  const p0 = positions[k];
  const p1 = positions[k + 1];
  const t0 = p0[2];
  const t1 = p1[2];
  const dt = t1 - t0;
  const alpha = dt > 0 ? Math.max(0, Math.min(1, (currentTime - t0) / dt)) : 0;

  const interpX = p0[0] + alpha * (p1[0] - p0[0]);
  const interpY = p0[1] + alpha * (p1[1] - p0[1]);

  const path: [number, number][] = [];
  for (let i = 0; i <= k; i++) {
    path.push([positions[i][0], positions[i][1]]);
  }
  path.push([interpX, interpY]);

  const heading = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);

  return {
    path,
    currentPos: [interpX, interpY],
    heading,
    isAlive: true,
    hasStarted: true,
  };
}

export default function MapViewer({
  mapId,
  players,
  layers,
  currentTime,
  maxTime,
  isMatchView,
  selectedPOIId = null,
  dwellClusters = [],
  radarEvent = null,
  onSelectPOI,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement>(null);
  const poiCanvasRef = useRef<HTMLCanvasElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventCanvasRef = useRef<HTMLCanvasElement>(null);

  const [minimapImage, setMinimapImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState(DISPLAY_SIZE);
  const heatmapWasRenderedRef = useRef(false);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Radar ping state for event jumps
  const [radarPing, setRadarPing] = useState<{ x: number; y: number } | null>(null);

  // Tooltip
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  const mapConfig = MAP_CONFIGS[mapId];
  const pois = MAP_POIS[mapId] || [];
  const combatData = useMemo(() => analyzeCombat(players), [players]);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) - 16;
        setCanvasSize(Math.max(400, size));
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Trigger radar ping on event jump
  useEffect(() => {
    if (radarEvent) {
      setRadarPing({ x: radarEvent.x, y: radarEvent.y });
      const timer = setTimeout(() => setRadarPing(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [radarEvent]);

  // Load minimap image
  useEffect(() => {
    if (!mapConfig) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMinimapImage(img);
    img.src = mapConfig.minimapImage;

    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [mapConfig]);

  // Layer 0: Minimap Image
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas || !minimapImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(minimapImage, 0, 0, canvas.width, canvas.height);
  }, [minimapImage, canvasSize]);

  const scale = canvasSize / MINIMAP_SIZE;

  // Layer 1: Heatmap
  useEffect(() => {
    const canvas = heatCanvasRef.current;
    if (!canvas) return;

    if (layers.heatmapMode === "off") {
      if (heatmapWasRenderedRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        heatmapWasRenderedRef.current = false;
      }
      return;
    }

    heatmapWasRenderedRef.current = true;

    const points: [number, number][] = [];
    const applyTimeFilter = isMatchView && currentTime > 0;

    for (const player of players) {
      if (layers.heatmapMode === "traffic") {
        for (const pos of player.positions) {
          if (!applyTimeFilter || pos[2] <= currentTime) {
            points.push([pos[0], pos[1]]);
          }
        }
      } else {
        for (const ev of player.events) {
          if (applyTimeFilter && ev.ts > currentTime) continue;

          const match =
            (layers.heatmapMode === "kills" &&
              (ev.type === "Kill" || ev.type === "BotKill")) ||
            (layers.heatmapMode === "deaths" &&
              (ev.type === "Killed" ||
                ev.type === "BotKilled" ||
                ev.type === "KilledByStorm")) ||
            (layers.heatmapMode === "loot" && ev.type === "Loot");

          if (match) {
            points.push([ev.x, ev.y]);
          }
        }
      }
    }

    const radius =
      layers.heatmapMode === "traffic"
        ? points.length < 500
          ? 32
          : 24
        : points.length < 50
        ? 42
        : 32;

    renderHeatmap(canvas, points, radius, scale, layers.heatmapMode);
  }, [players, layers.heatmapMode, currentTime, isMatchView, scale]);

  // Layer 2: POI Zones Overlay
  useEffect(() => {
    const canvas = poiCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!layers.showPOIZones || pois.length === 0) return;

    for (const poi of pois) {
      const [minX, minY, maxX, maxY] = poi.bounds;
      const x = minX * scale;
      const y = minY * scale;
      const w = (maxX - minX) * scale;
      const h = (maxY - minY) * scale;

      const isSelected = selectedPOIId === poi.id;

      // Fill with subtle zone tint
      ctx.fillStyle = isSelected ? "rgba(99, 102, 241, 0.22)" : "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(x, y, w, h);

      // Border stroke
      ctx.strokeStyle = isSelected ? "#818cf8" : poi.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash(isSelected ? [] : [6, 4]);
      ctx.strokeRect(x, y, w, h);

      // Label pill at top of zone
      const labelText = poi.name;
      ctx.font = "bold 11px sans-serif";
      const textWidth = ctx.measureText(labelText).width;
      const badgeWidth = textWidth + 12;
      const badgeHeight = 18;
      const badgeX = x + (w - badgeWidth) / 2;
      const badgeY = y + 4;

      // Badge background
      ctx.fillStyle = isSelected ? "#4f46e5" : "rgba(15, 23, 42, 0.85)";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#c7d2fe" : poi.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Badge text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }
  }, [pois, layers.showPOIZones, selectedPOIId, scale]);

  // Layer 3: Movement Trails
  useEffect(() => {
    const canvas = trailCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isTimeActive = isMatchView || currentTime > 0;

    for (const player of players) {
      const isHuman = player.isHuman;

      if (isHuman && !layers.showHumanTrails) continue;
      if (!isHuman && !layers.showBotTrails) continue;

      const positions = player.positions;
      if (!positions || positions.length === 0) continue;

      const journey = getInterpolatedJourney(positions, currentTime, isTimeActive);
      if (!journey.hasStarted || journey.path.length === 0) continue;

      // Draw path line
      if (journey.path.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = isHuman ? "#22d3ee" : "#f1f5f9";
        ctx.lineWidth = isHuman ? 2.2 : 2.0;
        ctx.globalAlpha = isHuman ? 0.9 : 0.85;

        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = isHuman ? 3 : 4;

        if (!isHuman) {
          ctx.setLineDash([7, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(journey.path[0][0] * scale, journey.path[0][1] * scale);
        for (let i = 1; i < journey.path.length; i++) {
          ctx.lineTo(journey.path[i][0] * scale, journey.path[i][1] * scale);
        }
        ctx.stroke();

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      // Current position indicator
      if (journey.currentPos) {
        const hx = journey.currentPos[0] * scale;
        const hy = journey.currentPos[1] * scale;

        ctx.beginPath();
        ctx.fillStyle = isHuman ? "#22d3ee" : "#f1f5f9";
        ctx.globalAlpha = 1;
        ctx.arc(hx, hy, isHuman ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (journey.isAlive) {
          // Outer glowing pulse ring
          ctx.beginPath();
          ctx.strokeStyle = isHuman ? "#22d3ee" : "#f1f5f9";
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.6;
          ctx.setLineDash(isHuman ? [] : [3, 2]);
          ctx.arc(hx, hy, isHuman ? 8 : 6.5, 0, Math.PI * 2);
          ctx.stroke();

          // Heading direction vector if moving
          if (journey.heading !== undefined) {
            const arrowLen = isHuman ? 9 : 7;
            const tipX = hx + Math.cos(journey.heading) * arrowLen;
            const tipY = hy + Math.sin(journey.heading) * arrowLen;

            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(tipX, tipY);
            ctx.strokeStyle = isHuman ? "#67e8f9" : "#ffffff";
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();
          }
        } else {
          // Journey completed
          ctx.beginPath();
          ctx.strokeStyle = isHuman ? "#38bdf8" : "#94a3b8";
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.5;
          ctx.setLineDash([]);
          ctx.arc(hx, hy, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [players, layers.showHumanTrails, layers.showBotTrails, currentTime, isMatchView, scale]);

  // Layer 4: Events, Camping Halos & Markers
  useEffect(() => {
    const canvas = eventCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isTimeActive = isMatchView || currentTime > 0;

    // 1. Draw Camping / Dwell Halos
    if (layers.showCampers && dwellClusters.length > 0) {
      for (const c of dwellClusters) {
        if (isTimeActive && c.startTime > currentTime) continue;

        const cx = c.x * scale;
        const cy = c.y * scale;
        const radius = Math.min(26, Math.max(10, 8 + c.duration * 0.25)) * scale;

        // Concentric pulsing aura
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245, 158, 11, 0.22)";
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.setLineDash([]);
        ctx.fill();
      }
    }

    // 2. Draw Combat & Loot Event Markers
    const shouldShow = (ev: PlayerEvent, meta?: EventCombatMeta): boolean => {
      if (isTimeActive && ev.ts > currentTime) return false;

      if (ev.type === "Kill" || ev.type === "BotKill") {
        if (!layers.showKills) return false;
        if (meta?.isShared && layers.showSharedKills === false) return false;
        if (meta?.isHuman && !meta?.isShared && layers.showHumanKills === false)
          return false;
        if (!meta?.isHuman && !meta?.isShared && layers.showBotKills === false)
          return false;
        return true;
      }

      if (ev.type === "Killed" || ev.type === "BotKilled") {
        return layers.showDeaths;
      }
      if (ev.type === "KilledByStorm") {
        return layers.showStorm;
      }
      if (ev.type === "Loot") {
        return layers.showLoot;
      }
      return false;
    };

    for (const player of players) {
      for (const ev of player.events) {
        const meta = combatData.eventMetaMap.get(ev);
        if (!shouldShow(ev, meta)) continue;

        const px = ev.x * scale;
        const py = ev.y * scale;

        // Custom colors for combat distinction
        let color = EVENT_COLORS[ev.type] || "#ffffff";
        if (ev.type === "Kill" || ev.type === "BotKill") {
          if (meta?.isShared) {
            color = "#facc15"; // Gold / Amber for Shared Kill
          } else if (meta?.isHuman) {
            color = "#22d3ee"; // Cyan for Human Kill
          } else {
            color = "#ef4444"; // Red for Bot Kill
          }
        }

        // Dynamic combat shockwave pulse if event happened recently (within last 3.5s)
        if (isTimeActive && currentTime >= ev.ts && currentTime - ev.ts <= 3.5) {
          const age = currentTime - ev.ts; // 0 to 3.5s
          const p = age / 3.5;
          const pulseRadius = (8 + p * 24) * scale;
          const pulseAlpha = Math.max(0, 0.9 * (1 - p));

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5 * (1 - p * 0.5);
          ctx.globalAlpha = pulseAlpha;
          ctx.stroke();
          ctx.restore();
        }

        ctx.globalAlpha = 0.9;

        if (ev.type === "Kill" || ev.type === "BotKill") {
          if (meta?.isShared) {
            drawSharedCrosshair(ctx, px, py, 7, color);
          } else {
            drawCrosshair(ctx, px, py, meta?.isHuman ? 7 : 6, color);
          }
        } else if (ev.type === "Killed" || ev.type === "BotKilled") {
          drawSkull(ctx, px, py, 5, color);
        } else if (ev.type === "KilledByStorm") {
          drawLightning(ctx, px, py, 7, color);
        } else if (ev.type === "Loot") {
          drawDiamond(ctx, px, py, 4, color);
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [
    players,
    dwellClusters,
    combatData,
    layers.showCampers,
    layers.showKills,
    layers.showHumanKills,
    layers.showBotKills,
    layers.showSharedKills,
    layers.showDeaths,
    layers.showLoot,
    layers.showStorm,
    currentTime,
    isMatchView,
    scale,
  ]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.5, Math.min(5, z + delta)));
  }, []);

  // Pan with drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({
          x: dragStart.current.panX + dx,
          y: dragStart.current.panY + dy,
        });
      }

      const canvas = eventCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / zoom;
      const my = (e.clientY - rect.top) / zoom;
      const threshold = 12;

      // 1. Check for nearby event markers
      for (const player of players) {
        for (const ev of player.events) {
          const px = ev.x * scale;
          const py = ev.y * scale;
          const dist = Math.hypot(mx - px, my - py);
          if (dist < threshold) {
            const meta = combatData.eventMetaMap.get(ev);

            let title = `${ev.type} (${player.isHuman ? "Human" : "Bot"})`;
            let subtitle = `User ${player.userId.substring(0, 8)}… at ${ev.ts.toFixed(1)}s`;

            if (ev.type === "Kill" || ev.type === "BotKill") {
              if (meta?.isShared) {
                title = `🤝 Shared Kill (Assist Credit)`;
                subtitle = `Killer: ${player.isHuman ? "Human" : "Bot"} (${player.userId.substring(0, 8)}…) at ${ev.ts.toFixed(1)}s • Shared with: ${meta.sharedWith.join(", ")}`;
              } else if (meta?.isHuman) {
                title = `🎯 Human Kill`;
                subtitle = `Killer: Human (${player.userId.substring(0, 8)}…) at ${ev.ts.toFixed(1)}s`;
              } else {
                title = `🤖 Bot Kill`;
                subtitle = `Killer: Bot ${player.userId} at ${ev.ts.toFixed(1)}s`;
              }
            } else if (ev.type === "Killed" || ev.type === "BotKilled") {
              const causeText =
                meta?.deathCause === "by_human"
                  ? "Killed by Human 🎯"
                  : meta?.deathCause === "storm"
                  ? "Killed by Storm ⚡"
                  : "Killed by Bot 🤖";
              title = `💀 Death (${player.isHuman ? "Human" : "Bot"})`;
              subtitle = `Victim: ${player.userId.substring(0, 8)}… at ${ev.ts.toFixed(1)}s • ${causeText}${meta?.isShared ? " [Assisted]" : ""}`;
            } else if (ev.type === "KilledByStorm") {
              title = `⚡ Storm Death`;
              subtitle = `Victim: ${player.isHuman ? "Human" : "Bot"} (${player.userId.substring(0, 8)}…) at ${ev.ts.toFixed(1)}s`;
            }

            setTooltip({
              title,
              subtitle,
              x: e.clientX,
              y: e.clientY,
            });
            return;
          }
        }
      }

      // 2. Check for camping halos
      if (layers.showCampers && dwellClusters.length > 0) {
        for (const c of dwellClusters) {
          const cx = c.x * scale;
          const cy = c.y * scale;
          const dist = Math.hypot(mx - cx, my - cy);
          if (dist < 18) {
            setTooltip({
              title: `⛺ Camping Spot (${c.duration}s dwell)`,
              subtitle: `Held by ${c.isHuman ? "Human" : "Bot"} (${c.userId.substring(0, 8)}…)`,
              x: e.clientX,
              y: e.clientY,
            });
            return;
          }
        }
      }

      // 3. Check for POI zone hover
      if (layers.showPOIZones && pois.length > 0) {
        const rawPx = mx / scale;
        const rawPy = my / scale;
        for (const p of pois) {
          if (isPointInBounds(rawPx, rawPy, p.bounds)) {
            setTooltip({
              title: `🏷️ ${p.name}`,
              subtitle: p.role,
              x: e.clientX,
              y: e.clientY,
            });
            return;
          }
        }
      }

      setTooltip(null);
    },
    [isDragging, players, dwellClusters, pois, layers.showCampers, layers.showPOIZones, zoom, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onSelectPOI || !layers.showPOIZones || pois.length === 0) return;
      const canvas = eventCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / zoom;
      const my = (e.clientY - rect.top) / zoom;
      const rawPx = mx / scale;
      const rawPy = my / scale;

      const clickedPOI = pois.find((p) => isPointInBounds(rawPx, rawPy, p.bounds));
      onSelectPOI(clickedPOI ? clickedPOI.id : null);
    },
    [onSelectPOI, layers.showPOIZones, pois, zoom, scale]
  );

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (!mapConfig) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Unknown map: {mapId}
      </div>
    );
  }

  const canvasProps = {
    width: canvasSize,
    height: canvasSize,
    className: "absolute top-0 left-0",
    style: { width: canvasSize, height: canvasSize },
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div
        className="relative"
        style={{
          width: canvasSize,
          height: canvasSize,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.1s ease-out",
        }}
      >
        {/* Layer 0: Minimap Image */}
        <canvas ref={baseCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 0 }} />

        {/* Layer 1: Heatmap Overlay */}
        <canvas ref={heatCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 1 }} />

        {/* Layer 2: POI Zones Overlay */}
        <canvas ref={poiCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 2 }} />

        {/* Layer 3: Movement Trails */}
        <canvas ref={trailCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 3 }} />

        {/* Layer 4: Events & Camping Halos */}
        <canvas ref={eventCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 4 }} />

        {/* Radar ping on event jump */}
        {radarPing && (
          <div
            className="absolute pointer-events-none z-20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{
              left: radarPing.x * scale,
              top: radarPing.y * scale,
              width: 72,
              height: 72,
            }}
          >
            {/* Outer animated radar beacon ring */}
            <div className="absolute inset-0 rounded-full border-2 border-red-500 bg-red-500/25 animate-ping" />
            {/* Secondary pulsing ring */}
            <div className="absolute inset-2 rounded-full border border-amber-400/80 animate-pulse" />
            {/* Inner glowing center badge */}
            <div className="w-6 h-6 rounded-full bg-red-600 ring-2 ring-white flex items-center justify-center text-[11px] text-white shadow-xl shadow-red-500/80">
              ⚔️
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 bg-black/95 text-white text-xs rounded-lg shadow-2xl pointer-events-none border border-slate-700 space-y-0.5"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="font-semibold text-slate-100">{tooltip.title}</div>
          {tooltip.subtitle && (
            <div className="text-[10px] text-slate-400">{tooltip.subtitle}</div>
          )}
        </div>
      )}

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-lila-panel/90 rounded px-2.5 py-1 border border-lila-border">
          {Math.round(zoom * 100)}% (Double-click to reset)
        </div>
      )}
    </div>
  );
}

// Marker Helpers
function drawSharedCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  // Outer gold halo
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, size + 2, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  // White core highlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkull(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, size + 1, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLightning(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - size);
  ctx.lineTo(x + 3, y - 1);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 2, y + size);
  ctx.lineTo(x - 3, y + 1);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}
