import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityComments, communityPosts } from "@/db/schema";
import { requireAnonSession } from "@/lib/anon-session";
import { sanitizeContent } from "@/lib/sanitize";
import { bumpCommentCount } from "@/lib/community-helpers";
import { insertCommunityCommentSchema, errorResponse } from "@/lib/validation";

// GET — 평면(flat) 댓글 리스트 (오래된 것부터). soft-deleted 제외.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(communityComments)
    .where(
      and(
        eq(communityComments.postId, id),
        eq(communityComments.isDeleted, false)
      )
    )
    .orderBy(asc(communityComments.createdAt));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      nicknameSnapshot: r.nicknameSnapshot,
      body: r.body,
      createdAt: r.createdAt ?? "",
    }))
  );
}

// POST — 댓글 작성. 익명 세션 필수.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAnonSession(request);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = insertCommunityCommentSchema.parse(body);

    const db = await getDb();
    const post = await db
      .select({ id: communityPosts.id, isDeleted: communityPosts.isDeleted })
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);
    if (post.length === 0 || post[0].isDeleted) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const commentId = crypto.randomUUID();
    await db.insert(communityComments).values({
      id: commentId,
      postId: id,
      sessionId: session.sessionId,
      nicknameSnapshot: session.nickname,
      body: sanitizeContent(parsed.body),
    });
    await bumpCommentCount(id, 1);

    return NextResponse.json({ id: commentId }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
