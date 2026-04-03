import { NextResponse } from "next/server";
import { getLogoutCookieHeader } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", getLogoutCookieHeader());
  return response;
}
