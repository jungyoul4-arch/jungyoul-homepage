import { NextRequest, NextResponse } from "next/server";
import { ensureAnonSession, applySetCookie } from "@/lib/anon-session";

// POST: 익명 세션 발급(쿠키 없으면 신규 생성, 있으면 기존 정보 반환).
export async function POST(request: NextRequest) {
  const { session, setCookie } = await ensureAnonSession(request);
  const res = NextResponse.json({ nickname: session.nickname });
  return applySetCookie(res, setCookie);
}
