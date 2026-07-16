import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { registerSchema } from "@/lib/validations/auth";
import { registerUser } from "@/services/auth-service";
import { setAuthCookies } from "@/lib/auth/cookies";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const ip = getClientIp(request);
  enforceRateLimit(`register:${ip}`, rateLimitRules.register);

  const input = await parseBody(request, registerSchema);
  const { accessToken, refreshToken } = await registerUser(input, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  await setAuthCookies(accessToken, refreshToken);
  return ok({ registered: true }, { status: 201 });
});
