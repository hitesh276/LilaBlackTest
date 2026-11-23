import { POIZone, POISummary, PlayerJourney } from "./types";

export const MAP_POIS: Record<string, POIZone[]> = {
  GrandRift: [
    {
      id: "mine_pit",
      name: "Mine Pit",
      bounds: [400, 420, 560, 680],
      color: "#ef4444",
      role: "Central contested pit with high-tier loot",
    },
    {
      id: "maintenance_bay",
      name: "Maintenance Bay",
      bounds: [200, 100, 380, 280],
      color: "#22c55e",
      role: "North vehicle bay & tactical extraction route",
    },
    {
      id: "labour_quarters",
      name: "Labour Quarters",
      bounds: [120, 400, 300, 580],
      color: "#f59e0b",
      role: "West residential barracks & dense building cover",
    },
    {
      id: "engineers_quarters",
      name: "Engineer's Quarters",
      bounds: [740, 480, 910, 680],
      color: "#f59e0b",
      role: "East tech workshops & high supply spawns",
    },
    {
      id: "cave_house",
      name: "Cave House",
      bounds: [300, 300, 480, 420],
      color: "#06b6d4",
      role: "Natural cavern chokepoint connecting North & West",
    },
    {
      id: "gas_station",
      name: "Gas Station",
      bounds: [380, 780, 540, 920],
      color: "#22c55e",
      role: "South perimeter road outpost",
    },
    {
      id: "burnt_zone",
      name: "Burnt Zone",
      bounds: [680, 180, 860, 360],
      color: "#d97706",
      role: "Northeast open scorched plains & sniper sightlines",
    },
    {
      id: "west_pass",
      name: "West Tactical Pass",
      bounds: [300, 440, 380, 530],
      color: "#10b981",
      role: "Narrow ravine pass connecting Labour Quarters and Mine Pit",
    },
    {
      id: "southeast_ridge",
      name: "Southeast Ridge Outpost",
      bounds: [610, 600, 710, 690],
      color: "#10b981",
      role: "Elevated extraction plateau between Mine Pit and Engineer's Quarters",
    },
  ],

  AmbroseValley: [
    {
      id: "greenhouses",
      name: "Greenhouses & Farm",
      bounds: [240, 320, 380, 480],
      color: "#22c55e",
      role: "West enclosed hydroponics & dense looting corridors",
    },
    {
      id: "town_center",
      name: "Town Center & Depot",
      bounds: [460, 480, 640, 620],
      color: "#ef4444",
      role: "Central highway hub & contested urban combat",
    },
    {
      id: "north_industrial",
      name: "North Industrial Plant",
      bounds: [380, 150, 520, 280],
      color: "#f59e0b",
      role: "Heavy manufacturing compound with multi-level vantage points",
    },
    {
      id: "river_crossing",
      name: "River Chokepoint",
      bounds: [340, 420, 460, 580],
      color: "#06b6d4",
      role: "Natural water divide forcing bridge & shallows crossings",
    },
    {
      id: "south_residential",
      name: "South Suburb Outpost",
      bounds: [360, 720, 600, 880],
      color: "#8b5cf6",
      role: "Southern extraction ring & suburban clusters",
    },
    {
      id: "west_compound",
      name: "West Water Compound",
      bounds: [60, 320, 220, 460],
      color: "#0ea5e9",
      role: "Enclosed water filtration facility with perimeter defense & high supply loot",
    },
    {
      id: "southwest_depot",
      name: "Southwest Industrial Depot",
      bounds: [100, 760, 250, 900],
      color: "#f97316",
      role: "Heavy construction yard, vehicle maintenance & southern highway junction",
    },
    {
      id: "west_farmstead",
      name: "West Farmstead & Ranch",
      bounds: [200, 480, 330, 590],
      color: "#84cc16",
      role: "Rustic barns, silos, and rural perimeter outpost west of the river",
    },
    {
      id: "east_lookout",
      name: "East Hilltop Lookout",
      bounds: [560, 360, 650, 450],
      color: "#ec4899",
      role: "Elevated eastern ridge lookout overseeing river approaches",
    },
  ],

  Lockdown: [
    {
      id: "harbour_docks",
      name: "Harbour Docks",
      bounds: [460, 100, 660, 280],
      color: "#06b6d4",
      role: "North shipping cranes & cargo container labyrinth",
    },
    {
      id: "central_facility",
      name: "Central Compound",
      bounds: [440, 460, 700, 660],
      color: "#ef4444",
      role: "High-security administrative hub with courtyard sightlines",
    },
    {
      id: "west_warehouse",
      name: "West Warehouses",
      bounds: [140, 500, 360, 720],
      color: "#f59e0b",
      role: "Industrial freight bays & close-quarters weapon spawns",
    },
    {
      id: "south_coastal",
      name: "South Coastal Perimeter",
      bounds: [300, 740, 520, 900],
      color: "#22c55e",
      role: "Cliffside patrol road & peripheral extraction zone",
    },
    {
      id: "east_quarry",
      name: "East Quarry & Excavation",
      bounds: [700, 360, 840, 540],
      color: "#d97706",
      role: "Heavy excavation pit with earthmovers, cranes, and open sightlines",
    },
    {
      id: "observatory_hill",
      name: "Observatory & Radar Dome",
      bounds: [300, 380, 420, 490],
      color: "#8b5cf6",
      role: "Elevated hilltop radar dish & communications bunker",
    },
    {
      id: "central_depot",
      name: "Central Logistics Depot",
      bounds: [460, 370, 580, 450],
      color: "#0ea5e9",
      role: "Highway fueling depot and cargo staging area west of Central Compound",
    },
    {
      id: "canal_shacks",
      name: "West Canal Shacks",
      bounds: [140, 320, 250, 460],
      color: "#14b8a6",
      role: "Waterfront stilt houses and wooden walkways along western canal",
    },
  ],
};

