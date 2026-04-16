"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { categories, type Article, type Category } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
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

      {/* Article Grid/List — PC: 4열 그리드, 모바일: 세로 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-y-12">
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
    <article className="relative border-b border-gray-100 md:border-b-0">
      <div className="absolute top-2 right-2 z-10 hidden md:block">
        <AdminEditButton type="article" data={article} />
      </div>
      <Link href={`/articles/${article.slug}`} className="group block">
        {/* Desktop: vertical card (grid item) */}
        <div className="hidden md:block">
          <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-4">
            <div
              className="absolute inset-0 transition-transform duration-300 ease-in-out group-hover:scale-110"
              style={{ background: placeholderGradient(article.id, "article") }}
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
          <div>
            <span className="text-[1rem] font-bold text-[#1E64FA] mb-1.5 block">
              {article.categoryLabel}
            </span>
            <h2 className="text-[0.875rem] md:text-[1.125rem] lg:text-[1.375rem] font-bold text-[#1A1A1A] leading-7 line-clamp-2 group-hover:text-[#1E64FA] transition-colors">
              {article.title}
            </h2>
            <p className="text-[0.875rem] text-[#666666] mt-2 line-clamp-2">
              {article.excerpt}
            </p>
            <time className="text-[1rem] font-medium text-[#666666] mt-2 block">{article.date}</time>
          </div>
        </div>

        {/* Mobile: horizontal row (썸네일:제목 = 5:5) */}
        <div className="flex gap-3 py-6 md:hidden">
          <div className="w-1/2 aspect-[16/9] shrink-0 rounded-lg overflow-hidden relative">
            <div
              className="absolute inset-0"
              style={{ background: placeholderGradient(article.id, "article") }}
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
            <h2 className="text-[0.875rem] font-medium text-[#1A1A1A] leading-snug line-clamp-2 mt-1">
              {article.title}
            </h2>
            <time className="text-[0.75rem] font-medium text-[#767676] mt-1 block">{article.date}</time>
          </div>
        </div>
      </Link>
    </article>
  );
}
