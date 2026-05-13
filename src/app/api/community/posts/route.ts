import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts } from "@/db/schema";
import { requireAnonSession, applySetCookie } from "@/lib/anon-session";
import { sanitizeContent } from "@/lib/sanitize";
import { insertCommunityPostSchema, errorResponse } from "@/lib/validation";
import { encodeCursor, decodeCursor } from "@/lib/community-cursor";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type CommunityPostListItem = {
  id: string;
  nicknameSnapshot: string;
  title: string;
  bodyPreview: string;       // 본문 200자 발췌(태그 제거)
  hasImage: boolean;
  imageUrl: string;
  tag: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// GET /api/community/posts?cursor=&tag=&limit=
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const cursor = decodeCursor(sp.get("cursor"));
  const tag = sp.get("tag");
  const limit = Math.min(
    Math.max(parseInt(sp.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  const db = await getDb();
  const conds = [eq(communityPosts.isDeleted, false)];
  if (tag) conds.push(eq(communityPosts.tag, tag));
  if (cursor) {
    // (createdAt, id) < (cursor.createdAt, cursor.id)
    conds.push(
      or(
        lt(communityPosts.createdAt, cursor.createdAt),
        and(
          eq(communityPosts.createdAt, cursor.createdAt),
          lt(communityPosts.id, cursor.id)
        )
      )!
    );
  }

  const rows = await db
    .select()
    .from(communityPosts)
    .where(and(...conds))
    .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((r): CommunityPostListItem => ({
    id: r.id,
    nicknameSnapshot: r.nicknameSnapshot,
    title: r.title,
    bodyPreview: stripTags(r.body).slice(0, 200),
    hasImage: Boolean(r.imageUrl),
    imageUrl: r.imageUrl ?? "",
    tag: r.tag ?? "",
    likeCount: r.likeCount ?? 0,
    commentCount: r.commentCount ?? 0,
    createdAt: r.createdAt ?? "",
  }));

  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return NextResponse.json({ items, nextCursor });
}

// POST /api/community/posts — 익명 세션 필수.
export async function POST(request: NextRequest) {
  const guard = await requireAnonSession(request);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await request.json();
    const parsed = insertCommunityPostSchema.parse(body);
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(communityPosts).values({
      id,
      sessionId: session.sessionId,
      nicknameSnapshot: session.nickname,
      title: parsed.title,
      body: sanitizeContent(parsed.body),
      imageUrl: parsed.imageUrl ?? "",
      tag: parsed.tag ?? "",
      createdAt: now,
    });

    return applySetCookie(NextResponse.json({ id }, { status: 201 }));
  } catch (e) {
    return errorResponse(e);
  }
}

