import { prisma } from "@/lib/prisma";
import { getAccessTokenFromCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export type AuthenticatedUser = {
  id: string;
  sessionId: string;
  role: "USER" | "ADMIN";
  email: string;
  name: string;
};

/**
 * Resolve o usuário autenticado a partir do access token.
 * Confere também se a sessão continua válida (revogação imediata)
 * e se a conta está ativa.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    select: {
      revokedAt: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          role: true,
          status: true,
          email: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }
  const { user } = session;
  if (user.status !== "ACTIVE" || user.deletedAt) return null;

  return {
    id: user.id,
    sessionId: payload.sid,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}
