import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
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
      return NextResponse.json(
        { error: "이미 사용 중인 슬러그입니다. 다른 슬러그를 입력하세요." },
        { status: 409 }
      );
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

    await db.delete(articles).where(eq(articles.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