/**
 * Check if a pixel coordinate is inside a POI's rectangular bounds.
 */
export function isPointInBounds(
  px: number,
  py: number,
  bounds: [number, number, number, number]
): boolean {
  const [minX, minY, maxX, maxY] = bounds;
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

/**
 * Calculate dynamic POI analytics for a given map and set of players.
 */
export function computePOISummaries(
  players: PlayerJourney[],
  mapId: string
): POISummary[] {
  const pois = MAP_POIS[mapId] || [];
  if (pois.length === 0) return [];

  // Count total positions
  let totalPositions = 0;
  for (const p of players) {
    totalPositions += p.positions.length;
  }

  return pois.map((poi) => {
    let trafficCount = 0;
    let kills = 0;
    let deaths = 0;
    let loots = 0;

    for (const p of players) {
      // Check positions inside POI
      for (const pos of p.positions) {
        if (isPointInBounds(pos[0], pos[1], poi.bounds)) {
          trafficCount++;
        }
      }

      // Check events inside POI
      for (const ev of p.events) {
        if (isPointInBounds(ev.x, ev.y, poi.bounds)) {
          if (ev.type === "Kill" || ev.type === "BotKill") {
            kills++;
          } else if (
            ev.type === "Killed" ||
            ev.type === "BotKilled" ||
            ev.type === "KilledByStorm"
          ) {
            deaths++;
          } else if (ev.type === "Loot") {
            loots++;
          }
        }
      }
    }

    const trafficPercent =
      totalPositions > 0
        ? Math.round((trafficCount / totalPositions) * 1000) / 10
        : 0;

    // Determine Threat Level based on combat intensity and dwell time
    let threatLevel: POISummary["threatLevel"] = "Balanced";
    if (trafficPercent < 3.0 && kills === 0 && deaths === 0) {
      threatLevel = "Dead Zone";
    } else if (deaths >= 3 || (deaths + kills > 10 && trafficPercent > 20)) {
      threatLevel = "Hot Contested";
    } else if (loots >= 8 && deaths <= 1) {
      threatLevel = "Safe Farming";
    }

    return {
      id: poi.id,
      name: poi.name,
      role: poi.role,
      color: poi.color,
      trafficCount,
      trafficPercent,
      kills,
      deaths,
      loots,
      threatLevel,
    };
  });
}
