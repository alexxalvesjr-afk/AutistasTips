import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from "@/lib/auth/tokens";
import type { Role, Session } from "@prisma/client";

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  session: Session;
};

function refreshExpiry(): Date {
  return new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Cria uma sessão nova (login em um dispositivo). */
export async function createSession(
  user: { id: string; role: Role },
  context: { ip?: string | null; userAgent?: string | null },
): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      ip: context.ip?.slice(0, 45),
      userAgent: context.userAgent?.slice(0, 300),
      expiresAt: refreshExpiry(),
    },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.role,
  });

  return { accessToken, refreshToken, session };
}

export type RotationResult =
  | { ok: true; tokens: IssuedTokens }
  | { ok: false; reason: "invalid" | "expired" | "reuse_detected" | "blocked" };

/**
 * Rotaciona o refresh token. Detecção de reuso: se um token já revogado
 * for apresentado, todas as sessões do usuário são revogadas
 * (possível roubo de token — OWASP session hijacking).
 */
export async function rotateSession(
  refreshToken: string,
  context: { ip?: string | null; userAgent?: string | null },
): Promise<RotationResult> {
  const tokenHash = hashToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { user: { select: { id: true, role: true, status: true } } },
  });

  if (!session) return { ok: false, reason: "invalid" };

  if (session.revokedAt) {
    await revokeAllSessions(session.userId);
    await audit("auth.refresh_reuse_detected", {
      userId: session.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { sessionId: session.id },
    });
    return { ok: false, reason: "reuse_detected" };
  }

  if (session.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (session.user.status !== "ACTIVE") return { ok: false, reason: "blocked" };

  const newRefreshToken = generateRefreshToken();
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(newRefreshToken),
      lastUsedAt: new Date(),
      expiresAt: refreshExpiry(),
      ip: context.ip?.slice(0, 45),
    },
  });

  const accessToken = await signAccessToken({
    sub: session.userId,
    sid: session.id,
    role: session.user.role,
  });

  return {
    ok: true,
    tokens: { accessToken, refreshToken: newRefreshToken, session: updated },
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

/** Sessões ativas do usuário (tela de dispositivos conectados). */
export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}
