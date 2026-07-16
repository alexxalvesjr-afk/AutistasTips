import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { changePasswordSchema } from "@/lib/validations/auth";
import { changePassword } from "@/services/auth-service";
import { requireUser } from "@/lib/auth/current-user";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`chpass:${user.id}`, rateLimitRules.changePassword);

  const input = await parseBody(request, changePasswordSchema);
  await changePassword(
    user.id,
    user.sessionId,
    input.currentPassword,
    input.newPassword,
    { ip: getClientIp(request), userAgent: request.headers.get("user-agent") },
  );

  return ok({ changed: true });
});
