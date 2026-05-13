import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAnonSession } from "@/lib/anon-session";
import { getDb } from "@/db";
import { communitySessions } from "@/db/schema";

// GET: 현재 세션의 닉네임 반환. 세션 없으면 null(쿠키 미발급 상태).
export async function GET(request: NextRequest) {
  const session = await getAnonSession(request);
  if (!session) {
    return NextResponse.json({ nickname: null, sessionId: null });
  }
  // lastSeenAt 갱신은 best-effort. 에러는 무시(읽기 응답에 영향 없게).
  try {
    const db = await getDb();
    await db
      .update(communitySessions)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(communitySessions.id, session.sessionId));
  } catch {}
  return NextResponse.json({ nickname: session.nickname, sessionId: session.sessionId });
}
