export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ArticleList } from "@/components/article-list";
import { HeroBanner } from "@/components/hero-banner";
import { getDb } from "@/db";
import { articles as articlesTable, navMenus } from "@/db/schema";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { toArticle } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";
import {
  extractCategorySlugsFromHrefs,
  getDefaultParentBySlug,
} from "@/lib/default-nav";

async function getAllowedCategoriesForArticlesPage(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<string[]> {
  const parents = await db
    .select()
    .from(navMenus)
    .where(and(isNull(navMenus.parentId), eq(navMenus.href, "/articles")))
    .limit(1);

  let hrefs: string[] = [];
  if (parents.length > 0) {
    const rows = await db
      .select()
      .from(navMenus)
      .where(eq(navMenus.parentId, parents[0].id))
      .orderBy(asc(navMenus.sortOrder));
    hrefs = rows.map((r) => r.href);
  }
  if (hrefs.length === 0) {
    const fb = getDefaultParentBySlug("articles");
    hrefs = fb?.children.map((c) => c.href) ?? [];
  }
  return extractCategorySlugsFromHrefs(hrefs);
}

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
  const allowed = await getAllowedCategoriesForArticlesPage(db);

  let query = db
    .select()
    .from(articlesTable)
    .orderBy(desc(articlesTable.date));
  if (allowed.length > 0) {
    query = query.where(inArray(articlesTable.category, allowed)) as typeof query;
  }
  const raw = await query;
  const articles = raw.map(toArticle);

  return (
    <>
      <HeroBanner src="/images/hero-articles.jpg" alt="정율 교육정보" />
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
          url: "https://www.jungyoul.net/articles",
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

      {/* Page Header — 삼성 뉴스룸 "최신기사" 페이지 스타일 */}
      <h1 className="text-[1.5rem] md:text-[1.875rem] font-bold text-[#1A1A1A] mt-10 md:mt-20 pb-5 border-b border-[#E0E0E0] mb-10">
        교육정보
      </h1>
      <ArticleList articles={articles} />
      </div>
    </>
  );
}
