import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { urlPages } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { insertUrlPageSchema, errorResponse } from "@/lib/validation";
import { getWritableCategorySlugs } from "@/lib/category-rules";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const db = await getDb();
    const rows = await db.select().from(urlPages).orderBy(desc(urlPages.date));
    return NextResponse.json(rows);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertUrlPageSchema.parse(body);
    const db = await getDb();
    // 카테고리 지정 시 nav_menus 기반 허용목록 멤버십 검증("" 미지정은 통과).
    if (parsed.category) {
      const allowed = await getWritableCategorySlugs(db);
      if (!allowed.includes(parsed.category)) {
        return NextResponse.json({ error: "허용되지 않은 카테고리입니다." }, { status: 400 });
      }
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(urlPages).values({
      id,
      ...parsed,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
