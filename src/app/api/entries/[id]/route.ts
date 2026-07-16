import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { entryUpdateSchema } from "@/lib/validations/entries";
import { deleteEntry, updateEntry } from "@/services/entry-service";
import { enforceRateLimit, rateLimitRules } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";

type Context = { params: Promise<{ id: string }> };

const idSchema = z.string().min(1).max(40);

async function resolveId(context: Context): Promise<string> {
  const { id } = await context.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new ValidationError();
  return parsed.data;
}

export const PATCH = apiHandler<Context>(async (request, context) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const id = await resolveId(context);
  const input = await parseBody(request, entryUpdateSchema);
  return ok(await updateEntry(user.id, id, input));
});

export const DELETE = apiHandler<Context>(async (request, context) => {
  const user = await requireUser();
  enforceRateLimit(`api:${user.id}`, rateLimitRules.api);

  const id = await resolveId(context);
  await deleteEntry(user.id, id);
  return ok({ deleted: true });
});
