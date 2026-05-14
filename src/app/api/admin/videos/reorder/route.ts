import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { videos } from "@/db/schema";
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
      .select({ id: videos.id })
      .from(videos)
      .where(inArray(videos.id, ids));
    const existingIds = new Set(existing.map((r) => r.id));
    const validIds = ids.filter((id) => existingIds.has(id));

    for (let i = 0; i < validIds.length; i++) {
      await db.update(videos).set({ sortOrder: i }).where(eq(videos.id, validIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
