import { PlayerJourney, DwellCluster } from "./types";

/**
 * Detect stationary or camping behavior from player movement journeys.
 *
 * @param players           Array of player journeys
 * @param minDurationSec    Minimum duration in seconds to classify as camping/dwell (default 15s)
 * @param maxRadiusPixels   Maximum radius in 1024x1024 pixel space to consider stationary (default 16px)
 */
export function detectDwellClusters(
  players: PlayerJourney[],
  minDurationSec: number = 15,
  maxRadiusPixels: number = 16
): DwellCluster[] {
  const rawClusters: DwellCluster[] = [];

  for (const player of players) {
    const pos = player.positions;
    if (pos.length < 3) continue;

    let startIdx = 0;

    while (startIdx < pos.length - 2) {
      let endIdx = startIdx + 1;
      let minX = pos[startIdx][0];
      let maxX = pos[startIdx][0];
      let minY = pos[startIdx][1];
      let maxY = pos[startIdx][1];

      while (endIdx < pos.length) {
        const [px, py] = pos[endIdx];
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);

        // Compute bounding box spread
        const spreadX = maxX - minX;
        const spreadY = maxY - minY;
        const dist = Math.sqrt(spreadX * spreadX + spreadY * spreadY);

        if (dist > maxRadiusPixels * 2) {
          // Player moved outside the dwell radius
          break;
        }

        endIdx++;
      }

      // Check if time spent in this bounded circle >= minDurationSec
      const actualEndIdx = endIdx - 1;
      const startTime = pos[startIdx][2];
      const endTime = pos[actualEndIdx][2];
      const duration = endTime - startTime;

      if (duration >= minDurationSec) {
        // Compute center point of the dwell episode
        let sumX = 0;
        let sumY = 0;
        const count = actualEndIdx - startIdx + 1;

        for (let k = startIdx; k <= actualEndIdx; k++) {
          sumX += pos[k][0];
          sumY += pos[k][1];
        }

        rawClusters.push({
          x: Math.round(sumX / count),
          y: Math.round(sumY / count),
          duration: Math.round(duration),
          userId: player.userId,
          isHuman: player.isHuman,
          startTime,
          endTime,
        });

        // Jump forward past this dwell window
        startIdx = actualEndIdx + 1;
      } else {
        startIdx++;
      }
    }
  }

  // Deduplicate / cluster nearby dwell spots within 20px
  const mergedClusters: DwellCluster[] = [];
  const visited = new Set<number>();

  for (let i = 0; i < rawClusters.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const c1 = rawClusters[i];
    let aggX = c1.x;
    let aggY = c1.y;
    let maxDur = c1.duration;
    let isHuman = c1.isHuman;
    let memberCount = 1;

    for (let j = i + 1; j < rawClusters.length; j++) {
      if (visited.has(j)) continue;
      const c2 = rawClusters[j];
      const d = Math.hypot(c1.x - c2.x, c1.y - c2.y);
      if (d <= 20) {
        visited.add(j);
        aggX += c2.x;
        aggY += c2.y;
        maxDur = Math.max(maxDur, c2.duration);
        if (c2.isHuman) isHuman = true;
        memberCount++;
      }
    }

    mergedClusters.push({
      x: Math.round(aggX / memberCount),
      y: Math.round(aggY / memberCount),
      duration: maxDur,
      userId: c1.userId,
      isHuman,
      startTime: c1.startTime,
      endTime: c1.endTime,
    });
  }

  // Sort descending by dwell duration
  return mergedClusters.sort((a, b) => b.duration - a.duration);
}
