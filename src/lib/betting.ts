import type { EntryResult } from "@prisma/client";

/**
 * Regras de liquidação de apostas.
 * Lucro por resultado (stake = valor investido):
 *   WIN       → stake × (odd − 1)
 *   LOSS      → −stake
 *   VOID      → 0
 *   HALF_WIN  → stake × (odd − 1) / 2
 *   HALF_LOSS → −stake / 2
 *   PENDING   → 0 (não liquidada)
 */
export function calculateProfit(
  result: EntryResult,
  odd: number,
  stake: number,
): number {
  switch (result) {
    case "WIN":
      return round2(stake * (odd - 1));
    case "LOSS":
      return round2(-stake);
    case "HALF_WIN":
      return round2((stake * (odd - 1)) / 2);
    case "HALF_LOSS":
      return round2(-stake / 2);
    case "VOID":
    case "PENDING":
      return 0;
  }
}

export function isSettled(result: EntryResult): boolean {
  return result !== "PENDING";
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type SettledSummary = {
  totalEntries: number;
  settledEntries: number;
  pendingEntries: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;
  winRate: number;
  avgStake: number;
  avgOdd: number;
  wins: number;
  losses: number;
  voids: number;
  halfWins: number;
  halfLosses: number;
  maxWinStreak: number;
  maxLossStreak: number;
};

type EntryLike = {
  result: EntryResult;
  odd: number;
  stake: number;
  profit: number;
};

/** Agrega métricas de uma lista de entradas (ordenadas por data). */
export function summarizeEntries(entries: EntryLike[]): SettledSummary {
  const settled = entries.filter((e) => isSettled(e.result));
  const wins = settled.filter((e) => e.result === "WIN").length;
  const halfWins = settled.filter((e) => e.result === "HALF_WIN").length;
  const losses = settled.filter((e) => e.result === "LOSS").length;
  const halfLosses = settled.filter((e) => e.result === "HALF_LOSS").length;
  const voids = settled.filter((e) => e.result === "VOID").length;

  const totalStaked = settled.reduce((acc, e) => acc + e.stake, 0);
  const totalProfit = settled.reduce((acc, e) => acc + e.profit, 0);
  const decisive = wins + halfWins + losses + halfLosses;

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let winStreak = 0;
  let lossStreak = 0;
  for (const entry of settled) {
    if (entry.result === "WIN" || entry.result === "HALF_WIN") {
      winStreak += 1;
      lossStreak = 0;
    } else if (entry.result === "LOSS" || entry.result === "HALF_LOSS") {
      lossStreak += 1;
      winStreak = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, winStreak);
    maxLossStreak = Math.max(maxLossStreak, lossStreak);
  }

  return {
    totalEntries: entries.length,
    settledEntries: settled.length,
    pendingEntries: entries.length - settled.length,
    totalStaked: round2(totalStaked),
    totalProfit: round2(totalProfit),
    roi: totalStaked > 0 ? round2((totalProfit / totalStaked) * 100) : 0,
    winRate: decisive > 0 ? round2(((wins + halfWins) / decisive) * 100) : 0,
    avgStake: settled.length > 0 ? round2(totalStaked / settled.length) : 0,
    avgOdd:
      settled.length > 0
        ? round2(settled.reduce((acc, e) => acc + e.odd, 0) / settled.length)
        : 0,
    wins,
    losses,
    voids,
    halfWins,
    halfLosses,
    maxWinStreak,
    maxLossStreak,
  };
}
