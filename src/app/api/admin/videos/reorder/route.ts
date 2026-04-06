import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { ids } = (await request.json()) as { ids: string[] };
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "ids 배열이 필요합니다." }, { status: 400 });
    }

    const db = await getDb();

    for (let i = 0; i < ids.length; i++) {
      await db.update(videos).set({ sortOrder: i }).where(eq(videos.id, ids[i]));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "순서 저장에 실패했습니다." }, { status: 500 });
  }
}
