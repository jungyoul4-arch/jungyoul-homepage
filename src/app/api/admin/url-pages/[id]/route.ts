import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { urlPages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { updateUrlPageSchema, errorResponse } from "@/lib/validation";
import { getWritableCategorySlugs } from "@/lib/category-rules";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUrlPageSchema.parse(body);
    const db = await getDb();
    // 카테고리 지정 시 nav_menus 기반 허용목록 멤버십 검증("" 미지정은 통과).
    if (parsed.category) {
      const allowed = await getWritableCategorySlugs(db);
      if (!allowed.includes(parsed.category)) {
        return NextResponse.json({ error: "허용되지 않은 카테고리입니다." }, { status: 400 });
      }
    }

    await db
      .update(urlPages)
      .set({
        ...parsed,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(urlPages.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
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
    await db.delete(urlPages).where(eq(urlPages.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
