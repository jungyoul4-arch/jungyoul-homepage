export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticleList } from "@/components/article-list";
import { HeroBanner } from "@/components/hero-banner";
import { getDb } from "@/db";
import { articles as articlesTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { toArticle } from "@/lib/mappers";

export const metadata: Metadata = {
  title: "교육정보",
  description:
    "입시 전략, 교육 칼럼, 합격 스토리 등 정율 교육정보의 모든 콘텐츠를 만나보세요.",
  openGraph: {
    title: "교육정보 | 정율 교육정보",
    description:
      "입시 전략, 교육 칼럼, 합격 스토리 등 정율 교육정보의 모든 콘텐츠를 만나보세요.",
    images: [{ url: "/images/hero-articles.jpg", width: 1200, height: 514 }],
  },
  alternates: {
    canonical: "/articles",
  },
};

export default async function ArticlesPage() {
  const db = await getDb();
  const raw = await db.select().from(articlesTable).orderBy(desc(articlesTable.date));
  const articles = raw.map(toArticle);

  return (
    <>
      <HeroBanner src="/images/hero-articles.jpg" alt="정율 교육정보" />
      <div className="max-w-[1280px] mx-auto px-4 py-10">
      {/* CollectionPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "교육정보",
            description:
              "입시 전략, 교육 칼럼, 합격 스토리 등 정율 교육정보의 모든 콘텐츠",
            url: "https://www.jungyoul.net/articles",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: articles.slice(0, 10).map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://www.jungyoul.net/articles/${a.slug}`,
              })),
            },
          }).replace(/</g, "\\u003c"),
        }}
      />

      {/* Page Header — 삼성 뉴스룸 "최신기사" 페이지 스타일 */}
      <h1 className="text-2xl md:text-[32px] font-bold text-gray-900 mb-8">
        교육정보
      </h1>
      <ArticleList articles={articles} />
      </div>
    </>
  );
}
