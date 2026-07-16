import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80).transform(sanitizeText),
});

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const bookmakers = await prisma.bookmaker.findMany({
    where: { OR: [{ userId: null }, { userId: user.id }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, userId: true },
  });
  return ok(bookmakers);
});

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const { name } = await parseBody(request, createSchema);
  const bookmaker = await prisma.bookmaker.upsert({
    where: { userId_name: { userId: user.id, name } },
    update: {},
    create: { userId: user.id, name },
  });
  return ok(bookmaker, { status: 201 });
});
