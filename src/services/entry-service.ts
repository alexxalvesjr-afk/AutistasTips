import { prisma } from "@/lib/prisma";
import { calculateProfit, isSettled } from "@/lib/betting";
import {
  entryInclude,
  findEntries,
  findEntryById,
  countEntries,
} from "@/repositories/entry-repository";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type {
  EntryFilters,
  EntryInput,
  EntryUpdateInput,
} from "@/lib/validations/entries";
import type { EntryResult, Prisma } from "@prisma/client";

type EntryWithRelations = Prisma.EntryGetPayload<{ include: typeof entryInclude }>;

/** Converte Decimals do Prisma em números para serialização JSON. */
export function serializeEntry(entry: EntryWithRelations) {
  return {
    id: entry.id,
    date: entry.date.toISOString(),
    sport: entry.sport,
    bookmaker: entry.bookmaker,
    competition: entry.competition,
    game: entry.game,
    market: entry.market,
    selection: entry.selection,
    odd: Number(entry.odd),
    stake: Number(entry.stake),
    result: entry.result,
    status: entry.status,
    profit: Number(entry.profit),
    notes: entry.notes,
    tags: entry.tags.map((t) => t.tag),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export type SerializedEntry = ReturnType<typeof serializeEntry>;

/** Confere se os relacionamentos referenciados pertencem ao usuário (anti-IDOR). */
async function assertOwnedRelations(
  userId: string,
  input: { bookmakerId?: string | null; sportId?: string | null; tagIds?: string[] },
): Promise<void> {
  if (input.sportId) {
    const sport = await prisma.sport.findFirst({
      where: { id: input.sportId, OR: [{ userId }, { userId: null }] },
      select: { id: true },
    });
    if (!sport) throw new ForbiddenError("Esporte inválido.");
  }
  if (input.bookmakerId) {
    const bookmaker = await prisma.bookmaker.findFirst({
      where: { id: input.bookmakerId, OR: [{ userId }, { userId: null }] },
      select: { id: true },
    });
    if (!bookmaker) throw new ForbiddenError("Casa de aposta inválida.");
  }
  if (input.tagIds?.length) {
    const owned = await prisma.tag.count({
      where: { id: { in: input.tagIds }, userId },
    });
    if (owned !== input.tagIds.length) {
      throw new ForbiddenError("Tag inválida.");
    }
  }
}

async function assertPlanLimit(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: { select: { maxEntries: true } } },
  });
  const maxEntries = subscription?.plan.maxEntries;
  if (maxEntries == null) return;

  const current = await countEntries(userId);
  if (current >= maxEntries) {
    throw new AppError(
      `Limite de ${maxEntries} entradas do seu plano atingido.`,
      403,
      "PLAN_LIMIT",
    );
  }
}

function settlementData(result: EntryResult, odd: number, stake: number) {
  return {
    profit: calculateProfit(result, odd, stake),
    status: isSettled(result) ? ("SETTLED" as const) : ("OPEN" as const),
  };
}

export async function listEntries(userId: string, filters: EntryFilters) {
  const { total, items } = await findEntries(userId, filters);
  return {
    items: items.map(serializeEntry),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  };
}

