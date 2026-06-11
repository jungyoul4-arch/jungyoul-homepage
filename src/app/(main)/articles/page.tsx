export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticleList } from "@/components/article-list";
import { getDb } from "@/db";
import { articles as articlesTable, htmlPages as htmlPagesTable, urlPages as urlPagesTable } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { toArticle, toHtmlPageCard, toUrlPageCard } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";
import { getArticleCategoryTabs } from "@/lib/category-rules";

export const metadata: Metadata = {
  title: "교육정보",
  description:
    "입시 전략, 교육 칼럼, 합격 스토리 등 정율 교육정보의 모든 콘텐츠를 만나보세요.",
  openGraph: {
    title: "교육정보 | 정율 교육정보",
    description:
      "입시 전략, 교육 칼럼, 합격 스토리 등 정율 교육정보의 모든 콘텐츠를 만나보세요.",
  },
  alternates: {
    canonical: "/articles",
  },
};

export default async function ArticlesPage() {
  const db = await getDb();
  // 카테고리 탭(label+value)은 nav_menus(DB) 주도. allowed 는 "전체"를 뺀 slug 집합(쿼리 필터용).
  const tabs = await getArticleCategoryTabs(db);
  const allowed = tabs.filter((t) => t.value !== "all").map((t) => t.value);

  let query = db
    .select()
    .from(articlesTable)
    .orderBy(desc(articlesTable.date));
  if (allowed.length > 0) {
    query = query.where(inArray(articlesTable.category, allowed)) as typeof query;
  }
  const [raw, rawHtml, rawUrl] = await Promise.all([
    query,
    db
      .select()
      .from(htmlPagesTable)
      .orderBy(desc(htmlPagesTable.date))
      .catch(() => [] as never[]),
    db
      .select()
      .from(urlPagesTable)
      .orderBy(desc(urlPagesTable.date))
      .catch(() => [] as never[]),
  ]);

  // HTML·URL 페이지도 기사와 동일하게 "설정한 카테고리"로 노출. /articles 는 allowed 카테고리만 보여주므로
  // (홈과 달리) 같은 범위로 스코프하고, 레거시 빈 카테고리("html"·"url" 폴백)는 "전체" 탭에서만 노출되도록 함께 통과.
  const allowedSet = new Set([...allowed, "html", "url"]);
  const htmlCards = rawHtml
    .map(toHtmlPageCard)
    .filter((c) => allowed.length === 0 || allowedSet.has(c.category));
  const urlCards = rawUrl
    .map(toUrlPageCard)
    .filter((c) => allowed.length === 0 || allowedSet.has(c.category));

  const articles = [...raw.map(toArticle), ...htmlCards, ...urlCards].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
      {/* CollectionPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "교육정보",
          description:
            "입시 전략, 교육 칼럼, 합격 스토리 등 정율 교육정보의 모든 콘텐츠",
          url: `${SITE_URL}/articles`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: articles.slice(0, 10).map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url:
                a.kind === "html"
                  ? `${SITE_URL}/p/${a.slug}`
                  : a.kind === "url"
                    ? (a.externalUrl ?? `${SITE_URL}/articles`)
                    : `${SITE_URL}/articles/${a.slug}`,
            })),
          },
        })}
      />

      {/* Page Header — 삼성 뉴스룸 "최신기사" 페이지 스타일 */}
      <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-text-primary mt-10 md:mt-20 pb-5 border-b border-border-light mb-10">
        교육정보
      </h1>
      <ArticleList articles={articles} categories={tabs} />
      </div>
    </>
  );
}
