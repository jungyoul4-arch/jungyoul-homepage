import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertArticleSchema, errorResponse, isUniqueConstraintError } from "@/lib/validation";
import { getWritableCategorySlugs } from "@/lib/category-rules";
import { generateSlug } from "@/lib/utils";
import { processArticleHtml } from "@/lib/normalize-server";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertArticleSchema.parse(body);
    if (parsed.content) parsed.content = processArticleHtml(parsed.content);
    if (!parsed.slug) parsed.slug = generateSlug(parsed.title);
    const db = await getDb();
    // 카테고리는 nav_menus(DB) 주도 — 허용목록(빌트인 ∪ nav 카테고리) 멤버십 검증.
    const allowed = await getWritableCategorySlugs(db);
    if (!allowed.includes(parsed.category)) {
      return NextResponse.json({ error: "허용되지 않은 카테고리입니다." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(articles).values({
      id,
      ...parsed,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return NextResponse.json(
        { error: "이미 사용 중인 슬러그입니다. 다른 슬러그를 입력하세요." },
        { status: 409 }
      );
    }
    return errorResponse(e);
  }
}
