import {
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { findEntriesForStats } from "@/repositories/entry-repository";
import { isSettled, round2, summarizeEntries } from "@/lib/betting";
import { serializeEntry, type SerializedEntry } from "@/services/entry-service";
import type { EntryFilters } from "@/lib/validations/entries";

async function loadEntries(
  userId: string,
  filters: Partial<EntryFilters> = {},
): Promise<SerializedEntry[]> {
  const entries = await findEntriesForStats(userId, filters);
  return entries.map(serializeEntry);
}

function sumProfit(entries: SerializedEntry[], from: Date, to?: Date): number {
  return round2(
    entries
      .filter((e) => {
        const d = new Date(e.date);
        return isSettled(e.result) && d >= from && (!to || d <= to);
      })
      .reduce((acc, e) => acc + e.profit, 0),
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

// ─── Dashboard ──────────────────────────────────────────────────

export async function getDashboardData(userId: string) {
  const [entries, user] = await Promise.all([
    loadEntries(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { initialBankroll: true },
    }),
  ]);

  const summary = summarizeEntries(entries);
  const now = new Date();
  const initialBankroll = Number(user.initialBankroll);

  // Evolução da banca: lucro acumulado por dia.
  let cumulative = initialBankroll;
  const settledByDay = groupBy(
    entries.filter((e) => isSettled(e.result)),
    (e) => format(new Date(e.date), "yyyy-MM-dd"),
  );
  const evolution = [...settledByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayEntries]) => {
      cumulative = round2(
        cumulative + dayEntries.reduce((acc, e) => acc + e.profit, 0),
      );
      return { date: day, balance: cumulative };
    });

  // Lucro por esporte.
  const bySport = [...groupBy(
    entries.filter((e) => isSettled(e.result)),
    (e) => e.sport?.name ?? "Sem esporte",
  ).entries()]
    .map(([sport, list]) => ({
      sport,
      profit: round2(list.reduce((acc, e) => acc + e.profit, 0)),
      entries: list.length,
    }))
    .sort((a, b) => b.profit - a.profit);

  // ROI por mês (últimos 12 meses com dados).
  const byMonth = [...groupBy(
    entries.filter((e) => isSettled(e.result)),
    (e) => format(new Date(e.date), "yyyy-MM"),
  ).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, list]) => {
      const staked = list.reduce((acc, e) => acc + e.stake, 0);
      const profit = list.reduce((acc, e) => acc + e.profit, 0);
      return {
        month,
        roi: staked > 0 ? round2((profit / staked) * 100) : 0,
        profit: round2(profit),
      };
    });

  // Lucro diário (últimos 30 dias).
  const dailyProfit = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(now, 29 - i);
    return {
      date: format(day, "yyyy-MM-dd"),
      profit: sumProfit(entries, startOfDay(day), endOfDay(day)),
    };
  });

  return {
    cards: {
      totalBalance: round2(initialBankroll + summary.totalProfit),
      totalProfit: summary.totalProfit,
      roi: summary.roi,
      totalEntries: summary.totalEntries,
      pendingEntries: summary.pendingEntries,
      winRate: summary.winRate,
      avgStake: summary.avgStake,
      monthProfit: sumProfit(entries, startOfMonth(now)),
      weekProfit: sumProfit(entries, startOfWeek(now, { weekStartsOn: 1 })),
    },
    charts: { evolution, bySport, byMonth, dailyProfit },
  };
}

// ─── Relatórios ─────────────────────────────────────────────────

