import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "bm_access";

const PUBLIC_PAGES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

const PUBLIC_API = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
]);

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defesas de borda:
 *  1. CSRF — requisições mutantes à API devem partir da própria origem
 *     (cookies SameSite=Lax + verificação de Origin/Sec-Fetch-Site).
 *  2. Roteamento — páginas do app exigem cookie de sessão; páginas de
 *     auth redirecionam usuários já logados. A autorização real ocorre
 *     no servidor em cada handler (defesa em profundidade).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (MUTATING_METHODS.has(request.method)) {
      const origin = request.headers.get("origin");
      const secFetchSite = request.headers.get("sec-fetch-site");

      if (origin) {
        const host = request.headers.get("host");
        let originHost: string | null = null;
        try {
          originHost = new URL(origin).host;
        } catch {
          originHost = null;
        }
        if (!originHost || originHost !== host) {
          return NextResponse.json(
            { error: { message: "Origem não autorizada.", code: "CSRF" } },
            { status: 403 },
          );
        }
      } else if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
        return NextResponse.json(
          { error: { message: "Origem não autorizada.", code: "CSRF" } },
          { status: 403 },
        );
      }
    }

    if (!PUBLIC_API.has(pathname)) {
      const hasAccess = request.cookies.has(ACCESS_COOKIE);
      if (!hasAccess) {
        return NextResponse.json(
          { error: { message: "Não autenticado.", code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }
    }
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(ACCESS_COOKIE);

  if (PUBLIC_PAGES.has(pathname)) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSessionCookie ? "/dashboard" : "/login", request.url),
    );
  }

  if (!hasSessionCookie) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)",
  ],
};
