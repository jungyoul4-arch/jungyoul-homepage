import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts } from "@/db/schema";

// commentCount / likeCount 의 +1/-1. 트랜잭션 없이 SQL UPDATE.
// 음수 방지(MAX(0, ...)) — soft-delete 직후의 race 방어.
export async function bumpCommentCount(postId: string, delta: 1 | -1) {
  const db = await getDb();
  await db
    .update(communityPosts)
    .set({
      commentCount: sql`MAX(0, COALESCE(${communityPosts.commentCount}, 0) + ${delta})`,
    })
    .where(eq(communityPosts.id, postId));
}

export async function bumpLikeCount(postId: string, delta: 1 | -1) {
  const db = await getDb();
  await db
    .update(communityPosts)
    .set({
      likeCount: sql`MAX(0, COALESCE(${communityPosts.likeCount}, 0) + ${delta})`,
    })
    .where(eq(communityPosts.id, postId));
}
