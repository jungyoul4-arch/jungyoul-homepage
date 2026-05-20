export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticleList } from "@/components/article-list";
import { getDb } from "@/db";
import { articles as articlesTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { toArticle } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "성장스토리",
  description:
    "정율 교육정보 성장스토리 — 학생들의 학습 여정·성취·합격 사례를 정리한 콘텐츠 모음.",
  openGraph: {
    title: "성장스토리 | 정율 교육정보",
    description:
      "정율 교육정보 성장스토리 — 학생들의 학습 여정·성취·합격 사례를 정리한 콘텐츠 모음.",
  },
  alternates: {
    canonical: "/story",
  },
};

export default async function StoryPage() {
  const db = await getDb();
  const raw = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.category, "success"))
    .orderBy(desc(articlesTable.date));
  const articles = raw.map(toArticle);

  return (
    <>
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "성장스토리",
            description:
              "정율 교육정보 성장스토리 — 학생들의 학습 여정·성취·합격 사례를 정리한 콘텐츠 모음.",
            url: "https://www.jungyoul.net/story",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: articles.slice(0, 10).map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://www.jungyoul.net/articles/${a.slug}`,
              })),
            },
          })}
        />

        <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-text-primary mt-10 md:mt-20 pb-5 border-b border-border-light mb-10">
          성장스토리
        </h1>
        <ArticleList articles={articles} hideTabs />
      </div>
    </>
  );
}
