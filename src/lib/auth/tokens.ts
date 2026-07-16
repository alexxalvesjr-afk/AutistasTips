import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { env } from "@/lib/env";

export type AccessTokenPayload = {
  sub: string; // userId
  sid: string; // sessionId — permite revogação por dispositivo
  role: "USER" | "ADMIN";
};

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({ sid: payload.sid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("autistastips")
    .setAudience("autistastips")
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, {
      issuer: "autistastips",
      audience: "autistastips",
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * Refresh tokens são valores aleatórios opacos (não JWT).
 * Apenas o hash SHA-256 é persistido — vazamento do banco não expõe tokens.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256")
    .update(token + env.JWT_REFRESH_SECRET)
    .digest("hex");
}

/** Token opaco para redefinição de senha. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}
