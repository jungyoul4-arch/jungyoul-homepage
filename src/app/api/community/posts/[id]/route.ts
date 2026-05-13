import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts } from "@/db/schema";
import { requireAnonSession } from "@/lib/anon-session";
import { errorResponse } from "@/lib/validation";

// GET /api/community/posts/[id] — soft-deleted 면 404.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(communityPosts)
    .where(and(eq(communityPosts.id, id), eq(communityPosts.isDeleted, false)))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    sessionId: r.sessionId,
    nicknameSnapshot: r.nicknameSnapshot,
    title: r.title,
    body: r.body,                              // sanitize-html 적용된 HTML
    imageUrl: r.imageUrl ?? "",
    tag: r.tag ?? "",
    likeCount: r.likeCount ?? 0,
    commentCount: r.commentCount ?? 0,
    createdAt: r.createdAt ?? "",
  });
}

// DELETE — 본인(session_id 일치) 만 soft delete.
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
      .select({ sessionId: communityPosts.sessionId })
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (rows[0].sessionId !== session.sessionId) {
      return NextResponse.json({ error: "본인 게시글만 삭제할 수 있습니다." }, { status: 403 });
    }
    await db
      .update(communityPosts)
      .set({ isDeleted: true })
      .where(eq(communityPosts.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
