import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).transform(sanitizeText).optional(),
  initialBankroll: z.coerce.number().min(0).max(1_000_000_000).optional(),
  currency: z.enum(["BRL", "USD", "EUR"]).optional(),
  locale: z.enum(["pt-BR", "en-US"]).optional(),
  decimalFormat: z.enum(["comma", "dot"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
});

export const PATCH = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const input = await parseBody(request, updateSchema);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      locale: true,
      decimalFormat: true,
      theme: true,
      initialBankroll: true,
    },
  });

  return ok({ ...updated, initialBankroll: Number(updated.initialBankroll) });
});
