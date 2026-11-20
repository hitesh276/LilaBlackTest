# Architecture — LILA BLACK Player Journey Visualizer

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 + React 18 + TypeScript | Static export for zero-server hosting; type safety; component architecture for modular UI |
| **Styling** | Tailwind CSS | Rapid, consistent dark-theme UI; utility classes keep components self-contained |
| **Rendering** | HTML5 Canvas (multi-layered) | Full control over minimap coordinate mapping; no WebGL dependency; lightweight; 4 stacked canvases for independent layer updates |
| **Heatmaps** | Custom Canvas radial-gradient renderer | Zero external dependencies; Gaussian-blurred density maps with auto-normalized color gradient |
| **Data Pipeline** | Python (pandas + pyarrow) → static JSON | Build-time ETL converts 1,243 Parquet files into 15 compact JSON files; frontend fetches only the map+date it needs |
| **Hosting** | Vercel (static export) | Free tier; zero-config Next.js deploy; instant shareable URL; CDN-backed |

## Why This Stack

- **No backend server** — the entire tool is a static site. Parquet files are pre-processed at build time into JSON. This means zero hosting cost, no database, no downtime, and instant loads.
- **Canvas over WebGL/Deck.gl** — with ~89K total data points (not millions), Canvas is more than fast enough. It avoids heavy WebGL dependencies (Deck.gl adds ~5MB), eliminates SSR compatibility issues, and gives full control over coordinate mapping and rendering.
- **Layered Canvas architecture** — four stacked canvases (base image, heatmap, trails, markers) so only the changing layer re-renders during playback. The minimap image layer never re-renders after initial load.

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                   BUILD TIME (once)                       │
│                                                           │
│  1,243 Parquet Files ──→ Python ETL Script                │
│  (February_10..14/)        │                              │
│                            ├─→ index.json (165 KB)        │
│                            │   • map list, date list      │
│                            │   • 797 match summaries      │
│                            │                              │
│                            └─→ 15 event JSON files        │
│                                (~2.5 MB total)            │
│                                per map+date combo         │
│                                                           │
│  Minimap PNGs ──────────→ public/minimaps/ (copied)       │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   RUNTIME (browser)                       │
│                                                           │
│  1. App loads index.json → populates filter dropdowns     │
│  2. User selects Map + Date → fetch that event JSON       │
│  3. User selects Match → filter from loaded data          │
│  4. Canvas renders:                                       │
│     Layer 0: Minimap image (static)                       │
│     Layer 1: Heatmap overlay (density grid)               │
│     Layer 2: Player trails (position paths)               │
│     Layer 3: Event markers (kills/deaths/loot/storm)      │
│  5. Timeline slider → animates Layers 2–3 over time       │
└──────────────────────────────────────────────────────────┘
```

## Coordinate Mapping

This was the trickiest part. Each map has its own world-to-minimap transformation.

**World Coordinates → Minimap Pixels (1024×1024)**:

```
Step 1: Normalize to UV space (0–1)
  u = (world_x - origin_x) / scale
  v = (world_z - origin_z) / scale

Step 2: Convert to pixel space
  pixel_x = u × 1024
  pixel_y = (1 - v) × 1024    ← Y-flip because image origin is top-left
```

The `y` column in the data is elevation (height), not a 2D coordinate — only `x` and `z` are used for minimap placement.

**Per-map parameters:**

| Map | Scale | Origin X | Origin Z |
|-----|-------|----------|----------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

Coordinate conversion is done **at ETL time** (not runtime) — all JSON files store pre-computed pixel coordinates. This avoids repeating the math in the browser and ensures consistency.

## Assumptions

| Area | Assumption | Reasoning |
|------|-----------|-----------|
| Bot detection | UUID user_id = human, numeric = bot | Documented in README; validated by checking BotPosition events only come from numeric IDs |
| Timestamps | `ts` is relative match time, not wall-clock | README states this; we normalize to seconds-from-match-start in the ETL |
| Feb 14 data | Partial day — fewer matches is expected | README notes data collection was ongoing |
| Match ID suffix | `.nakama-0` stripped for display | It's a server instance suffix, not meaningful for level designers |
| Event bytes | Decoded as UTF-8 | README specifies this encoding |

## Major Tradeoffs

| Decision | Alternative Considered | Why This Choice |
|----------|----------------------|-----------------|
| Static JSON over dynamic Parquet loading | Load Parquet directly in browser via parquet-wasm | JSON is simpler, smaller after filtering positions, and doesn't require WASM runtime. 2.5 MB total is trivial. |
| Build-time ETL over runtime API | FastAPI/Express backend that queries Parquet on demand | No server = no cost, no latency, no downtime. 89K rows fits comfortably in static files. |
| Canvas over Deck.gl | Deck.gl with OrthographicView | 89K points doesn't need GPU acceleration. Canvas avoids ~5MB dependency and SSR issues. Full control over game-specific rendering. |
| Multi-canvas layers over single canvas | One canvas redrawn entirely each frame | Layered approach = only dirty layers redraw. Minimap image never redraws after load. |
| Pre-computed pixel coords over runtime conversion | Store raw world coords, convert in browser | Avoids repeated computation; ensures ETL validates all coordinates once. |
| Tailwind over custom CSS | Styled-components, CSS modules | Fastest path to consistent dark-theme UI. No context-switching between files. |
