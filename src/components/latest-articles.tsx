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
}

export function LatestArticles({ articles }: LatestArticlesProps) {
  const [activeTab, setActiveTab] = useState<Category>("all");

  const filtered =
    activeTab === "all"
      ? articles
      : articles.filter((a) => a.category === activeTab);

  return (
    <section className="py-12 md:py-16" aria-label="최신 교육정보">
      <div className="max-w-[1280px] mx-auto px-4">
        {/* Section Header — 삼성 뉴스룸 "최신기사" 헤더 스타일 */}
        <h2 className="text-2xl md:text-[28px] font-bold text-gray-900 mb-6">
          최신 교육정보
        </h2>

        {/* Tab Filter — 삼성 뉴스룸 탭 스타일 (모바일 가로 스크롤) */}
        <div className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap shrink-0 ${
                activeTab === cat.value
                  ? "text-[#1428a0]"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {cat.label}
              {activeTab === cat.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1428a0]" />
              )}
            </button>
          ))}
        </div>

        {/* Article Grid — 삼성 뉴스룸의 기사 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>

        {/* More Button — 삼성 뉴스룸 "기사 더보기" 스타일 */}
        <div className="mt-10 text-center">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
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
        {/* Desktop: vertical layout */}
        <div className="hidden md:block">
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
            <span className="text-[12px] font-semibold text-[#1428a0] mb-1.5 block">
              {article.categoryLabel}
            </span>
            <h3 className="text-[15px] font-semibold text-gray-900 leading-[1.55] tracking-[-0.04em] line-clamp-2 group-hover:text-[#1428a0] transition-colors">
              {article.title}
            </h3>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {article.excerpt}
            </p>
            <time className="text-xs text-gray-400 mt-2 block">{article.date}</time>
          </div>
        </div>

        {/* Mobile: horizontal layout */}
        <div className="flex gap-4 md:hidden">
          <div className="w-[120px] h-[80px] shrink-0 rounded-lg overflow-hidden relative">
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
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-[#1428a0]">
              {article.categoryLabel}
            </span>
            <h3 className="text-[15px] font-semibold text-gray-900 leading-[1.55] tracking-[-0.04em] line-clamp-2 mt-1">
              {article.title}
            </h3>
            <time className="text-xs text-gray-400 mt-1 block">{article.date}</time>
          </div>
        </div>
      </Link>
    </article>
  );
}
