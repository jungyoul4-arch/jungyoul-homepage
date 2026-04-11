"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const param = searchParams.get("category") as Category | null;

  const activeTab = useMemo<Category>(
    () => (param && categories.some((c) => c.value === param) ? param : "all"),
    [param]
  );

  const filtered =
    activeTab === "all"
      ? articles
      : articles.filter((a) => a.category === activeTab);

  function handleTab(value: Category) {
    router.replace(
      value === "all" ? "/articles" : `/articles?category=${value}`,
      { scroll: false }
    );
  }

  return (
    <>
      {/* Tab Filter */}
      <div className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleTab(cat.value)}
            className={`px-4 py-3 text-[1.125rem] transition-colors relative ${
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
          <span className="text-[1rem] font-bold text-[#1E64FA] mb-1.5 block">
            {article.categoryLabel}
          </span>
          <h2 className="text-[1rem] md:text-[1.375rem] font-bold text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#1E64FA] transition-colors mb-2">
            {article.title}
          </h2>
          <p className="text-[0.875rem] text-[#666666] line-clamp-2 mb-2 hidden md:block">
            {article.excerpt}
          </p>
          <time className="text-[1rem] font-medium text-[#666666]">{article.date}</time>
        </div>
      </Link>
    </article>
  );
}
