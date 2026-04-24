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
    <section className="pb-[120px]" aria-label="최신 교육정보">
      <div className="max-w-[1480px] mx-auto px-5 lg:px-10">
        {/* Section Header + Tab — 삼성 뉴스룸 원본은 static (sticky 아님) */}
        <div>
          <h2 className="text-[1.25rem] md:text-[1.5rem] font-bold text-[#1A1A1A] mb-6" style={{ letterSpacing: "-0.03em", lineHeight: 1.6 }}>
            최신 교육정보
          </h2>

          {/* Tab Filter — 삼성 뉴스룸 탭 스타일 (16px, pb-2, border 4px) */}
          <div className="flex border-b border-[#d9d9d9] overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveTab(cat.value)}
                className={`pb-2 md:py-2 mr-6 text-[1rem] md:text-[1.125rem] transition-colors relative whitespace-nowrap shrink-0 ${
                  activeTab === cat.value
                    ? "text-[#1E64FA] font-bold"
                    : "text-[#666666] hover:text-[#1A1A1A] font-medium"
                }`}
              >
                {cat.label}
                {activeTab === cat.value && (
                  <span className="absolute -bottom-px left-0 right-0 h-1 bg-[#1E64FA]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Article Grid — PC: 4열×3행=12개, 태블릿: 3열, 모바일: 1열 */}
        <div key={activeTab} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14 mt-8">
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

        {/* More Button — 삼성 뉴스룸 가로선 중앙 텍스트 스타일 */}
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

          {/* Category + Title */}
          <div className="flex flex-col gap-3">
            <span className="text-[1rem] font-bold text-[#666666]">
              {article.categoryLabel}
            </span>
            <h3 className="text-[0.875rem] md:text-[1.125rem] lg:text-[1.375rem] font-bold text-[#1A1A1A] leading-7 line-clamp-2 group-hover:text-[#1E64FA] transition-colors">
              {article.title}
            </h3>
            <time className="text-[1rem] font-medium text-[#666666]">{article.date}</time>
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
