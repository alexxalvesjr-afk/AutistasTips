import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import {
  entryFiltersSchema,
  entryInputSchema,
} from "@/lib/validations/entries";
import { createEntry, listEntries } from "@/services/entry-service";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const filters = parseQuery(request, entryFiltersSchema);
  return ok(await listEntries(user.id, filters));
});

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const input = await parseBody(request, entryInputSchema);
  return ok(await createEntry(user.id, input), { status: 201 });
});
