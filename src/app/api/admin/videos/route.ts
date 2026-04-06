import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { videos } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertVideoSchema, errorResponse } from "@/lib/validation";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertVideoSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    // 새 영상은 마지막 순서로 추가
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(videos);

    await db.insert(videos).values({
      id,
      ...parsed,
      sortOrder: maxOrder + 1,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
