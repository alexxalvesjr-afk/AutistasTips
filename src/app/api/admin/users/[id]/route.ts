import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { revokeAllSessions } from "@/lib/auth/session-service";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";
import { AppError, NotFoundError } from "@/lib/errors";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).transform(sanitizeText).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
  planSlug: z.string().trim().max(40).optional(),
});

async function findTargetUser(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, role: true, status: true },
  });
  if (!user) throw new NotFoundError("Usuário não encontrado.");
  return user;
}

export const PATCH = apiHandler<Context>(async (request, context) => {
  const admin = await requireAdmin();
  enforceRateLimit(`api:${admin.id}`, rateLimitRules.api);

  const { id } = await context.params;
  const target = await findTargetUser(id);
  if (target.id === admin.id) {
    throw new AppError(
      "Use as configurações da conta para alterar seus próprios dados.",
      400,
      "SELF_EDIT",
    );
  }

  const input = await parseBody(request, updateSchema);

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (input.planSlug) {
    const plan = await prisma.plan.findUnique({
      where: { slug: input.planSlug },
    });
    if (!plan) throw new NotFoundError("Plano não encontrado.");
    await prisma.subscription.upsert({
      where: { userId: target.id },
      update: { planId: plan.id, status: "ACTIVE" },
      create: { userId: target.id, planId: plan.id, status: "ACTIVE" },
    });
  }

  // Bloqueio derruba todas as sessões imediatamente.
  if (input.status === "BLOCKED") {
    await revokeAllSessions(target.id);
    await audit("admin.user_blocked", {
      userId: admin.id,
      ip: getClientIp(request),
      metadata: { targetUserId: target.id },
    });
  } else {
    await audit("admin.user_updated", {
      userId: admin.id,
      ip: getClientIp(request),
      metadata: { targetUserId: target.id },
    });
  }

  return ok(updated);
});

export const DELETE = apiHandler<Context>(async (request, context) => {
  const admin = await requireAdmin();
  enforceRateLimit(`api:${admin.id}`, rateLimitRules.api);

  const { id } = await context.params;
  const target = await findTargetUser(id);
  if (target.id === admin.id) {
    throw new AppError("Você não pode excluir a própria conta por aqui.", 400, "SELF_DELETE");
  }

  await audit("admin.user_deleted", {
    userId: admin.id,
    ip: getClientIp(request),
    metadata: { targetUserId: target.id },
  });
  await prisma.user.delete({ where: { id: target.id } });

  return ok({ deleted: true });
});
