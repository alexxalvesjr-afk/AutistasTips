import { prisma } from "@/lib/prisma";
import type { EntryFilters } from "@/lib/validations/entries";
import type { Prisma } from "@prisma/client";

/**
 * Acesso a dados de entradas. TODA query é escopada por userId —
 * a proteção contra IDOR acontece nesta camada.
 */

export const entryInclude = {
  sport: { select: { id: true, name: true, icon: true } },
  bookmaker: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.EntryInclude;

export function buildEntryWhere(
  userId: string,
  filters: Partial<EntryFilters>,
): Prisma.EntryWhereInput {
  const where: Prisma.EntryWhereInput = { userId };

  if (filters.dateFrom || filters.dateTo) {
    where.date = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  if (filters.sportId) where.sportId = filters.sportId;
  if (filters.bookmakerId) where.bookmakerId = filters.bookmakerId;
  if (filters.result) where.result = filters.result;
  if (filters.competition) {
    where.competition = { contains: filters.competition, mode: "insensitive" };
  }
  if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };
  if (filters.profitMin !== undefined || filters.profitMax !== undefined) {
    where.profit = {
      ...(filters.profitMin !== undefined ? { gte: filters.profitMin } : {}),
      ...(filters.profitMax !== undefined ? { lte: filters.profitMax } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { game: { contains: filters.search, mode: "insensitive" } },
      { competition: { contains: filters.search, mode: "insensitive" } },
      { market: { contains: filters.search, mode: "insensitive" } },
      { selection: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function findEntries(userId: string, filters: EntryFilters) {
  const where = buildEntryWhere(userId, filters);

  const [total, items] = await prisma.$transaction([
    prisma.entry.count({ where }),
    prisma.entry.findMany({
      where,
      include: entryInclude,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return { total, items };
}

/** Busca escopada — retorna null se a entrada não pertencer ao usuário. */
export async function findEntryById(userId: string, id: string) {
  return prisma.entry.findFirst({
    where: { id, userId },
    include: entryInclude,
  });
}

export async function countEntries(userId: string): Promise<number> {
  return prisma.entry.count({ where: { userId } });
}

/** Todas as entradas do período para agregações (sem paginação). */
export async function findEntriesForStats(
  userId: string,
  filters: Partial<EntryFilters> = {},
) {
  return prisma.entry.findMany({
    where: buildEntryWhere(userId, filters),
    include: entryInclude,
    orderBy: { date: "asc" },
  });
}
