export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts, communityTags } from "@/db/schema";
import { renderJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";
import { encodeCursor } from "@/lib/community-cursor";
import { CommunityFeed } from "@/components/community/community-feed";
import { CommunityTagFilter } from "@/components/community/community-tag-filter";
import type {
  CommunityFeedPage,
  CommunityPostListItem,
  CommunityTag,
} from "@/components/community/types";

const PAGE_SIZE = 20;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export const metadata: Metadata = {
  title: "커뮤니티",
  description:
    "고등학생 익명 커뮤니티 — 수능·내신·진로·고민을 자유롭게 나누는 공간. 닉네임 자동 부여, 가입 절차 없음.",
  openGraph: {
    title: "커뮤니티 | 정율 교육정보",
    description: "고등학생 익명 커뮤니티. 자유롭게 글·댓글·좋아요로 소통하세요.",
  },
  alternates: { canonical: "/community" },
};

type SearchParams = { tag?: string };

export default async function CommunityIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tag = sp.tag ?? "";

  const db = await getDb();
  const conds = [eq(communityPosts.isDeleted, false)];
  if (tag) conds.push(eq(communityPosts.tag, tag));

  const [rows, tagRows] = await Promise.all([
    db
      .select()
      .from(communityPosts)
      .where(and(...conds))
      .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
      .limit(PAGE_SIZE + 1),
    db.select().from(communityTags).orderBy(asc(communityTags.sortOrder)),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const items: CommunityPostListItem[] = rows.slice(0, PAGE_SIZE).map((r) => ({
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
  const initial: CommunityFeedPage = { items, nextCursor };

  const tags: CommunityTag[] = tagRows.map((t) => ({
    id: t.id,
    value: t.value,
    sortOrder: t.sortOrder,
  }));

  return (
    <div className="max-w-[1080px] mx-auto px-4 lg:px-10 py-8 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "커뮤니티",
          description: "고등학생 익명 커뮤니티",
          url: `${SITE_URL}/community`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.slice(0, 10).map((it, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/community/${it.id}`,
            })),
          },
        })}
      />

      <h1 className="sr-only">커뮤니티</h1>

      <div className="flex flex-col lg:flex-row lg:gap-6">
        <CommunityTagFilter tags={tags} />
        <div className="flex-1 min-w-0">
          <CommunityFeed initial={initial} initialTag={tag} />
        </div>
      </div>
    </div>
  );
}
