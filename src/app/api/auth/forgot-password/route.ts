import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/services/auth-service";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const ip = getClientIp(request);
  enforceRateLimit(`forgot:${ip}`, rateLimitRules.forgotPassword);

  const { email } = await parseBody(request, forgotPasswordSchema);
  enforceRateLimit(`forgot:email:${email}`, rateLimitRules.forgotPassword);

  await requestPasswordReset(email, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  // Resposta idêntica exista ou não a conta (anti-enumeração).
  return ok({
    message:
      "Se o e-mail estiver cadastrado, você receberá um link de redefinição.",
  });
});
