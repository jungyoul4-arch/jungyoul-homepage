"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { categories, type Article, type Category } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const ITEMS_PER_PAGE = 12;

interface ArticleListProps {
  articles: Article[];
}

export function ArticleList({ articles }: ArticleListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const param = searchParams.get("category") as Category | null;
  const pageParam = searchParams.get("page");

  const activeTab = useMemo<Category>(
    () => (param && categories.some((c) => c.value === param) ? param : "all"),
    [param]
  );

  const currentPage = useMemo(() => {
    const p = parseInt(pageParam || "1", 10);
    return p > 0 ? p : 1;
  }, [pageParam]);

  const filtered =
    activeTab === "all"
      ? articles
      : articles.filter((a) => a.category === activeTab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  function handleTab(value: Category) {
    router.replace(
      value === "all" ? "/articles" : `/articles?category=${value}`,
      { scroll: false }
    );
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("category", activeTab);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/articles${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      {/* Tab Filter */}
      <div className="flex border-b border-[#d9d9d9] overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleTab(cat.value)}
            className={`py-2 mr-6 text-[1.125rem] transition-colors relative whitespace-nowrap shrink-0 ${
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

      {/* Article Grid — 삼성 뉴스룸: 데스크톱 3열, row-gap 60px, col-gap 22px */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-[22px] gap-y-[60px] mt-10">
        {paged.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-16">
          해당 카테고리의 교육정보가 없습니다.
        </p>
      )}

      {/* Pagination — 삼성 뉴스룸 스타일 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          buildUrl={buildPageUrl}
        />
      )}
    </>
  );
}

/* ── Pagination ── */
function Pagination({
  currentPage,
  totalPages,
  buildUrl,
}: {
  currentPage: number;
  totalPages: number;
  buildUrl: (page: number) => string;
}) {
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex justify-center pt-20 pb-20" aria-label="페이지네이션">
      <ul className="flex items-center gap-2">
        {/* First */}
        <li>
          <Link
            href={buildUrl(1)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === 1 ? "text-[#d9d9d9] pointer-events-none" : "text-[#666] hover:bg-[#F5F5F5]"
            }`}
            aria-label="첫 페이지"
          >
            <ChevronsLeft size={18} />
          </Link>
        </li>
        {/* Prev */}
        <li>
          <Link
            href={buildUrl(Math.max(1, currentPage - 1))}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === 1 ? "text-[#d9d9d9] pointer-events-none" : "text-[#666] hover:bg-[#F5F5F5]"
            }`}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={18} />
          </Link>
        </li>

        {/* Page numbers */}
        {pages.map((page) => (
          <li key={page}>
            <Link
              href={buildUrl(page)}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-[1.125rem] transition-colors ${
                page === currentPage
                  ? "font-bold text-[#1A1A1A] underline underline-offset-4"
                  : "font-medium text-[#666] hover:bg-[#F5F5F5]"
              }`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Link>
          </li>
        ))}

        {/* Next */}
        <li>
          <Link
            href={buildUrl(Math.min(totalPages, currentPage + 1))}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === totalPages ? "text-[#d9d9d9] pointer-events-none" : "text-[#666] hover:bg-[#F5F5F5]"
            }`}
            aria-label="다음 페이지"
          >
            <ChevronRight size={18} />
          </Link>
        </li>
        {/* Last */}
        <li>
          <Link
            href={buildUrl(totalPages)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === totalPages ? "text-[#d9d9d9] pointer-events-none" : "text-[#666] hover:bg-[#F5F5F5]"
            }`}
            aria-label="마지막 페이지"
          >
            <ChevronsRight size={18} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/* ── Article Card ── */
function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="relative">
      <div className="absolute top-2 right-2 z-10">
        <AdminEditButton type="article" data={article} />
      </div>
      <Link href={`/articles/${article.slug}`} className="group block">
        {/* Thumbnail — 16:9, rounded-lg */}
        <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-5">
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
        {/* Text */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[1rem] md:text-[1.375rem] font-bold text-[#1A1A1A] leading-7 line-clamp-2 group-hover:text-[#1E64FA] transition-colors">
            {article.title}
          </h2>
          <div className="flex items-center gap-3">
            <time className="text-[1rem] font-medium text-[#666666]">{article.date}</time>
            <span className="text-[1rem] font-bold text-[#666666]">
              {article.categoryLabel}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
