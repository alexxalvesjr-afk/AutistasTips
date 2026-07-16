import { apiHandler, ok } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { revokeSession } from "@/lib/auth/session-service";
import { NotFoundError } from "@/lib/errors";

type Context = { params: Promise<{ id: string }> };

/** Revoga uma sessão específica do próprio usuário (logout remoto). */
export const DELETE = apiHandler<Context>(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;

  const session = await prisma.session.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!session) throw new NotFoundError("Sessão não encontrada.");

  await revokeSession(session.id);
  return ok({ revoked: true });
});
