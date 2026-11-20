"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { PlayerJourney, LayerState, PlayerEvent } from "@/lib/types";
import { MAP_CONFIGS, EVENT_COLORS, MINIMAP_SIZE } from "@/lib/mapConfig";
import { renderHeatmap } from "@/lib/heatmap";

interface MapViewerProps {
  mapId: string;
  players: PlayerJourney[];
  layers: LayerState;
  currentTime: number;
  maxTime: number;
  isMatchView: boolean; // true = single match, false = aggregate
}

/** Canvas display size (CSS pixels). We render at 2× for retina. */
const DISPLAY_SIZE = 900;
const RENDER_SCALE = 1; // Keep at 1 for performance; bump to 2 for retina

export default function MapViewer({
  mapId,
  players,
  layers,
  currentTime,
  maxTime,
  isMatchView,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);   // minimap image
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);  // movement trails
  const eventCanvasRef = useRef<HTMLCanvasElement>(null);  // event markers
  const heatCanvasRef = useRef<HTMLCanvasElement>(null);   // heatmap overlay

  const [minimapImage, setMinimapImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState(DISPLAY_SIZE);

  // ─── Zoom & Pan ───
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ─── Tooltip ───
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const mapConfig = MAP_CONFIGS[mapId];

  // ─── Responsive sizing ───
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

  // ─── Load minimap image ───
  useEffect(() => {
    if (!mapConfig) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMinimapImage(img);
    img.src = mapConfig.minimapImage;

    // Reset zoom/pan when switching maps
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [mapConfig]);

  // ─── Draw base layer (minimap image) ───
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas || !minimapImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(minimapImage, 0, 0, w, h);
  }, [minimapImage, canvasSize]);

  // ─── Scale factor: canvas pixels / minimap pixels ───
  const scale = canvasSize / MINIMAP_SIZE;

  // ─── Draw trails ───
  useEffect(() => {
    const canvas = trailCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const player of players) {
      const isHuman = player.isHuman;

      // Skip if layer is hidden
      if (isHuman && !layers.showHumanTrails) continue;
      if (!isHuman && !layers.showBotTrails) continue;

      const positions = player.positions;
      if (positions.length === 0) continue;

      // In match view with playback, only show positions up to currentTime
      const visiblePositions = isMatchView
        ? positions.filter((p) => p[2] <= currentTime)
        : positions;

      if (visiblePositions.length === 0) continue;

      if (visiblePositions.length >= 2) {
        ctx.beginPath();
        // High-visibility bright cyan for human, crisp luminous silver for bot
        ctx.strokeStyle = isHuman ? "#22d3ee" : "#f1f5f9";
        ctx.lineWidth = isHuman ? 2.2 : 2.0;
        ctx.globalAlpha = isHuman ? 0.9 : 0.85;

        // Strong drop-shadow halo for instant contrast on any map background
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = isHuman ? 3 : 4;

        if (!isHuman) {
          ctx.setLineDash([7, 4]); // Clearly defined dashes
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(visiblePositions[0][0] * scale, visiblePositions[0][1] * scale);
        for (let i = 1; i < visiblePositions.length; i++) {
          ctx.lineTo(
            visiblePositions[i][0] * scale,
            visiblePositions[i][1] * scale
          );
        }
        ctx.stroke();

        // Reset shadow after line stroke
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      // Draw current position indicator (in match view for both humans and bots)
      if (isMatchView && visiblePositions.length > 0) {
        const last = visiblePositions[visiblePositions.length - 1];
        ctx.beginPath();
        ctx.fillStyle = isHuman ? "#22d3ee" : "#f1f5f9";
        ctx.globalAlpha = 1;
        ctx.arc(last[0] * scale, last[1] * scale, isHuman ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring indicator
        ctx.beginPath();
        ctx.strokeStyle = isHuman ? "#22d3ee" : "#f1f5f9";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash(isHuman ? [] : [3, 2]);
        ctx.arc(last[0] * scale, last[1] * scale, isHuman ? 8 : 6.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [players, layers.showHumanTrails, layers.showBotTrails, currentTime, isMatchView, scale]);

  // ─── Draw event markers ───
  useEffect(() => {
    const canvas = eventCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const shouldShow = (ev: PlayerEvent): boolean => {
      // Time filter in match view
      if (isMatchView && ev.ts > currentTime) return false;

      switch (ev.type) {
        case "Kill":
        case "BotKill":
          return layers.showKills;
        case "Killed":
        case "BotKilled":
          return layers.showDeaths;
        case "KilledByStorm":
          return layers.showStorm;
        case "Loot":
          return layers.showLoot;
        default:
          return false;
      }
    };

    for (const player of players) {
      for (const ev of player.events) {
        if (!shouldShow(ev)) continue;

        const px = ev.x * scale;
        const py = ev.y * scale;
        const color = EVENT_COLORS[ev.type] || "#ffffff";

        ctx.globalAlpha = 0.9;

        if (ev.type === "Kill" || ev.type === "BotKill") {
          // Crosshair / sword marker
          drawCrosshair(ctx, px, py, 6, color);
        } else if (ev.type === "Killed" || ev.type === "BotKilled") {
          // Skull / X marker
          drawSkull(ctx, px, py, 5, color);
        } else if (ev.type === "KilledByStorm") {
          // Lightning bolt
          drawLightning(ctx, px, py, 7, color);
        } else if (ev.type === "Loot") {
          // Diamond marker
          drawDiamond(ctx, px, py, 4, color);
        }
      }
    }

    ctx.globalAlpha = 1;
  }, [players, layers.showKills, layers.showDeaths, layers.showLoot, layers.showStorm, currentTime, isMatchView, scale]);

  // ─── Draw heatmap ───
  useEffect(() => {
    const canvas = heatCanvasRef.current;
    if (!canvas) return;

    if (layers.heatmapMode === "off") {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Collect relevant points
    const points: [number, number][] = [];

    for (const player of players) {
      if (layers.heatmapMode === "traffic") {
        // Use all positions
        for (const pos of player.positions) {
          if (!isMatchView || pos[2] <= currentTime) {
            points.push([pos[0], pos[1]]);
          }
        }
      } else {
        // Use specific event types
        for (const ev of player.events) {
          if (isMatchView && ev.ts > currentTime) continue;

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

    renderHeatmap(canvas, points, layers.heatmapMode === "traffic" ? 15 : 25, scale);
  }, [players, layers.heatmapMode, currentTime, isMatchView, scale]);

  // ─── Zoom with scroll wheel ───
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.5, Math.min(5, z + delta)));
    },
    []
  );

  // ─── Pan with drag ───
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // left click only
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

      // Tooltip on hover — check for nearby events
      const canvas = eventCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / zoom;
      const my = (e.clientY - rect.top) / zoom;
      const threshold = 10;

      let found: { text: string; x: number; y: number } | null = null;

      for (const player of players) {
        for (const ev of player.events) {
          const px = ev.x * scale;
          const py = ev.y * scale;
          const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
          if (dist < threshold) {
            const playerType = player.isHuman ? "Human" : "Bot";
            const userId = player.userId.substring(0, 8);
            found = {
              text: `${ev.type} by ${playerType} (${userId}…) at ${ev.ts.toFixed(1)}s`,
              x: e.clientX,
              y: e.clientY,
            };
            break;
          }
        }
        if (found) break;
      }

      setTooltip(found);
    },
    [isDragging, players, zoom, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ─── Double-click to reset zoom ───
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
        {/* Layer 0: Minimap background */}
        <canvas ref={baseCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 0 }} />

        {/* Layer 1: Heatmap overlay */}
        <canvas ref={heatCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 1 }} />

        {/* Layer 2: Movement trails */}
        <canvas ref={trailCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 2 }} />

        {/* Layer 3: Event markers */}
        <canvas ref={eventCanvasRef} {...canvasProps} style={{ ...canvasProps.style, zIndex: 3 }} />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 bg-black/90 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-2 right-2 text-xs text-slate-500 bg-lila-panel/80 rounded px-2 py-1">
          {Math.round(zoom * 100)}% — double-click to reset
        </div>
      )}
    </div>
  );
}

// ===================== Marker Drawing Helpers =====================

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
  // Horizontal line
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  // Vertical line
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  // Center dot
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
  // X shape
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();

  // Outer circle
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

  // Glow
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y, size + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.9;
}
