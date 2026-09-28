import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeToken, isTokenExpired } from "./lib/auth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const tokenCookie = request.cookies.get("token")?.value;

  const isAuth = Boolean(tokenCookie && !isTokenExpired(tokenCookie));

  const isProtectedPath = pathname.startsWith("/dashboard");
  const isAuthPath = pathname.startsWith("/auth/login") || pathname.startsWith("/signup");


  if (isProtectedPath && !isAuth) {
    const redirectUrl = new URL("/auth/login", request.url);
    if (pathname !== "/dashboard" || search) {
      redirectUrl.searchParams.set("redirect", pathname + search);
    }
    return NextResponse.redirect(redirectUrl);
  }


  if (isAuthPath && isAuth) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login", "/signup"],
};
