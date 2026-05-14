import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

// 어드민 모더레이션 — 전체 게시글 리스트(soft-deleted 포함).
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const db = await getDb();
  const rows = await db
    .select()
    .from(communityPosts)
    .orderBy(desc(communityPosts.createdAt))
    .limit(500);

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      nicknameSnapshot: r.nicknameSnapshot,
      title: r.title,
      tag: r.tag ?? "",
      likeCount: r.likeCount ?? 0,
      commentCount: r.commentCount ?? 0,
      isDeleted: r.isDeleted ?? false,
      createdAt: r.createdAt ?? "",
    }))
  );
}
