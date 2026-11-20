/**
 * High-performance Heatmap renderer using HTML5 Canvas.
 * Generates smooth, color-graded density overlays for game telemetry.
 */

import { HeatmapMode } from "./types";

/** Color gradient stops for each heatmap mode */
export const HEAT_GRADIENTS: Record<HeatmapMode, [number, string][]> = {
  off: [],
  traffic: [
    [0.0, "rgba(0, 0, 0, 0)"],
    [0.15, "rgba(30, 64, 175, 0.45)"],   // deep navy blue
    [0.35, "rgba(6, 182, 212, 0.65)"],   // cyan
    [0.55, "rgba(34, 197, 94, 0.75)"],   // neon green
    [0.75, "rgba(234, 179, 8, 0.85)"],   // vibrant yellow
    [1.0, "rgba(239, 68, 68, 0.95)"],    // fire red
  ],
  kills: [
    [0.0, "rgba(0, 0, 0, 0)"],
    [0.15, "rgba(153, 27, 27, 0.45)"],   // deep red
    [0.4, "rgba(239, 68, 68, 0.7)"],     // bright red
    [0.7, "rgba(249, 115, 22, 0.85)"],   // fiery orange
    [1.0, "rgba(254, 240, 138, 0.95)"],  // glowing yellow core
  ],
  deaths: [
    [0.0, "rgba(0, 0, 0, 0)"],
    [0.15, "rgba(107, 33, 168, 0.45)"],  // deep purple
    [0.4, "rgba(217, 70, 239, 0.7)"],    // fuchsia
    [0.7, "rgba(244, 63, 94, 0.85)"],    // rose
    [1.0, "rgba(255, 237, 213, 0.95)"],  // warm white/orange core
  ],
  loot: [
    [0.0, "rgba(0, 0, 0, 0)"],
    [0.15, "rgba(21, 128, 61, 0.45)"],   // dark emerald
    [0.4, "rgba(34, 197, 94, 0.7)"],     // bright emerald
    [0.7, "rgba(234, 179, 8, 0.85)"],    // golden yellow
    [1.0, "rgba(254, 249, 195, 0.95)"],  // bright gold core
  ],
};

// Cache pre-computed color lookup tables
const lutCache = new Map<HeatmapMode, Uint8ClampedArray>();

/**
 * Build a 256×1 color lookup texture from gradient stops.
 */
function getColorLUT(mode: HeatmapMode): Uint8ClampedArray {
  if (lutCache.has(mode)) {
    return lutCache.get(mode)!;
  }

  const stops = HEAT_GRADIENTS[mode] || HEAT_GRADIENTS.traffic;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [stop, color] of stops) {
    gradient.addColorStop(stop, color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  const imgData = ctx.getImageData(0, 0, 256, 1);
  lutCache.set(mode, imgData.data);
  return imgData.data;
}

/**
 * Render a heatmap onto the target canvas.
 *
 * @param canvas      Target HTML5 canvas element
 * @param points      Array of [x, y] coordinates in 1024×1024 minimap space
 * @param radius      Base radius of each point's heat stamp
 * @param canvasScale Scale factor from 1024 minimap space to canvas display size
 * @param mode        Heatmap mode (traffic, kills, deaths, loot)
 */
export function renderHeatmap(
  canvas: HTMLCanvasElement,
  points: [number, number][],
  radius: number = 25,
  canvasScale: number = 1,
  mode: HeatmapMode = "traffic"
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  if (points.length === 0 || mode === "off") return;

  // Step 1: Draw radial alpha stamps onto an offscreen canvas
  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  const alphaCtx = alphaCanvas.getContext("2d");
  if (!alphaCtx) return;

  const scaledRadius = Math.max(14, Math.round(radius * canvasScale));

  // Dynamic alpha per stamp: lighter for massive datasets, punchier for single matches
  const baseAlpha =
    points.length > 10000 ? 0.05 : points.length > 1000 ? 0.12 : 0.25;

  alphaCtx.globalCompositeOperation = "lighter";

  for (const [x, y] of points) {
    const sx = x * canvasScale;
    const sy = y * canvasScale;

    // Skip points outside canvas boundaries
    if (sx < -scaledRadius || sx > w + scaledRadius || sy < -scaledRadius || sy > h + scaledRadius) {
      continue;
    }

    const radGrad = alphaCtx.createRadialGradient(
      sx, sy, 0,
      sx, sy, scaledRadius
    );
    radGrad.addColorStop(0, `rgba(0, 0, 0, ${baseAlpha})`);
    radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

    alphaCtx.fillStyle = radGrad;
    alphaCtx.beginPath();
    alphaCtx.arc(sx, sy, scaledRadius, 0, Math.PI * 2);
    alphaCtx.fill();
  }

  // Step 2: Read accumulated alpha and colorize via LUT
  const alphaData = alphaCtx.getImageData(0, 0, w, h);
  const pixels = alphaData.data;
  const lut = getColorLUT(mode);

  // Find maximum alpha intensity (Index i + 3 is the ALPHA channel!)
  let maxAlpha = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > maxAlpha) {
      maxAlpha = pixels[i];
    }
  }

  // If no alpha was drawn, return
  if (maxAlpha === 0) return;

  // Colorize each pixel based on its alpha intensity
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a === 0) continue;

    // Normalize intensity into LUT index [1..255]
    const normalized = Math.min(255, Math.max(1, Math.floor((a / maxAlpha) * 255)));
    const lutIdx = normalized * 4;

    pixels[i] = lut[lutIdx];         // R
    pixels[i + 1] = lut[lutIdx + 1]; // G
    pixels[i + 2] = lut[lutIdx + 2]; // B
    pixels[i + 3] = lut[lutIdx + 3]; // A
  }

  // Blit final colorized heatmap onto destination canvas
  ctx.putImageData(alphaData, 0, 0);
}
