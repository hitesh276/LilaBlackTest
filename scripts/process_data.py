"""
ETL Script: Convert LILA BLACK Parquet data → structured JSON for the web tool.

Usage:
    python scripts/process_data.py [--input PATH] [--output PATH]

Defaults:
    --input  c:\\Users\\morih\\Downloads\\player_data\\player_data
    --output public/data
"""

import os
import sys
import json
import argparse
import shutil
from collections import defaultdict

import pyarrow.parquet as pq
import pandas as pd

# ===================== Map Configuration =====================

MAP_CONFIGS = {
    "AmbroseValley": {"scale": 900, "originX": -370, "originZ": -473},
    "GrandRift":     {"scale": 581, "originX": -290, "originZ": -290},
    "Lockdown":      {"scale": 1000, "originX": -500, "originZ": -500},
}

MINIMAP_SIZE = 1024

POSITION_EVENTS = {"Position", "BotPosition"}
COMBAT_KILL_EVENTS = {"Kill", "BotKill"}
COMBAT_DEATH_EVENTS = {"Killed", "BotKilled", "KilledByStorm"}

# ===================== Coordinate Conversion =====================

def world_to_pixel(x: float, z: float, map_id: str) -> tuple:
    """Convert world (x, z) → pixel (px, py) on the 1024×1024 minimap."""
    cfg = MAP_CONFIGS[map_id]
    u = (x - cfg["originX"]) / cfg["scale"]
    v = (z - cfg["originZ"]) / cfg["scale"]
    px = round(u * MINIMAP_SIZE)
    py = round((1 - v) * MINIMAP_SIZE)
    return (px, py)


def is_human(user_id: str) -> bool:
    """Human players have UUID user_ids (contain dashes), bots have numeric IDs."""
    return "-" in str(user_id)


# ===================== Data Loading =====================

def load_day(folder: str) -> pd.DataFrame:
    """Load all Parquet files from a single day folder into one DataFrame."""
    frames = []
    for f in os.listdir(folder):
        filepath = os.path.join(folder, f)
        try:
            table = pq.read_table(filepath)
            df = table.to_pandas()
            frames.append(df)
        except Exception:
            continue

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True)

    # Decode event column from bytes to string
    df["event"] = df["event"].apply(
        lambda x: x.decode("utf-8") if isinstance(x, bytes) else str(x)
    )

    return df


# ===================== Processing =====================

