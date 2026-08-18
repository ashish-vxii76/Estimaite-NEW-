import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  if (isAuthPublic) return NextResponse.next();
  if (pathname === "/" && !req.auth) return NextResponse.next();
  if (!req.auth && !pathname.startsWith("/_next")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-estimaite-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
