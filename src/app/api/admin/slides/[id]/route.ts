import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { heroSlides, heroSlideItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { items } = body as {
      items: { articleId: string; role: string }[];
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "최소 1개의 슬롯이 필요합니다." },
        { status: 400 },
      );
    }

    if (!items.some((i) => i.role === "main")) {
      return NextResponse.json(
        { error: "메인 슬롯이 필요합니다." },
        { status: 400 },
      );
    }

    const validRoles = ["main", "sub-image", "sub-text"];
    for (const item of items) {
      if (!item.articleId || !validRoles.includes(item.role)) {
        return NextResponse.json(
          { error: "잘못된 슬롯 데이터입니다." },
          { status: 400 },
        );
      }
    }

    const db = await getDb();

    // 기존 아이템 삭제 후 새로 삽입
    await db.delete(heroSlideItems).where(eq(heroSlideItems.slideId, id));

    for (let i = 0; i < items.length; i++) {
      await db.insert(heroSlideItems).values({
        id: crypto.randomUUID(),
        slideId: id,
        articleId: items[i].articleId,
        role: items[i].role,
        sortOrder: i,
      });
    }

    await db
      .update(heroSlides)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(heroSlides.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = await getDb();

    await db.delete(heroSlideItems).where(eq(heroSlideItems.slideId, id));
    await db.delete(heroSlides).where(eq(heroSlides.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