def process_data(input_dir: str, output_dir: str):
    """Main processing pipeline: Parquet → JSON."""

    # Discover day folders
    day_folders = sorted([
        d for d in os.listdir(input_dir)
        if os.path.isdir(os.path.join(input_dir, d)) and d.startswith("February")
    ])

    if not day_folders:
        print(f"ERROR: No February_* folders found in {input_dir}")
        sys.exit(1)

    print(f"Found {len(day_folders)} day folders: {day_folders}")

    # Create output directories
    events_dir = os.path.join(output_dir, "events")
    os.makedirs(events_dir, exist_ok=True)

    # Accumulate all match summaries
    all_summaries = []
    all_maps = set()
    all_dates = set()

    for day in day_folders:
        print(f"\n📅 Processing {day}...")
        folder = os.path.join(input_dir, day)
        df = load_day(folder)

        if df.empty:
            print(f"  ⚠️  No data for {day}")
            continue

        all_dates.add(day)

        # Group by map
        for map_id, map_df in df.groupby("map_id"):
            all_maps.add(map_id)
            print(f"  🗺️  {map_id}: {len(map_df)} rows, {map_df['match_id'].nunique()} matches")

            matches_data = {}

            for match_id, match_df in map_df.groupby("match_id"):
                # Clean match_id (remove .nakama-0 suffix for display)
                clean_match_id = match_id.replace(".nakama-0", "")

                # Compute match time offset
                # Timestamps are stored as datetime — convert to total seconds
                ts_values = match_df["ts"].astype("int64") // 10**6  # ns → ms
                ts_min = ts_values.min()
                ts_max = ts_values.max()
                duration_ms = ts_max - ts_min

                players = []
                human_count = 0
                bot_count = 0
                total_kills = 0
                total_deaths = 0
                total_loots = 0
                total_storm = 0

                for user_id, player_df in match_df.groupby("user_id"):
                    player_is_human = is_human(str(user_id))
                    if player_is_human:
                        human_count += 1
                    else:
                        bot_count += 1

                    # Sort by timestamp
                    player_df = player_df.sort_values("ts")

                    # Build positions array (only Position/BotPosition events)
                    positions = []
                    events_list = []

                    for _, row in player_df.iterrows():
                        event = row["event"]
                        px, py = world_to_pixel(row["x"], row["z"], map_id)

                        # Time offset in seconds from match start
                        row_ts_ms = int(row["ts"].value) // 10**6
                        t_offset = round((row_ts_ms - ts_min) / 1000, 2)

                        if event in POSITION_EVENTS:
                            positions.append([px, py, t_offset])
                        else:
                            events_list.append({
                                "type": event,
                                "x": px,
                                "y": py,
                                "ts": t_offset,
                            })

                            # Count events for summary
                            if event in COMBAT_KILL_EVENTS:
                                total_kills += 1
                            elif event in COMBAT_DEATH_EVENTS:
                                total_deaths += 1
                                if event == "KilledByStorm":
                                    total_storm += 1
                            elif event == "Loot":
                                total_loots += 1

                    player_data = {
                        "userId": str(user_id),
                        "isHuman": player_is_human,
                        "positions": positions,
                        "events": events_list,
                    }
                    players.append(player_data)

                matches_data[clean_match_id] = players

                # Build summary
                all_summaries.append({
                    "matchId": clean_match_id,
                    "map": map_id,
                    "date": day,
                    "humanCount": human_count,
                    "botCount": bot_count,
                    "totalEvents": len(match_df),
                    "kills": total_kills,
                    "deaths": total_deaths,
                    "loots": total_loots,
                    "stormDeaths": total_storm,
                    "durationSeconds": round(duration_ms / 1000, 1),
                })

            # Write events file for this map+date
            output_file = os.path.join(events_dir, f"{map_id}_{day}.json")
            with open(output_file, "w") as f:
                json.dump({"matches": matches_data}, f, separators=(",", ":"))

            file_size = os.path.getsize(output_file)
            print(f"    ✅ Wrote {output_file} ({file_size / 1024:.1f} KB, {len(matches_data)} matches)")

    # Write index file
    index = {
        "maps": sorted(all_maps),
        "dates": sorted(all_dates),
        "matchSummaries": all_summaries,
    }

    index_file = os.path.join(output_dir, "index.json")
    with open(index_file, "w") as f:
        json.dump(index, f, separators=(",", ":"))

    print(f"\n✅ Wrote {index_file}")
    print(f"   Maps: {sorted(all_maps)}")
    print(f"   Dates: {sorted(all_dates)}")
    print(f"   Total matches: {len(all_summaries)}")

    # Copy minimap images
    minimaps_src = os.path.join(input_dir, "minimaps")
    minimaps_dst = os.path.join(os.path.dirname(output_dir), "public", "minimaps")
    if not os.path.exists(minimaps_dst):
        # Minimaps go to public/minimaps (sibling of public/data)
        minimaps_dst = os.path.join(os.path.dirname(output_dir), "minimaps")
    
    if os.path.exists(minimaps_src):
        os.makedirs(minimaps_dst, exist_ok=True)
        for f in os.listdir(minimaps_src):
            src = os.path.join(minimaps_src, f)
            dst = os.path.join(minimaps_dst, f)
            shutil.copy2(src, dst)
            print(f"   📋 Copied {f} → {minimaps_dst}")

    print("\n🎉 ETL complete!")


# ===================== Entry Point =====================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LILA BLACK data ETL")
    parser.add_argument(
        "--input",
        default=r"c:\Users\morih\Downloads\player_data\player_data",
        help="Path to player_data directory",
    )
    parser.add_argument(
        "--output",
        default="public/data",
        help="Output directory for JSON files",
    )
    args = parser.parse_args()

    print(f"📂 Input:  {args.input}")
    print(f"📂 Output: {args.output}")

    process_data(args.input, args.output)
