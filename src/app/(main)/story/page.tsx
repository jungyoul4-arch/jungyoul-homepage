export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticleList } from "@/components/article-list";
import { getDb } from "@/db";
import { articles as articlesTable, htmlPages as htmlPagesTable, urlPages as urlPagesTable } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { toArticle, toHtmlPageCard, toUrlPageCard } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";

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
  const [raw, rawHtml, rawUrl] = await Promise.all([
    db
      .select()
      .from(articlesTable)
      .where(and(eq(articlesTable.category, "growth"), eq(articlesTable.hidden, false)))
      .orderBy(desc(articlesTable.date)),
    db
      .select()
      .from(htmlPagesTable)
      .where(eq(htmlPagesTable.hidden, false))
      .orderBy(desc(htmlPagesTable.date))
      .catch(() => [] as never[]),
    db
      .select()
      .from(urlPagesTable)
      .where(eq(urlPagesTable.hidden, false))
      .orderBy(desc(urlPagesTable.date))
      .catch(() => [] as never[]),
  ]);
  // HTML·URL 페이지도 "성장스토리(growth)" 로 설정한 것만 함께 노출.
  const htmlCards = rawHtml
    .map(toHtmlPageCard)
    .filter((c) => c.category === "growth");
  const urlCards = rawUrl
    .map(toUrlPageCard)
    .filter((c) => c.category === "growth");
  const articles = [...raw.map(toArticle), ...htmlCards, ...urlCards].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

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
            url: `${SITE_URL}/story`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: articles.slice(0, 10).map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url:
                  a.kind === "html"
                    ? `${SITE_URL}/p/${a.slug}`
                    : a.kind === "url"
                      ? (a.externalUrl ?? `${SITE_URL}/story`)
                      : `${SITE_URL}/articles/${a.slug}`,
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
