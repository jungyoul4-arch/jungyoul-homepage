"use client";

import { useState } from "react";
import Link from "next/link";
import { categories, type Article, type Category } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";

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
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {cat.label}
              {activeTab === cat.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        {/* Article Grid — 삼성 뉴스룸의 기사 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
        {/* Thumbnail — 삼성 뉴스룸 기사 썸네일 비율 */}
        <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden mb-4">
          <div
            className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg,
                hsl(${parseInt(article.id) * 40 + 200}, 40%, 70%) 0%,
                hsl(${parseInt(article.id) * 40 + 220}, 50%, 50%) 100%)`,
            }}
          />
          {/* 실제 이미지로 교체 시:
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          /> */}
        </div>

        {/* Category + Title — 삼성 뉴스룸 기사 카드 텍스트 스타일 */}
        <div>
          <span className="text-xs font-medium text-blue-600 mb-1.5 block">
            {article.categoryLabel}
          </span>
          <h3 className="text-[15px] md:text-base font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {article.excerpt}
          </p>
          <time className="text-xs text-gray-400 mt-2 block">{article.date}</time>
        </div>
      </Link>
    </article>
  );
}
