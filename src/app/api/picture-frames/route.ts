import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { pictureFrameItems, siteSettings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

// 공개 — 액자 오버레이가 열릴 때 클라이언트가 호출. 인증 없음.
// items: sortOrder ASC, defaultIntervalSec: 전역 기본 표시 시간(초).
export async function GET() {
  const db = await getDb();

  const items = await db
    .select()
    .from(pictureFrameItems)
    .orderBy(asc(pictureFrameItems.sortOrder));

  let defaultIntervalSec = 7;
  try {
    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "picture_frame_default_interval"))
      .get();
    const parsed = Number(row?.value);
    if (Number.isFinite(parsed) && parsed >= 1) defaultIntervalSec = parsed;
  } catch (e) {
    // 설정 미존재 시 기본 7초 — 단, 예외는 추적 가능하도록 로깅.
    console.error("[picture-frames] settings lookup failed:", e);
  }

  return NextResponse.json({ items, defaultIntervalSec });
}
