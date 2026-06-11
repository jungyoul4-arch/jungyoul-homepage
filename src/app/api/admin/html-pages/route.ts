import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { htmlPages } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { insertHtmlPageSchema, errorResponse, isUniqueConstraintError } from "@/lib/validation";
import { generateSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const db = await getDb();
    const rows = await db.select().from(htmlPages).orderBy(desc(htmlPages.date));
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
    const parsed = insertHtmlPageSchema.parse(body);
    // content 는 정화하지 않고 verbatim 저장 — /p/{slug} 의 sandbox iframe 이 격리 렌더.
    if (!parsed.slug) parsed.slug = generateSlug(parsed.title);
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(htmlPages).values({
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
