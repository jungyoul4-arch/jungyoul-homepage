"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { categories, type Article, type Category } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

interface LatestArticlesProps {
  articles: Article[];
  pinnedArticleIds?: string[];
}

export function LatestArticles({ articles, pinnedArticleIds = [] }: LatestArticlesProps) {
  const [activeTab, setActiveTab] = useState<Category>("all");

  const filtered = (() => {
    if (activeTab !== "all") {
      return articles.filter((a) => a.category === activeTab);
    }
    if (pinnedArticleIds.length === 0) return articles;
    const pinnedSet = new Set(pinnedArticleIds);
    const pinned = pinnedArticleIds
      .map((id) => articles.find((a) => a.id === id))
      .filter((a): a is Article => a !== undefined);
    const rest = articles.filter((a) => !pinnedSet.has(a.id));
    return [...pinned, ...rest];
  })();

  return (
    <section className="py-12 md:py-16" aria-label="최신 교육정보">
      <div className="max-w-[1280px] mx-auto px-4">
        {/* Section Header — 삼성 뉴스룸 "최신기사" 헤더 스타일 */}
        <h2 className="text-[1.25rem] md:text-[1.5rem] font-bold text-[#1A1A1A] mb-6">
          최신 교육정보
        </h2>

        {/* Tab Filter — 삼성 뉴스룸 탭 스타일 (모바일 가로 스크롤) */}
        <div className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value)}
              className={`px-4 py-3 text-[1.125rem] transition-colors relative whitespace-nowrap shrink-0 ${
                activeTab === cat.value
                  ? "text-[#1E64FA] font-bold"
                  : "text-[#666666] hover:text-[#1A1A1A] font-medium"
              }`}
            >
              {cat.label}
              {activeTab === cat.value && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#1E64FA]" />
              )}
            </button>
          ))}
        </div>

        {/* Article Grid — PC: 4열×3행=12개, 태블릿: 3열×3행=9개, 모바일: 1열 */}
        <div key={activeTab} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
          {filtered.slice(0, 12).map((article, index) => (
            <div
              key={article.id}
              className={index >= 9 ? "hidden lg:block card-animate" : "card-animate"}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <ArticleCard article={article} />
            </div>
          ))}
        </div>

        {/* More Button — 삼성 뉴스룸 "기사 더보기" 스타일 */}
        <div className="mt-10 text-center">
          <Link
            href="/articles"
            className="inline-flex items-center justify-center h-16 px-10 bg-[#1E64FA] text-[1.375rem] font-bold text-white rounded-full hover:bg-[#0E41AD] transition-colors"
          >
            교육정보 더보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="relative">
      <div className="absolute top-2 right-2 z-10">
        <AdminEditButton type="article" data={article} />
      </div>
      <Link href={`/articles/${article.slug}`} className="group block">
        {/* Desktop/Tablet: vertical layout */}
        <div className="hidden sm:block">
          {/* Thumbnail — 삼성 뉴스룸 기사 썸네일 비율 */}
          <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-4">
            <div
              className="absolute inset-0 transition-transform duration-300 ease-in-out group-hover:scale-110"
              style={{
                background: placeholderGradient(article.id, "article"),
              }}
            />
            {isValidThumbnail(article.thumbnail) && (
              <Image
                src={article.thumbnail}
                alt={article.title}
                fill
                unoptimized
                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
              />
            )}
          </div>

          {/* Category + Title — 삼성 뉴스룸 기사 카드 텍스트 스타일 */}
          <div>
            <span className="text-[1rem] font-medium text-[#666666] mb-1.5 block">
              {article.categoryLabel}
            </span>
            <h3 className="text-[0.875rem] md:text-[1.125rem] lg:text-[1.375rem] font-bold text-[#1A1A1A] leading-7 line-clamp-2 group-hover:text-[#1E64FA] transition-colors">
              {article.title}
            </h3>
            <time className="text-[1rem] font-medium text-[#666666] mt-2 block">{article.date}</time>
          </div>
        </div>

        {/* Mobile: horizontal layout (썸네일:제목 = 5:5) */}
        <div className="flex gap-3 sm:hidden">
          <div className="w-1/2 aspect-[16/9] shrink-0 rounded-lg overflow-hidden relative">
            <div
              className="absolute inset-0"
              style={{
                background: placeholderGradient(article.id, "article"),
              }}
            />
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
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-[0.75rem] font-bold text-[#1E64FA]">
              {article.categoryLabel}
            </span>
            <h3 className="text-[0.875rem] font-medium text-[#1A1A1A] leading-snug line-clamp-2 mt-1">
              {article.title}
            </h3>
            <time className="text-[0.75rem] font-medium text-[#767676] mt-1 block">{article.date}</time>
          </div>
        </div>
      </Link>
    </article>
  );
}
