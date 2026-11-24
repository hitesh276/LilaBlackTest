import { PlayerJourney, PlayerEvent, CombatBreakdown } from "./types";

export interface EventCombatMeta {
  isKill: boolean;
  isDeath: boolean;
  isHuman: boolean;
  userId: string;
  isShared: boolean;
  sharedWith: string[];
  deathCause?: "by_human" | "by_bot" | "storm";
  killerId?: string;
  killerIsHuman?: boolean;
}

export interface ClassifiedCombatData {
  breakdown: CombatBreakdown;
  eventMetaMap: Map<PlayerEvent, EventCombatMeta>;
}

/**
 * Computes deep combat analytics from player journeys:
 * - Kills broken down by Human vs Bot vs Shared/Assists
 * - Deaths broken down by Killed by Human vs Killed by Bot vs Storm
 * - Attaches rich metadata to each event for minimap markers and tooltips
 */
export function analyzeCombat(players: PlayerJourney[]): ClassifiedCombatData {
  interface FlatEvent {
    event: PlayerEvent;
    userId: string;
    isHuman: boolean;
    isKill: boolean;
    isDeath: boolean;
  }

  const allKills: FlatEvent[] = [];
  const allDeaths: FlatEvent[] = [];
  const metaMap = new Map<PlayerEvent, EventCombatMeta>();

  for (const player of players) {
    for (const ev of player.events) {
      const isKill = ev.type === "Kill" || ev.type === "BotKill";
      const isDeath =
        ev.type === "Killed" ||
        ev.type === "BotKilled" ||
        ev.type === "KilledByStorm";

      const flat: FlatEvent = {
        event: ev,
        userId: player.userId,
        isHuman: player.isHuman,
        isKill,
        isDeath,
      };

      if (isKill) allKills.push(flat);
      if (isDeath) allDeaths.push(flat);
    }
  }

  // Sort by timestamp
  allKills.sort((a, b) => a.event.ts - b.event.ts);
  allDeaths.sort((a, b) => a.event.ts - b.event.ts);

  // 1. Detect Shared Kills (kills occurring within 3.5s of another kill event)
  const sharedKillSet = new Set<FlatEvent>();
  const coKillersMap = new Map<FlatEvent, Set<string>>();

  for (let i = 0; i < allKills.length; i++) {
    const k1 = allKills[i];
    for (let j = 0; j < allKills.length; j++) {
      if (i === j) continue;
      const k2 = allKills[j];
      if (Math.abs(k1.event.ts - k2.event.ts) <= 3.5) {
        sharedKillSet.add(k1);
        sharedKillSet.add(k2);

        if (!coKillersMap.has(k1)) coKillersMap.set(k1, new Set());
        coKillersMap.get(k1)!.add(k2.isHuman ? "Human" : `Bot ${k2.userId}`);
      }
    }
  }

  // Populate Kill Metadata
  for (const k of allKills) {
    const isShared = sharedKillSet.has(k);
    const sharedWith = Array.from(coKillersMap.get(k) || []);
    metaMap.set(k.event, {
      isKill: true,
      isDeath: false,
      isHuman: k.isHuman,
      userId: k.userId,
      isShared,
      sharedWith,
    });
  }

  // 2. Correlate Deaths with Killers
  let killedByHuman = 0;
  let killedByBot = 0;
  let killedByStorm = 0;

  const claimedDeathIndices = new Set<number>();
  const deathMetadataList: {
    index: number;
    cause: "by_human" | "by_bot" | "storm";
    killerId: string;
    killerIsHuman: boolean;
    isShared: boolean;
    sharedWith: string[];
  }[] = [];

  // Step 2a: Storm deaths are unambiguous
  for (let i = 0; i < allDeaths.length; i++) {
    const d = allDeaths[i];
    if (d.event.type === "KilledByStorm") {
      killedByStorm++;
      claimedDeathIndices.add(i);
      deathMetadataList.push({
        index: i,
        cause: "storm",
        killerId: "Storm",
        killerIsHuman: false,
        isShared: false,
        sharedWith: [],
      });
    }
  }

  // Step 2b: Match Human Kills to their corresponding victims first
  const humanKillsList = allKills.filter((k) => k.isHuman);
  for (const hk of humanKillsList) {
    let bestIndex: number | null = null;
    let minScore = Infinity;

    for (let i = 0; i < allDeaths.length; i++) {
      if (claimedDeathIndices.has(i)) continue;
      const d = allDeaths[i];
      const dt = Math.abs(hk.event.ts - d.event.ts);
      const dx = hk.event.x - d.event.x;
      const dy = hk.event.y - d.event.y;
      const dist = Math.hypot(dx, dy);

      const score = dt * 2 + dist;
      if (score < minScore) {
        minScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex !== null) {
      claimedDeathIndices.add(bestIndex);
      killedByHuman++;

      const isSharedAssisted = sharedKillSet.has(hk);
      const sharedWith = Array.from(coKillersMap.get(hk) || []);

      deathMetadataList.push({
        index: bestIndex,
        cause: "by_human",
        killerId: hk.userId,
        killerIsHuman: true,
        isShared: isSharedAssisted,
        sharedWith,
      });
    }
  }

  // Step 2c: Match remaining deaths to bot kills
  const botKillsList = allKills.filter((k) => !k.isHuman);
  for (let i = 0; i < allDeaths.length; i++) {
    if (claimedDeathIndices.has(i)) continue;
    const d = allDeaths[i];
    killedByBot++;

    let bestBotKill: FlatEvent | null = null;
    let minScore = Infinity;

    for (const bk of botKillsList) {
      const dt = Math.abs(bk.event.ts - d.event.ts);
      const dx = bk.event.x - d.event.x;
      const dy = bk.event.y - d.event.y;
      const dist = Math.hypot(dx, dy);

      const score = dt * 2 + dist;
      if (score < minScore) {
        minScore = score;
        bestBotKill = bk;
      }
    }

    const isShared = bestBotKill ? sharedKillSet.has(bestBotKill) : false;
    const sharedWith = bestBotKill
      ? Array.from(coKillersMap.get(bestBotKill) || [])
      : [];

    deathMetadataList.push({
      index: i,
      cause: "by_bot",
      killerId: bestBotKill ? bestBotKill.userId : "Bot",
      killerIsHuman: false,
      isShared,
      sharedWith,
    });
  }

  // Apply all death metadata
  for (const item of deathMetadataList) {
    const d = allDeaths[item.index];
    metaMap.set(d.event, {
      isKill: false,
      isDeath: true,
      isHuman: d.isHuman,
      userId: d.userId,
      isShared: item.isShared,
      sharedWith: item.sharedWith,
      deathCause: item.cause,
      killerId: item.killerId,
      killerIsHuman: item.killerIsHuman,
    });
  }

  const humanKills = allKills.filter((k) => k.isHuman).length;
  const botKills = allKills.filter((k) => !k.isHuman).length;
  const humanDeaths = allDeaths.filter((d) => d.isHuman).length;
  const botDeaths = allDeaths.filter((d) => !d.isHuman).length;

  const breakdown: CombatBreakdown = {
    totalKills: allKills.length,
    humanKills,
    botKills,
    sharedKills: sharedKillSet.size,
    totalDeaths: allDeaths.length,
    humanDeaths,
    botDeaths,
    killedByHuman,
    killedByBot,
    killedByStorm,
  };

  return { breakdown, eventMetaMap: metaMap };
}
