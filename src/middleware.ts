import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  if (isPublic) return NextResponse.next();
  if (!req.auth && !pathname.startsWith("/_next")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
