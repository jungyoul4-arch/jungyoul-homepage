import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityComments } from "@/db/schema";
import { requireAnonSession } from "@/lib/anon-session";
import { bumpCommentCount } from "@/lib/community-helpers";
import { errorResponse } from "@/lib/validation";

// DELETE — 본인 댓글 soft delete.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAnonSession(request);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const { id } = await params;
    const db = await getDb();
    const rows = await db
      .select({
        sessionId: communityComments.sessionId,
        postId: communityComments.postId,
        isDeleted: communityComments.isDeleted,
      })
      .from(communityComments)
      .where(eq(communityComments.id, id))
      .limit(1);
    if (rows.length === 0 || rows[0].isDeleted) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (rows[0].sessionId !== session.sessionId) {
      return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다." }, { status: 403 });
    }
    await db
      .update(communityComments)
      .set({ isDeleted: true })
      .where(eq(communityComments.id, id));
    await bumpCommentCount(rows[0].postId, -1);
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
