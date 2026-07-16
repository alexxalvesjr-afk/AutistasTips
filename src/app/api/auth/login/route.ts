import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { loginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/services/auth-service";
import { setAuthCookies } from "@/lib/auth/cookies";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const ip = getClientIp(request);
  enforceRateLimit(`login:ip:${ip}`, rateLimitRules.login);

  const input = await parseBody(request, loginSchema);
  // Limite adicional por conta-alvo: dificulta força bruta distribuída.
  enforceRateLimit(`login:email:${input.email}`, rateLimitRules.login);

  const { accessToken, refreshToken } = await loginUser(input, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  await setAuthCookies(accessToken, refreshToken);
  return ok({ authenticated: true });
});
