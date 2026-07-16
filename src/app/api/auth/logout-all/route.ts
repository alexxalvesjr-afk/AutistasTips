import { apiHandler, ok } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { revokeAllSessions } from "@/lib/auth/session-service";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  await revokeAllSessions(user.id);
  await audit("auth.logout_all", { userId: user.id, ip: getClientIp(request) });
  await clearAuthCookies();
  return ok({ loggedOut: true });
});
