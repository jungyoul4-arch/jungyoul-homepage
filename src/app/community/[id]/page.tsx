export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/db";
import { communityPosts } from "@/db/schema";
import { renderJsonLd } from "@/lib/json-ld";
import { CommunityPostDetail } from "@/components/community/community-post-detail";
import { CommunityComments } from "@/components/community/community-comments";

type Props = { params: Promise<{ id: string }> };

async function fetchPost(id: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(communityPosts)
    .where(and(eq(communityPosts.id, id), eq(communityPosts.isDeleted, false)))
    .limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await fetchPost(id);
  if (!row) return { title: "커뮤니티 게시글" };
  const titleText = row.title.length > 60 ? `${row.title.slice(0, 60)}…` : row.title;
  return {
    title: titleText,
    description: row.body.replace(/<[^>]+>/g, "").slice(0, 150),
    robots: { index: false, follow: true },
    alternates: { canonical: `/community/${id}` },
  };
}

export default async function CommunityPostPage({ params }: Props) {
  const { id } = await params;
  const row = await fetchPost(id);
  if (!row) notFound();

  return (
    <div className="max-w-[720px] mx-auto px-4 lg:px-10 py-8 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd({
          "@context": "https://schema.org",
          "@type": "DiscussionForumPosting",
          headline: row.title,
          author: { "@type": "Person", name: row.nicknameSnapshot },
          datePublished: row.createdAt,
          interactionStatistic: [
            {
              "@type": "InteractionCounter",
              interactionType: { "@type": "LikeAction" },
              userInteractionCount: row.likeCount ?? 0,
            },
            {
              "@type": "InteractionCounter",
              interactionType: { "@type": "CommentAction" },
              userInteractionCount: row.commentCount ?? 0,
            },
          ],
        })}
      />

      <Link
        href="/community"
        className="inline-flex items-center gap-1 text-sm text-community-muted hover:text-text-primary mb-4"
      >
        <ArrowLeft size={16} />
        목록으로
      </Link>

      <CommunityPostDetail
        post={{
          id: row.id,
          sessionId: row.sessionId,
          nicknameSnapshot: row.nicknameSnapshot,
          title: row.title,
          body: row.body,
          imageUrl: row.imageUrl ?? "",
          tag: row.tag ?? "",
          likeCount: row.likeCount ?? 0,
          commentCount: row.commentCount ?? 0,
          createdAt: row.createdAt ?? "",
        }}
      />
      <CommunityComments postId={row.id} />
    </div>
  );
}
