import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login 은 인증 불필요
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
