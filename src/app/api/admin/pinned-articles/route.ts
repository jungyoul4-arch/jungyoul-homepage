import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { pinnedArticles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

interface SlotInput {
  slot: number;
  articleId: string;
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { slots } = (await request.json()) as { slots: SlotInput[] };

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "slots 배열이 필요합니다." }, { status: 400 });
    }

    // slot 범위 검증 (1~4)
    for (const s of slots) {
      if (s.slot < 1 || s.slot > 4 || !s.articleId) {
        return NextResponse.json({ error: "slot은 1~4, articleId는 필수입니다." }, { status: 400 });
      }
    }

    // 중복 slot 검증
    const slotsSeen = new Set<number>();
    for (const s of slots) {
      if (slotsSeen.has(s.slot)) {
        return NextResponse.json({ error: "중복된 slot이 있습니다." }, { status: 400 });
      }
      slotsSeen.add(s.slot);
    }

    const db = await getDb();

    // D1은 Drizzle transaction() 미지원 — 순차 실행
    await db.delete(pinnedArticles);
    if (slots.length > 0) {
      await db.insert(pinnedArticles).values(
        slots.map((s) => ({ slot: s.slot, articleId: s.articleId }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Pinned articles error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }
}
