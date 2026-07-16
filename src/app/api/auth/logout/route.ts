import { apiHandler, ok } from "@/lib/api-handler";
import { getCurrentUser } from "@/lib/auth/current-user";
import { revokeSession } from "@/lib/auth/session-service";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export const POST = apiHandler(async (request) => {
  const user = await getCurrentUser();
  if (user) {
    await revokeSession(user.sessionId);
    await audit("auth.logout", { userId: user.id, ip: getClientIp(request) });
  }
  await clearAuthCookies();
  return ok({ loggedOut: true });
});
