import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPassword } from "@/services/auth-service";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const ip = getClientIp(request);
  enforceRateLimit(`reset:${ip}`, rateLimitRules.resetPassword);

  const { token, password } = await parseBody(request, resetPasswordSchema);
  await resetPassword(token, password, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return ok({ reset: true });
});
