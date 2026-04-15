import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles, heroSlides, heroSlideItems } from "@/db/schema";
import { eq, inArray, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateArticleSchema, errorResponse } from "@/lib/validation";
import { generateSlug } from "@/lib/utils";
import { sanitizeContent } from "@/lib/sanitize";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateArticleSchema.parse(body);
    if (parsed.content) parsed.content = sanitizeContent(parsed.content);
    if (parsed.slug === "") {
      parsed.slug = generateSlug(parsed.title || "untitled");
    }
    const db = await getDb();

    await db
      .update(articles)
      .set({
        ...parsed,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(articles.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      const msg = e.message.includes("pinned_order")
        ? "이미 사용 중인 고정 순서입니다. 다른 순서를 선택하세요."
        : "이미 사용 중인 슬러그입니다. 다른 슬러그를 입력하세요.";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return errorResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = await getDb();

    // 방어 1: 이 기사를 참조하는 슬라이드 아이템 조회
    const refs = await db
      .select({
        id: heroSlideItems.id,
        slideId: heroSlideItems.slideId,
        role: heroSlideItems.role,
      })
      .from(heroSlideItems)
      .where(eq(heroSlideItems.articleId, id));

    if (refs.length > 0) {
      // main이 삭제되는 슬라이드 → 슬라이드 자체 삭제
      const mainDeletedSlideIds = refs
        .filter((r) => r.role === "main")
        .map((r) => r.slideId);

      // 참조 아이템 삭제
      await db.delete(heroSlideItems).where(eq(heroSlideItems.articleId, id));

      if (mainDeletedSlideIds.length > 0) {
        // 해당 슬라이드의 나머지 아이템도 삭제
        await db
          .delete(heroSlideItems)
          .where(inArray(heroSlideItems.slideId, mainDeletedSlideIds));
        // 슬라이드 삭제
        await db
          .delete(heroSlides)
          .where(inArray(heroSlides.id, mainDeletedSlideIds));
      }

      // 아이템이 0개가 된 빈 슬라이드 정리
      const emptySlides = await db
        .select({ id: heroSlides.id })
        .from(heroSlides)
        .leftJoin(heroSlideItems, eq(heroSlides.id, heroSlideItems.slideId))
        .where(isNull(heroSlideItems.id));
      if (emptySlides.length > 0) {
        await db
          .delete(heroSlides)
          .where(inArray(heroSlides.id, emptySlides.map((s) => s.id)));
      }
    }

    await db.delete(articles).where(eq(articles.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
