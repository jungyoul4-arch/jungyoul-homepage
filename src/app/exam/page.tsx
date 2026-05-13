export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ExamArticleFilter } from "@/components/exam-article-filter";
import { HeroBanner } from "@/components/hero-banner";
import { getDb } from "@/db";
import { articles as articlesTable, examTagOptions as examTagOptionsTable } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { toArticle } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";
import type { ExamTagOption } from "@/lib/data";

export const metadata: Metadata = {
  title: "시험지 분석",
  description:
    "정율사관 시험지 분석 — 모의고사·내신 기출 분석과 풀이 전략을 정리한 콘텐츠 모음.",
  openGraph: {
    title: "시험지 분석 | 정율 교육정보",
    description:
      "정율사관 시험지 분석 — 모의고사·내신 기출 분석과 풀이 전략을 정리한 콘텐츠 모음.",
    images: [{ url: "/images/hero-articles.jpg", width: 1200, height: 514 }],
  },
  alternates: {
    canonical: "/exam",
  },
};

// exam_tag_options 테이블이 아직 D1 에 마이그레이션되지 않은 환경에서도
// /exam 페이지가 500 으로 죽지 않도록 방어 (마이그레이션 0007 부재 시 빈 배열).
async function safeExamTagOptions(db: Awaited<ReturnType<typeof getDb>>) {
  try {
    return await db
      .select()
      .from(examTagOptionsTable)
      .orderBy(asc(examTagOptionsTable.sortOrder));
  } catch {
    return [] as Array<{
      id: string;
      tagType: string;
      value: string;
      sortOrder: number | null;
    }>;
  }
}

export default async function ExamPage() {
  const db = await getDb();
  const [raw, rawTagOptions] = await Promise.all([
    db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.category, "exam"))
      .orderBy(desc(articlesTable.date)),
    safeExamTagOptions(db),
  ]);
  const articles = raw.map(toArticle);
  const tagOptions: ExamTagOption[] = rawTagOptions.map((row) => ({
    id: row.id,
    tagType: row.tagType as ExamTagOption["tagType"],
    value: row.value,
    sortOrder: row.sortOrder ?? 0,
  }));

  return (
    <>
      <HeroBanner src="/images/hero-articles.jpg" alt="시험지 분석" />
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "시험지 분석",
            description:
              "정율사관 시험지 분석 — 모의고사·내신 기출 분석과 풀이 전략을 정리한 콘텐츠 모음.",
            url: "https://www.jungyoul.net/exam",
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
          시험지 분석
        </h1>
        <ExamArticleFilter articles={articles} tagOptions={tagOptions} />
      </div>
    </>
  );
}
