import { apiHandler, ok } from "@/lib/api-handler";
import { rotateSession } from "@/lib/auth/session-service";
import {
  clearAuthCookies,
  getRefreshTokenFromCookies,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const ip = getClientIp(request);
  enforceRateLimit(`refresh:${ip}`, rateLimitRules.refresh);

  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) throw new UnauthorizedError("Sessão expirada.");

  const result = await rotateSession(refreshToken, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    await clearAuthCookies();
    throw new UnauthorizedError("Sessão expirada.");
  }

  await setAuthCookies(result.tokens.accessToken, result.tokens.refreshToken);
  return ok({ refreshed: true });
});
