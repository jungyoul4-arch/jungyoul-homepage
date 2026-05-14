import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { examTagOptions } from "@/db/schema";
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
      .select({ id: examTagOptions.id, tagType: examTagOptions.tagType })
      .from(examTagOptions)
      .where(inArray(examTagOptions.id, ids));

    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "일부 항목을 찾을 수 없습니다." }, { status: 400 });
    }

    const types = new Set(existing.map((r) => r.tagType));
    if (types.size > 1) {
      return NextResponse.json(
        { error: "동일한 태그 종류 내에서만 순서를 변경할 수 있습니다." },
        { status: 400 }
      );
    }

    for (let i = 0; i < ids.length; i++) {
      await db.update(examTagOptions).set({ sortOrder: i }).where(eq(examTagOptions.id, ids[i]));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
