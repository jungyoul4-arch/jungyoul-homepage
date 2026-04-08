import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { articles } from "@/lib/data";
import { ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};

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
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
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
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  // 같은 카테고리의 관련 기사 (현재 기사 제외, 최대 3개)
  const relatedArticles = articles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  return (
    <>
      {/* JSON-LD Article Schema — SEO 핵심 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.excerpt,
            image: ["https://www.jungyoul.net/og-image.png"],
            datePublished: article.date.replace(/\//g, "-"),
            dateModified: article.date.replace(/\//g, "-"),
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
        {/* Breadcrumb — 삼성 뉴스룸 기사 상세 상단 브레드크럼 */}
        <nav className="py-4 text-sm text-gray-500" aria-label="breadcrumb">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors">
                홈
              </Link>
            </li>
            <li><ChevronRight size={14} className="text-gray-400" /></li>
            <li>
              <Link href="/articles" className="hover:text-blue-600 transition-colors">
                교육정보
              </Link>
            </li>
            <li><ChevronRight size={14} className="text-gray-400" /></li>
            <li className="text-gray-900 font-medium">{article.categoryLabel}</li>
          </ol>
        </nav>

        {/* Article Header — 삼성 뉴스룸 기사 헤더 스타일 */}
        <header className="border-b border-gray-200 pb-8 mb-8">
          <span className="text-sm font-medium text-blue-600 mb-3 block">
            {article.categoryLabel}
          </span>
          <h1 className="text-2xl md:text-3xl lg:text-[36px] font-bold text-gray-900 leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-4">
            {article.excerpt}
          </p>
          <time
            dateTime={article.date.replace(/\//g, "-")}
            className="text-sm text-gray-400"
          >
            {article.date}
          </time>
        </header>

        {/* Article Hero Image */}
        <div className="mb-10">
          <div
            className="w-full aspect-[16/9] max-w-4xl mx-auto rounded-sm"
            style={{
              background: `linear-gradient(135deg,
                hsl(${parseInt(article.id) * 40 + 200}, 40%, 70%) 0%,
                hsl(${parseInt(article.id) * 40 + 220}, 50%, 50%) 100%)`,
            }}
          />
        </div>

        {/* Article Body — 삼성 뉴스룸 본문 스타일 (최대폭 제한, 가독성 우선) */}
        <div className="max-w-3xl mx-auto prose prose-lg prose-gray mb-16">
          <p>
            {article.excerpt}
          </p>
          <p>
            이 콘텐츠는 정율 교육정보에서 제공하는 전문 교육 콘텐츠입니다.
            실제 운영 시 이 영역에 상세한 기사 본문이 들어갑니다.
            CMS(콘텐츠 관리 시스템)를 연동하면 에디터에서 직접 작성하실 수 있습니다.
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
        </div>

        {/* Related Articles — 삼성 뉴스룸 하단 "관련 기사" 섹션 */}
        {relatedArticles.length > 0 && (
          <section className="border-t border-gray-200 py-12 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">관련 교육정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="group block"
                >
                  <div
                    className="aspect-[16/9] mb-3 rounded-sm overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg,
                        hsl(${parseInt(related.id) * 40 + 200}, 40%, 70%) 0%,
                        hsl(${parseInt(related.id) * 40 + 220}, 50%, 50%) 100%)`,
                    }}
                  />
                  <span className="text-xs font-medium text-blue-600 mb-1 block">
                    {related.categoryLabel}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {related.title}
                  </h3>
                  <time
                    dateTime={related.date.replace(/\//g, "-")}
                    className="text-xs text-gray-400 mt-1 block"
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
