# Insights — LILA BLACK Player Journey Analysis

Three data-driven insights discovered using the Player Journey Visualizer.

---

## 1. 🎯 PvP Combat Is Virtually Non-Existent — Players Fight Bots 99.5%+ of the Time

### What caught my eye
Across 5 days and 797 matches, there are only **3 human-vs-human Kill events** out of **2,415 total combat events**. The kill breakdown is:

| Event | Count | % of Combat |
|-------|-------|-------------|
| BotKill (human killed bot) | 2,415 | 99.3% |
| BotKilled (bot killed human) | 700 | — |
| Kill (human killed human) | 3 | 0.12% |
| Killed (human killed by human) | 3 | 0.12% |

### Supporting evidence
- Filtering to Kill/Killed events on any map on any day shows almost zero PvP markers
- The heatmap for "Kills" is entirely BotKill activity
- Humans and bots share similar geographic areas, but PvP encounters almost never produce kills

### Why a Level Designer should care
If PvP is meant to be a core game loop, the maps may not be funneling human players toward each other effectively. Level designers should:
- **Examine chokepoints and loot POIs** — are they creating forced encounters between human players, or are humans looting in isolation?
- **Consider extraction point placement** — extraction is the one moment players converge; if most kills happen vs bots, humans may be extracting without ever meeting
- **Metric to watch**: Human-vs-human encounter rate per match — if the game wants PvP tension, this needs to increase

---

## 2. 🗺️ Ambrose Valley Dominates Playtime — Grand Rift Gets Minimal Attention

### What caught my eye
AmbroseValley captures ~68% of all matches across all 5 days:

| Map | Matches | % of Total | Avg Events/Match |
|-----|---------|------------|------------------|
| AmbroseValley | 567 | 71.1% | ~106 |
| Lockdown | 171 | 21.5% | ~82 |
| GrandRift | 59 | 7.4% | ~96 |

GrandRift has just 7.4% of matches — barely 1 in 14 games lands here.

### Supporting evidence
- The match count per day for GrandRift is consistently low: 24, 13, 9, 5, 8 across the 5 days
- Event density visualized on GrandRift's minimap shows very sparse coverage — large sections of named POIs (Burnt Zone, Engineer's Quarters) have almost no player presence
- Lockdown, despite being a smaller map, sees 3× more play than GrandRift

### Why a Level Designer should care
- **GrandRift may need a redesign or rotation change** — if players are avoiding it, there may be navigation issues, boring terrain, or poor loot distribution
- Use the heatmap on GrandRift to identify **which POIs actually attract players vs. which are dead zones** — areas like Maintenance Bay and Cave House may need stronger loot incentives
- **Metric to track**: Queue opt-in rate per map; GrandRift at 7.4% suggests players actively prefer other maps

---

## 3. ⚡ Storm Deaths Cluster at Map Edges — Players Get Trapped on Peripheral Routes

### What caught my eye
Enabling the "Storm Death" markers (KilledByStorm events) across all Ambrose Valley data shows they cluster near the map edges, particularly:
- The **northwest** and **southwest corners** of Ambrose Valley
- Near the **river corridor** running through the center-south

There are 39 total storm deaths across all days — a small number, but their spatial pattern is consistent.

### Supporting evidence
- Storm deaths never occur near the map center — only at the periphery
- The positions correlate with long movement trails that run along the outer edge of the map, suggesting players who chose peripheral routes got caught
- These players typically have many Position events (long journeys) but few Loot events — they were navigating, not stopping at POIs

### Why a Level Designer should care
- **Peripheral routes lack clear extraction paths** — players who wander to the edges don't have fast enough routes to escape the storm
- Consider **adding visual cues or shortcuts** (ziplines, vehicles, tunnels) at the outer edges to help players rotate inward quickly
- **Storm pacing may need tuning** for specific map quadrants — if the storm pushes from one direction, the opposite edge is naturally a death trap
- **Metric to watch**: Storm death rate per map quadrant; a good map should not systematically punish players who start at one edge
