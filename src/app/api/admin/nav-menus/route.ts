import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { navMenus } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { insertNavMenuSchema, errorResponse } from "@/lib/validation";
import { sql, eq, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = insertNavMenuSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();

    // parentId 기준으로 형제 항목 내 최대 sortOrder 계산
    const parentIdVal = parsed.parentId ?? null;
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(navMenus)
      .where(
        parentIdVal === null
          ? isNull(navMenus.parentId)
          : eq(navMenus.parentId, parentIdVal)
      );

    await db.insert(navMenus).values({
      id,
      ...parsed,
      sortOrder: maxOrder + 1,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