export async function createEntry(userId: string, input: EntryInput) {
  await assertPlanLimit(userId);
  await assertOwnedRelations(userId, input);

  const entry = await prisma.entry.create({
    data: {
      userId,
      date: input.date,
      bookmakerId: input.bookmakerId ?? null,
      sportId: input.sportId ?? null,
      competition: input.competition ?? null,
      game: input.game,
      market: input.market ?? null,
      selection: input.selection ?? null,
      odd: input.odd,
      stake: input.stake,
      result: input.result,
      notes: input.notes ?? null,
      ...settlementData(input.result, input.odd, input.stake),
      ...(input.tagIds?.length
        ? { tags: { create: input.tagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
    include: entryInclude,
  });

  return serializeEntry(entry);
}

export async function updateEntry(
  userId: string,
  entryId: string,
  input: EntryUpdateInput,
) {
  const existing = await findEntryById(userId, entryId);
  if (!existing) throw new NotFoundError("Entrada não encontrada.");

  await assertOwnedRelations(userId, input);

  const odd = input.odd ?? Number(existing.odd);
  const stake = input.stake ?? Number(existing.stake);
  const result = input.result ?? existing.result;

  const entry = await prisma.entry.update({
    where: { id: existing.id },
    data: {
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.bookmakerId !== undefined
        ? { bookmakerId: input.bookmakerId }
        : {}),
      ...(input.sportId !== undefined ? { sportId: input.sportId } : {}),
      ...(input.competition !== undefined
        ? { competition: input.competition }
        : {}),
      ...(input.game !== undefined ? { game: input.game } : {}),
      ...(input.market !== undefined ? { market: input.market } : {}),
      ...(input.selection !== undefined ? { selection: input.selection } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      odd,
      stake,
      result,
      ...settlementData(result, odd, stake),
      ...(input.tagIds !== undefined
        ? {
            tags: {
              deleteMany: {},
              create: input.tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: entryInclude,
  });

  return serializeEntry(entry);
}

export async function deleteEntry(userId: string, entryId: string) {
  const existing = await findEntryById(userId, entryId);
  if (!existing) throw new NotFoundError("Entrada não encontrada.");
  await prisma.entry.delete({ where: { id: existing.id } });
}

export async function bulkDeleteEntries(userId: string, ids: string[]) {
  // deleteMany escopado por userId ignora IDs de terceiros silenciosamente.
  const result = await prisma.entry.deleteMany({
    where: { id: { in: ids }, userId },
  });
  return result.count;
}

export async function bulkDuplicateEntries(userId: string, ids: string[]) {
  const entries = await prisma.entry.findMany({
    where: { id: { in: ids }, userId },
    include: { tags: true },
  });

  let created = 0;
  for (const entry of entries) {
    await prisma.entry.create({
      data: {
        userId,
        date: entry.date,
        bookmakerId: entry.bookmakerId,
        sportId: entry.sportId,
        competition: entry.competition,
        game: entry.game,
        market: entry.market,
        selection: entry.selection,
        odd: entry.odd,
        stake: entry.stake,
        result: "PENDING",
        status: "OPEN",
        profit: 0,
        notes: entry.notes,
        tags: { create: entry.tags.map((t) => ({ tagId: t.tagId })) },
      },
    });
    created += 1;
  }
  return created;
}

export async function duplicateEntry(userId: string, entryId: string) {
  const count = await bulkDuplicateEntries(userId, [entryId]);
  if (count === 0) throw new NotFoundError("Entrada não encontrada.");
}

type ImportRow = EntryInput & {
  sportName?: string | null;
  bookmakerName?: string | null;
};

/** Importa linhas resolvendo esportes/casas por nome (cria as do usuário). */
export async function importEntries(userId: string, rows: ImportRow[]) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: { select: { maxEntries: true } } },
  });
  const maxEntries = subscription?.plan.maxEntries;
  if (maxEntries != null) {
    const current = await countEntries(userId);
    if (current + rows.length > maxEntries) {
      throw new AppError(
        `Importação excede o limite de ${maxEntries} entradas do seu plano.`,
        403,
        "PLAN_LIMIT",
      );
    }
  }

  const sportCache = new Map<string, string>();
  const bookmakerCache = new Map<string, string>();

  async function resolveSport(name: string): Promise<string> {
    const key = name.toLowerCase();
    const cached = sportCache.get(key);
    if (cached) return cached;
    let sport = await prisma.sport.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        OR: [{ userId }, { userId: null }],
      },
    });
    sport ??= await prisma.sport.create({ data: { name, userId } });
    sportCache.set(key, sport.id);
    return sport.id;
  }

  async function resolveBookmaker(name: string): Promise<string> {
    const key = name.toLowerCase();
    const cached = bookmakerCache.get(key);
    if (cached) return cached;
    let bookmaker = await prisma.bookmaker.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        OR: [{ userId }, { userId: null }],
      },
    });
    bookmaker ??= await prisma.bookmaker.create({ data: { name, userId } });
    bookmakerCache.set(key, bookmaker.id);
    return bookmaker.id;
  }

  let imported = 0;
  for (const row of rows) {
    const sportId = row.sportName ? await resolveSport(row.sportName) : null;
    const bookmakerId = row.bookmakerName
      ? await resolveBookmaker(row.bookmakerName)
      : null;

    await prisma.entry.create({
      data: {
        userId,
        date: row.date,
        sportId,
        bookmakerId,
        competition: row.competition ?? null,
        game: row.game,
        market: row.market ?? null,
        selection: row.selection ?? null,
        odd: row.odd,
        stake: row.stake,
        result: row.result,
        notes: row.notes ?? null,
        ...settlementData(row.result, row.odd, row.stake),
      },
    });
    imported += 1;
  }
  return imported;
}
