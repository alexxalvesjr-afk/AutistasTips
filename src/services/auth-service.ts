import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateResetToken, hashToken } from "@/lib/auth/tokens";
import {
  createSession,
  revokeAllSessions,
  type IssuedTokens,
} from "@/lib/auth/session-service";
import { sendPasswordResetEmail } from "@/lib/mail";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
} from "@/lib/errors";
import type { RegisterInput, LoginInput } from "@/lib/validations/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 30;

export type RequestContext = { ip?: string | null; userAgent?: string | null };

// Mensagem única para credenciais erradas E conta inexistente —
// impede enumeração de usuários.
const INVALID_CREDENTIALS = "E-mail ou senha incorretos.";

export async function registerUser(
  input: RegisterInput,
  context: RequestContext,
): Promise<IssuedTokens> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("Não foi possível criar a conta com estes dados.");
  }

  const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      ...(freePlan
        ? { subscription: { create: { planId: freePlan.id, status: "ACTIVE" } } }
        : {}),
    },
  });

  await audit("auth.register", { userId: user.id, ...context });
  return createSession(user, context);
}

export async function loginUser(
  input: LoginInput,
  context: RequestContext,
): Promise<IssuedTokens> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || user.deletedAt) {
    // Executa um hash mesmo sem usuário para igualar o tempo de resposta
    // (mitiga timing attack de enumeração).
    await hashPassword(input.password);
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit("auth.login_locked", { userId: user.id, ...context });
    throw new AppError(
      "Conta temporariamente bloqueada por excesso de tentativas. Aguarde alguns minutos.",
      423,
      "ACCOUNT_LOCKED",
    );
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : null,
      },
    });
    await audit("auth.login_failed", { userId: user.id, ...context });
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  if (user.status === "BLOCKED") {
    throw new AppError("Conta bloqueada. Contate o suporte.", 403, "BLOCKED");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await audit("auth.login", { userId: user.id, ...context });
  return createSession(user, context);
}

export async function requestPasswordReset(
  email: string,
  context: RequestContext,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Resposta é sempre a mesma, exista ou não a conta (anti-enumeração).
  if (!user || user.deletedAt || user.status === "BLOCKED") return;

  // Invalida tokens anteriores não usados.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });

  await audit("auth.password_forgot", { userId: user.id, ...context });

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(
  token: string,
  newPassword: string,
  context: RequestContext,
): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, status: true, deletedAt: true } } },
  });

  if (
    !record ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    record.user.deletedAt ||
    record.user.status !== "ACTIVE"
  ) {
    throw new AppError("Link inválido ou expirado.", 400, "INVALID_TOKEN");
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
  ]);

  // Troca de senha invalida todas as sessões existentes.
  await revokeAllSessions(record.userId);
  await audit("auth.password_reset", { userId: record.userId, ...context });
}

export async function changePassword(
  userId: string,
  sessionId: string,
  currentPassword: string,
  newPassword: string,
  context: RequestContext,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Senha atual incorreta.");

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Mantém apenas a sessão atual ativa.
  await revokeAllSessions(userId, sessionId);
  await audit("auth.password_changed", { userId, ...context });
}
