import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookies } from "./auth";

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "유효하지 않은 인증입니다." }, { status: 401 });
  }
  return null; // 인증 성공
}
