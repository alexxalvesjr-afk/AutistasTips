import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { UnauthorizedError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

const deleteSchema = z.object({
  password: z.string().min(1, "Confirme sua senha").max(128),
});

/**
 * Exclusão de conta: exige a senha atual. Remove definitivamente o
 * usuário e todos os dados relacionados (cascade).
 */
export const DELETE = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`account:${user.id}`, rateLimitRules.changePassword);

  const { password } = await parseBody(request, deleteSchema);
  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const valid = await verifyPassword(password, record.passwordHash);
  if (!valid) throw new UnauthorizedError("Senha incorreta.");

  await audit("account.deleted", {
    userId: user.id,
    ip: getClientIp(request),
  });
  await prisma.user.delete({ where: { id: user.id } });
  await clearAuthCookies();

  return ok({ deleted: true });
});
