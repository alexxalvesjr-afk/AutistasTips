import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

const createSchema = z.object({
  name: z.string().trim().min(1).max(40).transform(sanitizeText),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
    .default("#e11d48"),
});

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return ok(tags);
});

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const { name, color } = await parseBody(request, createSchema);
  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId: user.id, name } },
    update: { color },
    create: { userId: user.id, name, color },
  });
  return ok(tag, { status: 201 });
});
