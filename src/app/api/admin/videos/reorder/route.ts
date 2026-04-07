import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { videos } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { ids } = (await request.json()) as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids 배열이 필요합니다." }, { status: 400 });
    }

    const db = await getDb();

    // ID 존재 검증
    const existing = await db
      .select({ id: videos.id })
      .from(videos)
      .where(inArray(videos.id, ids));
    const existingIds = new Set(existing.map((r) => r.id));
    const validIds = ids.filter((id) => existingIds.has(id));

    for (let i = 0; i < validIds.length; i++) {
      await db.update(videos).set({ sortOrder: i }).where(eq(videos.id, validIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Video reorder error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "순서 저장에 실패했습니다." }, { status: 500 });
  }
}
