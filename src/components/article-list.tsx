"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { categories, type Article, type Category } from "@/lib/data";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

interface ArticleListProps {
  articles: Article[];
}

export function ArticleList({ articles }: ArticleListProps) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") as Category | null;
  const [activeTab, setActiveTab] = useState<Category>(
    initialCategory && categories.some((c) => c.value === initialCategory)
      ? initialCategory
      : "all"
  );

  useEffect(() => {
    const category = searchParams.get("category") as Category | null;
    if (category && categories.some((c) => c.value === category)) {
      setActiveTab(category);
    }
  }, [searchParams]);

  const filtered =
    activeTab === "all"
      ? articles
      : articles.filter((a) => a.category === activeTab);

  return (
    <>
      {/* Tab Filter — 삼성 뉴스룸 기사 목록 탭 (모바일 가로 스크롤) */}
      <div className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveTab(cat.value)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
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

      {/* Article List — 삼성 뉴스룸 기사 목록 스타일 (가로형) */}
      <div className="divide-y divide-gray-100">
        {filtered.map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-16">
          해당 카테고리의 교육정보가 없습니다.
        </p>
      )}
    </>
  );
}

function ArticleRow({ article }: { article: Article }) {
  return (
    <article className="py-6">
      <Link
        href={`/articles/${article.slug}`}
        className="group flex gap-6 items-start"
      >
        {/* Thumbnail */}
        <div className="shrink-0 w-[200px] md:w-[280px] aspect-[16/9] rounded-sm overflow-hidden hidden sm:block relative">
          <div
            className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
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
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-blue-600 mb-1.5 block">
            {article.categoryLabel}
          </span>
          <h2 className="text-base md:text-lg font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
            {article.title}
          </h2>
          <p className="text-sm text-gray-500 line-clamp-2 mb-2 hidden md:block">
            {article.excerpt}
          </p>
          <time className="text-xs text-gray-400">{article.date}</time>
        </div>
      </Link>
    </article>
  );
}
