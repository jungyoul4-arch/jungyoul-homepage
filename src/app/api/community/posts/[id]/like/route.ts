import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts, communityPostLikes } from "@/db/schema";
import { requireAnonSession } from "@/lib/anon-session";
import { bumpLikeCount } from "@/lib/community-helpers";
import { errorResponse } from "@/lib/validation";

// POST /api/community/posts/[id]/like — 토글.
// 응답: { liked: boolean, count: number }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAnonSession(request);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const { id } = await params;
    const db = await getDb();

    // 게시글 존재 확인(soft-deleted 도 좋아요 차단)
    const postRows = await db
      .select({ id: communityPosts.id, isDeleted: communityPosts.isDeleted })
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);
    if (postRows.length === 0 || postRows[0].isDeleted) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(communityPostLikes)
      .where(
        and(
          eq(communityPostLikes.postId, id),
          eq(communityPostLikes.sessionId, session.sessionId)
        )
      )
      .limit(1);

    let liked: boolean;
    if (existing.length > 0) {
      await db.delete(communityPostLikes).where(eq(communityPostLikes.id, existing[0].id));
      await bumpLikeCount(id, -1);
      liked = false;
    } else {
      await db.insert(communityPostLikes).values({
        id: crypto.randomUUID(),
        postId: id,
        sessionId: session.sessionId,
      });
      await bumpLikeCount(id, 1);
      liked = true;
    }

    const updated = await db
      .select({ count: communityPosts.likeCount })
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);

    return NextResponse.json({ liked, count: updated[0]?.count ?? 0 });
  } catch (e) {
    return errorResponse(e);
  }
}

// GET — 현재 세션의 좋아요 여부 + 카운트(상세 페이지에서 사용).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const post = await db
    .select({ count: communityPosts.likeCount })
    .from(communityPosts)
    .where(eq(communityPosts.id, id))
    .limit(1);
  if (post.length === 0) {
    return NextResponse.json({ liked: false, count: 0 });
  }

  const { getAnonSession } = await import("@/lib/anon-session");
  const session = await getAnonSession(request);
  let liked = false;
  if (session) {
    const found = await db
      .select({ id: communityPostLikes.id })
      .from(communityPostLikes)
      .where(
        and(
          eq(communityPostLikes.postId, id),
          eq(communityPostLikes.sessionId, session.sessionId)
        )
      )
      .limit(1);
    liked = found.length > 0;
  }
  return NextResponse.json({ liked, count: post[0].count ?? 0 });
}
