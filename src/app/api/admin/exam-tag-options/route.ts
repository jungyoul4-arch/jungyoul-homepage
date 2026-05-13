import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { examTagOptions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertExamTagOptionSchema, errorResponse, isUniqueConstraintError } from "@/lib/validation";
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
    if (isUniqueConstraintError(e)) {
      return NextResponse.json(
        { error: "이미 등록된 값입니다." },
        { status: 409 }
      );
    }
    return errorResponse(e);
  }
}
