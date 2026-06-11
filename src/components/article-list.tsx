"use client";

import { useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { categories as builtinCategories, type Article } from "@/lib/data";
import { EDUCATION_HIDDEN_CATEGORIES, type CategoryTab } from "@/lib/default-nav";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail, thumbSrc } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const ITEMS_PER_PAGE = 12;

interface ArticleListProps {
  articles: Article[];
  hideTabs?: boolean;
  // 카테고리 탭(label+value). 미전달 시 data.ts 빌트인으로 폴백(기존 호출부 안전).
  categories?: CategoryTab[];
}

export function ArticleList({ articles, hideTabs = false, categories }: ArticleListProps) {
  const cats = categories ?? builtinCategories;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const param = searchParams.get("category");
  const pageParam = searchParams.get("page");

  const activeTab = useMemo<string>(
    () => (param && cats.some((c) => c.value === param) ? param : "all"),
    [param, cats]
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

  function handleTab(value: string) {
    // shallow routing — URL(category)만 갱신하고 서버 라운드트립 없이 클라이언트에서 필터.
    const url = value === "all" ? "/articles" : `/articles?category=${value}`;
    window.history.replaceState(null, "", url);
  }

  function buildPageUrl(page: number) {
    // 현재 경로(/articles·/exam·/story)와 기존 쿼리(category·year·grade·subject)를 보존하고 page 만 변경.
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      {/* Tab Filter */}
      {!hideTabs && (
        <div className="flex border-b border-[#d9d9d9] overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {cats.filter((cat) => !EDUCATION_HIDDEN_CATEGORIES.has(cat.value)).map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleTab(cat.value)}
              className={`py-2 mr-6 text-[1.125rem] transition-colors relative whitespace-nowrap shrink-0 ${
                activeTab === cat.value
                  ? "text-brand-blue font-bold"
                  : "text-text-secondary hover:text-text-primary font-medium"
              }`}
            >
              {cat.label}
              {activeTab === cat.value && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-brand-blue" />
              )}
            </button>
          ))}
        </div>
      )}

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

  // 페이지네이션도 shallow routing — 서버 라운드트립 없이 URL(page)만 갱신하고 클라이언트에서 슬라이스.
  function go(page: number) {
    window.history.pushState(null, "", buildUrl(page));
    window.scrollTo({ top: 0 });
  }

  return (
    <nav className="flex justify-center pt-20 pb-20" aria-label="페이지네이션">
      <ul className="flex items-center gap-2">
        {/* First */}
        <li>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={currentPage === 1}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === 1 ? "text-[#d9d9d9] pointer-events-none" : "text-text-secondary hover:bg-[#F5F5F5]"
            }`}
            aria-label="첫 페이지"
          >
            <ChevronsLeft size={18} />
          </button>
        </li>
        {/* Prev */}
        <li>
          <button
            type="button"
            onClick={() => go(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === 1 ? "text-[#d9d9d9] pointer-events-none" : "text-text-secondary hover:bg-[#F5F5F5]"
            }`}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={18} />
          </button>
        </li>

        {/* Page numbers */}
        {pages.map((page) => (
          <li key={page}>
            <button
              type="button"
              onClick={() => go(page)}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-[1.125rem] transition-colors ${
                page === currentPage
                  ? "font-bold text-text-primary underline underline-offset-4"
                  : "font-medium text-text-secondary hover:bg-[#F5F5F5]"
              }`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          </li>
        ))}

        {/* Next */}
        <li>
          <button
            type="button"
            onClick={() => go(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === totalPages ? "text-[#d9d9d9] pointer-events-none" : "text-text-secondary hover:bg-[#F5F5F5]"
            }`}
            aria-label="다음 페이지"
          >
            <ChevronRight size={18} />
          </button>
        </li>
        {/* Last */}
        <li>
          <button
            type="button"
            onClick={() => go(totalPages)}
            disabled={currentPage === totalPages}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              currentPage === totalPages ? "text-[#d9d9d9] pointer-events-none" : "text-text-secondary hover:bg-[#F5F5F5]"
            }`}
            aria-label="마지막 페이지"
          >
            <ChevronsRight size={18} />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* ── Article Card ── */
function ArticleCard({ article }: { article: Article }) {
  // 독립 HTML 페이지는 /p/{slug} 로 링크하고 빠른편집(기사 전용) 버튼을 숨긴다. (latest-articles.tsx 와 동일)
  const isHtml = article.kind === "html";
  const href = isHtml ? `/p/${article.slug}` : `/articles/${article.slug}`;
  return (
    <article className="relative cv-card">
      {!isHtml && (
        <div className="absolute top-2 right-2 z-10">
          <AdminEditButton type="article" data={article} />
        </div>
      )}
      <Link href={href} className="group block">
        {/* Thumbnail — 16:9, rounded-lg */}
        <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-5">
          {isValidThumbnail(article.thumbnail) ? (
            <Image
              src={thumbSrc(article.thumbnail, 640)}
              alt={article.title}
              fill
              unoptimized
              className="object-fill transition-transform duration-300 ease-in-out group-hover:scale-105 will-change-transform"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-300 ease-in-out group-hover:scale-110"
              style={{ background: placeholderGradient(article.id, "article") }}
            />
          )}
        </div>
        {/* Text */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[1rem] md:text-[1.375rem] font-bold text-text-primary leading-7 line-clamp-2 group-hover:text-brand-blue transition-colors">
            {article.title}
          </h2>
          <div className="flex items-center gap-3">
            <time className="text-[1rem] font-medium text-text-secondary">{article.date}</time>
            <span className="text-[1rem] font-bold text-text-secondary">
              {article.categoryLabel}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
