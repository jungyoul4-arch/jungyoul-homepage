import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { pictureFrameItems } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertPictureFrameItemSchema, errorResponse } from "@/lib/validation";
import { sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertPictureFrameItemSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(pictureFrameItems);

    await db.insert(pictureFrameItems).values({
      id,
      ...parsed,
      sortOrder: maxOrder + 1,
    });

    // 첫 항목 추가 시 헤더 '액자' 버튼 노출이 바뀌므로 헤더 캐시 무효화.
    revalidateTag("header-data", "max");
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
