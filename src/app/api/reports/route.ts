import { apiHandler, ok, parseQuery } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { periodFiltersSchema } from "@/lib/validations/period";
import { getReportsData } from "@/services/stats-service";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const filters = parseQuery(request, periodFiltersSchema);
  return ok(await getReportsData(user.id, filters));
});
