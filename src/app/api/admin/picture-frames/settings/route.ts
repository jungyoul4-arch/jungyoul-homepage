import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

const KEY = "picture_frame_default_interval";

// 액자 전역 기본 표시 시간(초). siteSettings 단일 행으로 저장.
// (로고 전용 부수효과가 있는 /api/admin/settings 와 분리)
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const db = await getDb();
  const row = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY)).get();
  const parsed = Number(row?.value);
  const defaultIntervalSec = Number.isFinite(parsed) && parsed >= 1 ? parsed : 7;
  return NextResponse.json({ defaultIntervalSec });
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { defaultIntervalSec } = (await request.json()) as { defaultIntervalSec: number };
    const value = Number(defaultIntervalSec);
    if (!Number.isFinite(value) || value < 1 || value > 3600) {
      return NextResponse.json(
        { error: "기본 표시 시간은 1~3600초 사이여야 합니다." },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db
      .insert(siteSettings)
      .values({ key: KEY, value: String(Math.round(value)), updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: String(Math.round(value)), updatedAt: new Date().toISOString() },
      });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Picture frame settings error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "설정 저장에 실패했습니다." }, { status: 500 });
  }
}