export async function getReportsData(
  userId: string,
  filters: Partial<EntryFilters>,
) {
  const entries = await loadEntries(userId, filters);
  const summary = summarizeEntries(entries);
  const settled = entries.filter((e) => isSettled(e.result));
  const now = new Date();

  const periodRow = (label: string, list: SerializedEntry[]) => {
    const s = summarizeEntries(list);
    return {
      label,
      entries: s.settledEntries,
      staked: s.totalStaked,
      profit: s.totalProfit,
      roi: s.roi,
      winRate: s.winRate,
    };
  };

  const byDay = [...groupBy(settled, (e) =>
    format(new Date(e.date), "yyyy-MM-dd"),
  ).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 31)
    .map(([day, list]) => periodRow(day, list));

  const byWeek = [...groupBy(settled, (e) =>
    format(startOfWeek(new Date(e.date), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  ).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 26)
    .map(([week, list]) => periodRow(`Semana de ${week}`, list));

  const byMonth = [...groupBy(settled, (e) =>
    format(new Date(e.date), "yyyy-MM"),
  ).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => periodRow(month, list));

  const byYear = [...groupBy(settled, (e) =>
    format(new Date(e.date), "yyyy"),
  ).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, list]) => periodRow(year, list));

  return {
    summary: {
      ...summary,
      yield: summary.roi, // yield = lucro / total apostado (== ROI)
      yearProfit: sumProfit(entries, startOfYear(now)),
    },
    byDay,
    byWeek,
    byMonth,
    byYear,
  };
}

// ─── Estatísticas ───────────────────────────────────────────────

function bucketize(
  values: { value: number; profit: number }[],
  edges: number[],
  formatLabel: (lo: number, hi: number | null) => string,
) {
  return edges.map((lo, i) => {
    const hi = edges[i + 1] ?? null;
    const inBucket = values.filter(
      (v) => v.value >= lo && (hi === null || v.value < hi),
    );
    return {
      bucket: formatLabel(lo, hi),
      count: inBucket.length,
      profit: round2(inBucket.reduce((acc, v) => acc + v.profit, 0)),
    };
  });
}

export async function getStatsData(
  userId: string,
  filters: Partial<EntryFilters>,
) {
  const entries = await loadEntries(userId, filters);
  const settled = entries.filter((e) => isSettled(e.result));

  const resultDistribution = (
    ["WIN", "HALF_WIN", "VOID", "HALF_LOSS", "LOSS"] as const
  ).map((result) => ({
    result,
    count: settled.filter((e) => e.result === result).length,
  }));

  let cumulative = 0;
  const profitLine = [...groupBy(settled, (e) =>
    format(new Date(e.date), "yyyy-MM-dd"),
  ).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => {
      cumulative = round2(cumulative + list.reduce((a, e) => a + e.profit, 0));
      return { date: day, profit: cumulative };
    });

  const byBookmaker = [...groupBy(settled, (e) =>
    e.bookmaker?.name ?? "Sem casa",
  ).entries()]
    .map(([bookmaker, list]) => ({
      bookmaker,
      profit: round2(list.reduce((acc, e) => acc + e.profit, 0)),
      entries: list.length,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 12);

  // Heatmap: dia da semana × resultado agregado.
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  const heatmap = weekdays.map((weekday) => {
    const list = settled.filter(
      (e) => new Date(e.date).getDay() === weekday,
    );
    return {
      weekday,
      entries: list.length,
      profit: round2(list.reduce((acc, e) => acc + e.profit, 0)),
    };
  });

  // Calendário: resultado líquido por dia (últimos 3 meses).
  const calendar = [...groupBy(settled, (e) =>
    format(new Date(e.date), "yyyy-MM-dd"),
  ).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-92)
    .map(([day, list]) => ({
      date: day,
      profit: round2(list.reduce((acc, e) => acc + e.profit, 0)),
      entries: list.length,
    }));

  const oddsDistribution = bucketize(
    settled.map((e) => ({ value: e.odd, profit: e.profit })),
    [1, 1.5, 2, 2.5, 3, 4, 5, 10],
    (lo, hi) => (hi ? `${lo}–${hi}` : `${lo}+`),
  );

  const maxStake = Math.max(1, ...settled.map((e) => e.stake));
  const step = Math.ceil(maxStake / 6);
  const stakeEdges = Array.from({ length: 6 }, (_, i) => i * step);
  const stakeDistribution = bucketize(
    settled.map((e) => ({ value: e.stake, profit: e.profit })),
    stakeEdges,
    (lo, hi) => (hi ? `${lo}–${hi}` : `${lo}+`),
  );

  return {
    resultDistribution,
    profitLine,
    byBookmaker,
    heatmap,
    calendar,
    oddsDistribution,
    stakeDistribution,
  };
}
