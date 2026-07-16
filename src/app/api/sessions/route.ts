import { apiHandler, ok } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { listActiveSessions } from "@/lib/auth/session-service";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const sessions = await listActiveSessions(user.id);
  return ok(
    sessions.map((s) => ({ ...s, current: s.id === user.sessionId })),
  );
});
