export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { articles as articlesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toArticle } from "@/lib/mappers";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { AdminEditButton } from "@/components/admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { sanitizeContent } from "@/lib/sanitize";
import { placeholderGradient } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = await getDb();
  const [raw] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.slug, decodedSlug))
    .limit(1);

  if (!raw) return {};
  const article = toArticle(raw);

  return {
    title: article.title,
    description: article.excerpt,
    keywords: [article.categoryLabel, "정율 교육정보", "입시", "교육"],
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url: `https://www.jungyoul.net/articles/${article.slug}`,
      siteName: "정율 교육정보",
      images: [{ url: article.thumbnail || "/og-image.png", width: 1200, height: 630 }],
      publishedTime: article.date.replace(/\//g, "-"),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
    alternates: {
      canonical: `/articles/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = await getDb();

  const [raw] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.slug, decodedSlug))
    .limit(1);

  if (!raw) notFound();
  const article = toArticle(raw);

  const allRaw = await db.select().from(articlesTable);
  const relatedArticles = allRaw
    .map(toArticle)
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.excerpt,
            image: article.thumbnail
              ? [`https://www.jungyoul.net${article.thumbnail}`]
              : ["https://www.jungyoul.net/og-image.png"],
            datePublished: article.date.replace(/\//g, "-"),
            dateModified: raw.updatedAt
              ? raw.updatedAt.split("T")[0]
              : article.date.replace(/\//g, "-"),
            author: {
              "@type": "Organization",
              name: "정율 교육정보",
              url: "https://www.jungyoul.net",
            },
            publisher: {
              "@type": "Organization",
              name: "정율 교육정보",
              logo: {
                "@type": "ImageObject",
                url: "https://www.jungyoul.net/logo.png",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://www.jungyoul.net/articles/${article.slug}`,
            },
            articleSection: article.categoryLabel,
            ...(article.content ? {
              wordCount: article.content.replace(/<[^>]*>/g, "").trim().length,
            } : {}),
            keywords: [article.categoryLabel, "정율 교육정보", "입시", "교육"],
            inLanguage: "ko",
            isAccessibleForFree: true,
          }).replace(/</g, "\\u003c"),
        }}
      />

      {/* BreadcrumbList JSON-LD — 구글 리치 결과 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "홈",
                item: "https://www.jungyoul.net",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "교육정보",
                item: "https://www.jungyoul.net/articles",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: article.categoryLabel,
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />

      <article className="max-w-[1080px] mx-auto px-4 lg:px-10">
        <nav className="py-4 text-[1rem] text-[#666666]" aria-label="breadcrumb">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-[#1E64FA] transition-colors">홈</Link>
            </li>
            <li><ChevronRight size={14} className="text-[#666666]" /></li>
            <li>
              <Link href="/articles" className="hover:text-[#1E64FA] transition-colors">교육정보</Link>
            </li>
            <li><ChevronRight size={14} className="text-[#666666]" /></li>
            <li className="text-[#1A1A1A] font-bold">{article.categoryLabel}</li>
          </ol>
        </nav>

        <header className="border-b border-gray-200 pb-8 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[1rem] font-bold text-[#666666]">
              {article.categoryLabel}
            </span>
            <AdminEditButton type="article" data={article} />
          </div>
          <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A] leading-[1.27] mb-4">
            {article.title}
          </h1>
          <p className="text-[1.25rem] text-[#666666] leading-relaxed mb-4">
            {article.excerpt}
          </p>
          <time
            dateTime={article.date.replace(/\//g, "-")}
            className="text-[1.125rem] font-bold text-[#666666]"
          >
            {article.date}
          </time>
        </header>

        <div className="article-content mb-16">
          {article.content ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeContent(article.content) }} />
          ) : (
            <>
              <p>{article.excerpt}</p>
              <p>
                이 콘텐츠는 정율 교육정보에서 제공하는 전문 교육 콘텐츠입니다.
                관리자 페이지에서 직접 작성하실 수 있습니다.
              </p>
              <h2>핵심 포인트</h2>
              <ul>
                <li>체계적인 학습 전략의 중요성</li>
                <li>데이터 기반 입시 분석</li>
                <li>개인 맞춤형 교육 설계</li>
              </ul>
              <p>
                더 자세한 상담이 필요하시면 정율사관학원(032-321-9937)으로 문의해 주세요.
              </p>
            </>
          )}
        </div>

        {/* 저작권 안내 박스 — 삼성 뉴스룸 스타일 */}
        <div className="mt-8 bg-[#F4F7FF] rounded-lg p-8 text-[#666666] text-sm leading-relaxed">
          정율 교육정보의 콘텐츠는 출처를 밝히는 경우 자유롭게 이용하실 수 있습니다.
          콘텐츠 이용 시{" "}
          <Link href="/" className="text-[#1E64FA]">
            정율 교육정보
          </Link>
          {" "}출처 표기를 부탁드립니다.
        </div>

        {/* 관련 교육정보 — 삼성 뉴스룸 스타일 (가로 스크롤) */}
        {relatedArticles.length > 0 && (
          <section className="border-t border-gray-200 pt-12 mt-8 pb-8">
            <h2 className="text-[1.5rem] font-bold text-[#1A1A1A] mb-6">관련 교육정보</h2>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide -mr-4 lg:-mr-10 pr-4 lg:pr-10" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="group block shrink-0 w-[calc(50%-10px)] md:w-[calc(25%-15px)]"
                >
                  <div
                    className="aspect-[16/9] mb-3 rounded-lg overflow-hidden relative"
                    style={{
                      background: placeholderGradient(related.id, "article"),
                    }}
                  >
                    {isValidThumbnail(related.thumbnail) && (
                      <Image
                        src={related.thumbnail}
                        alt={related.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    )}
                  </div>
                  <span className="text-[0.875rem] font-bold text-[#666666] mb-1 block">
                    {related.categoryLabel}
                  </span>
                  <h3 className="text-[1rem] md:text-[1.375rem] font-bold text-[#1A1A1A] leading-7 line-clamp-2 group-hover:text-[#1E64FA] transition-colors">
                    {related.title}
                  </h3>
                  <time
                    dateTime={related.date.replace(/\//g, "-")}
                    className="text-[0.875rem] font-medium text-[#666666] mt-1 block"
                  >
                    {related.date}
                  </time>
                </Link>
              ))}
            </div>

            {/* 하단 CTA — 삼성 뉴스룸 스타일 */}
            <div className="relative mt-[58px]">
              <div className="h-px bg-[#E0E9FE]" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Link
                  href="/articles"
                  className="inline-flex items-center justify-center h-16 px-12 bg-[#1E64FA] text-[1.375rem] font-bold text-white rounded-full hover:bg-[#0E41AD] transition-colors whitespace-nowrap"
                >
                  교육정보 더보기
                </Link>
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
