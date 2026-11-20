/**
 * Lightweight heatmap renderer using HTML5 Canvas.
 * Generates a heatmap overlay from an array of [x, y] points.
 */

/** Standard heat color gradient: transparent → blue → cyan → green → yellow → red */
const GRADIENT_STOPS: [number, string][] = [
  [0.0, "rgba(0, 0, 0, 0)"],
  [0.2, "rgba(0, 0, 255, 0.4)"],
  [0.4, "rgba(0, 255, 255, 0.5)"],
  [0.6, "rgba(0, 255, 0, 0.6)"],
  [0.8, "rgba(255, 255, 0, 0.7)"],
  [1.0, "rgba(255, 0, 0, 0.8)"],
];

/**
 * Build a 256×1 color lookup texture from the gradient stops.
 */
function buildColorLUT(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [stop, color] of GRADIENT_STOPS) {
    gradient.addColorStop(stop, color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return ctx.getImageData(0, 0, 256, 1);
}

/**
 * Render a heatmap onto the given canvas.
 *
 * @param canvas  Target canvas element (should be sized to match the minimap)
 * @param points  Array of [x, y] in pixel coordinates (0–1024)
 * @param radius  Radius of each heat point in pixels (default 20)
 * @param canvasScale  Scale factor if the canvas is not 1024×1024 (canvasWidth / 1024)
 */
export function renderHeatmap(
  canvas: HTMLCanvasElement,
  points: [number, number][],
  radius: number = 20,
  canvasScale: number = 1
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.clearRect(0, 0, w, h);

  if (points.length === 0) return;

  // Step 1: Draw grayscale alpha blobs
  // Using a temporary canvas for the alpha map
  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  const alphaCtx = alphaCanvas.getContext("2d")!;

  const scaledRadius = radius * canvasScale;

  for (const [x, y] of points) {
    const sx = x * canvasScale;
    const sy = y * canvasScale;

    const gradient = alphaCtx.createRadialGradient(
      sx, sy, 0,
      sx, sy, scaledRadius
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    alphaCtx.globalCompositeOperation = "lighter";
    alphaCtx.fillStyle = gradient;
    alphaCtx.beginPath();
    alphaCtx.arc(sx, sy, scaledRadius, 0, Math.PI * 2);
    alphaCtx.fill();
  }

  // Step 2: Colorize — map grayscale intensity to heat colors
  const alphaData = alphaCtx.getImageData(0, 0, w, h);
  const colorLUT = buildColorLUT();
  const pixels = alphaData.data;
  const lutPixels = colorLUT.data;

  // Find max intensity to normalize
  let maxIntensity = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > maxIntensity) maxIntensity = pixels[i];
  }

  if (maxIntensity === 0) return;

  for (let i = 0; i < pixels.length; i += 4) {
    const intensity = pixels[i]; // R channel holds the grayscale value
    const normalized = Math.min(255, Math.floor((intensity / maxIntensity) * 255));

    const lutIdx = normalized * 4;
    pixels[i] = lutPixels[lutIdx];       // R
    pixels[i + 1] = lutPixels[lutIdx + 1]; // G
    pixels[i + 2] = lutPixels[lutIdx + 2]; // B
    pixels[i + 3] = lutPixels[lutIdx + 3]; // A
  }

  ctx.putImageData(alphaData, 0, 0);
}
