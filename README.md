# LILA BLACK — Player Journey Visualizer

A web-based visualization tool for Level Designers to explore player movement, combat, and behavior on LILA BLACK maps.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)

## 🚀 Live Demo

**[→ Open the tool](YOUR_DEPLOYED_URL_HERE)**

## Features

- **Interactive Minimap** — player trails rendered on actual game minimaps with correct coordinate mapping
- **Human vs Bot distinction** — cyan solid trails for humans, gray dashed for bots
- **Event markers** — kills (crosshair), deaths (X), loot (diamond), storm deaths (lightning) with distinct colors
- **Filtering** — by map (3 maps), date (5 days), and individual match (797 matches)
- **Match playback** — timeline slider to watch a match unfold over time with animated trails
- **Heatmap overlays** — toggle between traffic density, kill zones, death zones, loot distribution
- **Zoom & Pan** — scroll to zoom, drag to pan, double-click to reset
- **Tooltips** — hover over event markers for details

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + React 18 + TypeScript |
| Styling | Tailwind CSS (dark theme) |
| Rendering | HTML5 Canvas (4 layered canvases) |
| Data Pipeline | Python ETL (pandas + pyarrow) |
| Hosting | Vercel (static export) |

## Project Structure

```
├── public/
│   ├── data/              ← Generated JSON (from ETL)
│   │   ├── index.json     ← Match metadata for dropdowns
│   │   └── events/        ← Per map+date event files
│   └── minimaps/          ← Game minimap images (1024×1024)
├── scripts/
│   └── process_data.py    ← ETL: Parquet → JSON
├── src/
│   ├── app/               ← Next.js app router
│   ├── components/        ← React components
│   │   ├── MapViewer.tsx   ← Canvas-based map renderer
│   │   ├── FilterPanel.tsx ← Map/Date/Match filters
│   │   ├── LayerControls.tsx
│   │   ├── Timeline.tsx    ← Match playback
│   │   ├── Legend.tsx
│   │   └── StatsPanel.tsx
│   └── lib/               ← Types, config, utilities
├── ARCHITECTURE.md         ← System design & decisions
├── INSIGHTS.md             ← 3 data-driven insights
└── README.md               ← This file
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.8+ with `pyarrow` and `pandas`

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd lila-player-journey-viz

# Install JS dependencies
npm install

# Install Python dependencies (for ETL)
pip install pyarrow pandas
```

### Data Processing (ETL)

The raw Parquet data needs to be converted to JSON before the app can use it.

```bash
# Default: reads from c:\Users\morih\Downloads\player_data\player_data
python scripts/process_data.py

# Custom input path:
python scripts/process_data.py --input /path/to/player_data --output public/data
```

This generates:
- `public/data/index.json` — match metadata
- `public/data/events/*.json` — event data per map+date
- `public/minimaps/` — minimap images (copied from source)

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Production Build

```bash
npm run build
# Static output in /out directory — deploy anywhere
```

### Deploy to Vercel

```bash
npx vercel --prod
```

## Environment Variables

None required. The app is fully static — all data is bundled at build time.

## Coordinate System

World coordinates (x, z) are mapped to 1024×1024 minimap pixel coordinates using per-map scale and origin values. The `y` coordinate represents elevation and is not used for 2D rendering. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full coordinate mapping explanation.
