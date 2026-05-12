import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { examTagOptions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertExamTagOptionSchema, errorResponse } from "@/lib/validation";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertExamTagOptionSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(examTagOptions)
      .where(eq(examTagOptions.tagType, parsed.tagType));

    await db.insert(examTagOptions).values({
      id,
      ...parsed,
      sortOrder: maxOrder + 1,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    // Miniflare D1 의 UNIQUE 위반은 Error 인스턴스가 아닐 수 있어 폭넓게 매칭.
    const msg = e instanceof Error ? `${e.message} ${(e.cause as Error | undefined)?.message ?? ""}` : String(e);
    if (msg.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "이미 등록된 값입니다." },
        { status: 409 }
      );
    }
    return errorResponse(e);
  }
}
