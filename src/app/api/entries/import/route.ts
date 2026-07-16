import {
  apiHandler,
  ok,
  parseBody,
  IMPORT_MAX_BODY_BYTES,
} from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { importSchema } from "@/lib/validations/entries";
import { importEntries } from "@/services/entry-service";
import { audit } from "@/lib/audit";
import { enforceRateLimit, getClientIp, rateLimitRules } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`import:${user.id}`, rateLimitRules.importData);

  const { rows } = await parseBody(request, importSchema, IMPORT_MAX_BODY_BYTES);
  const imported = await importEntries(user.id, rows);

  await audit("entries.imported", {
    userId: user.id,
    ip: getClientIp(request),
    metadata: { imported },
  });

  return ok({ imported }, { status: 201 });
});
