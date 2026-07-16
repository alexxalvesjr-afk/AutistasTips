import { cookies } from "next/headers";
import { env, isProduction } from "@/lib/env";

export const ACCESS_COOKIE = "bm_access";
export const REFRESH_COOKIE = "bm_refresh";

const baseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    ...baseOptions,
    maxAge: 60 * 15,
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    ...baseOptions,
    // Refresh token só trafega nas rotas de auth — reduz superfície de exposição.
    path: "/api/auth",
    maxAge: 60 * 60 * 24 * env.JWT_REFRESH_TTL_DAYS,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { ...baseOptions, maxAge: 0 });
  store.set(REFRESH_COOKIE, "", {
    ...baseOptions,
    path: "/api/auth",
    maxAge: 0,
  });
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}
