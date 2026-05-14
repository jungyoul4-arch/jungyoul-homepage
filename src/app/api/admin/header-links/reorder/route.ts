import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { headerLinks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { parseReorderIds, errorResponse } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const parsed = await parseReorderIds(request);
    if (parsed instanceof NextResponse) return parsed;
    const { ids } = parsed;

    const db = await getDb();

    const existing = await db
      .select({ id: headerLinks.id })
      .from(headerLinks)
      .where(inArray(headerLinks.id, ids));

    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "일부 항목을 찾을 수 없습니다." }, { status: 400 });
    }

    for (let i = 0; i < ids.length; i++) {
      await db.update(headerLinks).set({ sortOrder: i }).where(eq(headerLinks.id, ids[i]));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
