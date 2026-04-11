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
    .slice(0, 3);

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

      <article className="max-w-[1280px] mx-auto px-4">
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

        <div className="mb-10">
          <div
            className="w-full aspect-[16/9] max-w-4xl mx-auto rounded-sm relative overflow-hidden"
            style={{
              background: placeholderGradient(article.id, "article"),
            }}
          >
            {isValidThumbnail(article.thumbnail) && (
              <Image
                src={article.thumbnail}
                alt={article.title}
                fill
                unoptimized
                className="object-cover"
              />
            )}
          </div>
        </div>

        <div className="prose-newsroom mb-16">
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

        {relatedArticles.length > 0 && (
          <section className="border-t border-gray-200 py-12 mb-8">
            <h2 className="text-[1.375rem] font-bold text-[#000080] mb-6">관련 교육정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="group block"
                >
                  <div
                    className="aspect-[16/9] mb-3 rounded-sm overflow-hidden relative"
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
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="text-[1rem] font-bold text-[#1E64FA] mb-1 block">
                    {related.categoryLabel}
                  </span>
                  <h3 className="text-[1.375rem] font-medium text-[#1A1A1A] leading-7 line-clamp-2 group-hover:text-[#1E64FA] transition-colors">
                    {related.title}
                  </h3>
                  <time
                    dateTime={related.date.replace(/\//g, "-")}
                    className="text-[1rem] font-medium text-[#666666] mt-1 block"
                  >
                    {related.date}
                  </time>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
