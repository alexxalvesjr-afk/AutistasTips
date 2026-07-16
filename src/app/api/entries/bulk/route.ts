import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { bulkActionSchema } from "@/lib/validations/entries";
import {
  bulkDeleteEntries,
  bulkDuplicateEntries,
} from "@/services/entry-service";
import { audit } from "@/lib/audit";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const { action, ids } = await parseBody(request, bulkActionSchema);

  if (action === "delete") {
    const count = await bulkDeleteEntries(user.id, ids);
    await audit("entries.bulk_deleted", {
      userId: user.id,
      ip: getClientIp(request),
      metadata: { count },
    });
    return ok({ affected: count });
  }

  const count = await bulkDuplicateEntries(user.id, ids);
  return ok({ affected: count });
});
