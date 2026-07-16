import { z } from "zod";
import { apiHandler, ok, parseQuery } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
});

export const GET = apiHandler(async (request) => {
  const admin = await requireAdmin();
  enforceRateLimit(`api:${admin.id}`, rateLimitRules.api);

  const { page, pageSize, search, status } = parseQuery(request, listSchema);

  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        subscription: {
          select: { status: true, plan: { select: { name: true } } },
        },
        _count: { select: { entries: true } },
      },
    }),
  ]);

  return ok({
    items: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      plan: u.subscription?.plan.name ?? "—",
      planStatus: u.subscription?.status ?? null,
      entriesCount: u._count.entries,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});
