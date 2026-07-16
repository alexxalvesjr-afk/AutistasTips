import { apiHandler, ok } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { getDashboardData } from "@/services/stats-service";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);
  return ok(await getDashboardData(user.id));
});
