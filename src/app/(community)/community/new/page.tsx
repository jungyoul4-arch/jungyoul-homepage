export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/db";
import { communityTags } from "@/db/schema";
import { CommunityComposer } from "@/components/community/community-composer";
import type { CommunityTag } from "@/components/community/types";

export const metadata: Metadata = {
  title: "글쓰기",
  description: "커뮤니티에 새 글을 작성합니다.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/community/new" },
};

export default async function CommunityNewPage() {
  const db = await getDb();
  const tagRows = await db.select().from(communityTags).orderBy(asc(communityTags.sortOrder));
  const tags: CommunityTag[] = tagRows.map((t) => ({
    id: t.id,
    value: t.value,
    sortOrder: t.sortOrder,
  }));

  return (
    <div className="max-w-[720px] mx-auto px-4 lg:px-10 py-8 lg:py-12">
      <Link
        href="/community"
        className="inline-flex items-center gap-1 text-sm text-community-muted hover:text-text-primary mb-4"
      >
        <ArrowLeft size={16} />
        목록으로
      </Link>
      <h1 className="text-lg lg:text-xl font-bold text-text-primary mb-4">
        새 글 작성
      </h1>
      <CommunityComposer tags={tags} />
    </div>
  );
}
