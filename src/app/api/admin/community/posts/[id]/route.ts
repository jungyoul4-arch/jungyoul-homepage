import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/validation";

// 어드민 강제 삭제 — soft delete 통일 (좋아요·댓글 정합성).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = await getDb();
    await db
      .update(communityPosts)
      .set({ isDeleted: true })
      .where(eq(communityPosts.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
