export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ExamArticleFilter } from "@/components/exam-article-filter";
import { getDb } from "@/db";
import { articles as articlesTable, examTagOptions as examTagOptionsTable, htmlPages as htmlPagesTable } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { toArticle, toHtmlPageCard } from "@/lib/mappers";
import { renderJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";
import type { ExamTagOption } from "@/lib/data";

export const metadata: Metadata = {
  title: "시험지 분석",
  description:
    "정율사관 시험지 분석 — 모의고사·내신 기출 분석과 풀이 전략을 정리한 콘텐츠 모음.",
  openGraph: {
    title: "시험지 분석 | 정율 교육정보",
    description:
      "정율사관 시험지 분석 — 모의고사·내신 기출 분석과 풀이 전략을 정리한 콘텐츠 모음.",
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
  const [raw, rawTagOptions, rawHtml] = await Promise.all([
    db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.category, "exam"))
      .orderBy(desc(articlesTable.date)),
    safeExamTagOptions(db),
    db
      .select()
      .from(htmlPagesTable)
      .orderBy(desc(htmlPagesTable.date))
      .catch(() => [] as never[]),
  ]);
  // HTML 페이지도 "시험지 분석(exam)" 로 설정한 것만 함께 노출
  // (HTML 은 exam_* 태그가 없어 연도·학년·과목 필터 선택 시 제외 → 태그 미선택 상태에서 노출).
  const htmlCards = rawHtml
    .map(toHtmlPageCard)
    .filter((c) => c.category === "exam");
  const articles = [...raw.map(toArticle), ...htmlCards].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const tagOptions: ExamTagOption[] = rawTagOptions.map((row) => ({
    id: row.id,
    tagType: row.tagType as ExamTagOption["tagType"],
    value: row.value,
    sortOrder: row.sortOrder ?? 0,
  }));

  return (
    <>
      <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "시험지 분석",
            description:
              "정율사관 시험지 분석 — 모의고사·내신 기출 분석과 풀이 전략을 정리한 콘텐츠 모음.",
            url: `${SITE_URL}/exam`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: articles.slice(0, 10).map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url:
                  a.kind === "html"
                    ? `${SITE_URL}/p/${a.slug}`
                    : `${SITE_URL}/articles/${a.slug}`,
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
