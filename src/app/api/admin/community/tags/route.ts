import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { communityTags } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import {
  insertCommunityTagSchema,
  errorResponse,
  isUniqueConstraintError,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertCommunityTagSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(communityTags);

    await db.insert(communityTags).values({
      id,
      value: parsed.value,
      sortOrder: maxOrder + 1,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return NextResponse.json(
        { error: "이미 등록된 태그입니다." },
        { status: 409 }
      );
    }
    return errorResponse(e);
  }
}
