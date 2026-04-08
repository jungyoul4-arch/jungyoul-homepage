"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Article } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

interface HeroCarouselProps {
  articles: Article[];
}

export function HeroCarousel({ articles }: HeroCarouselProps) {
  // Group articles into slides of 4
  const slides: Article[][] = [];
  for (let i = 0; i < articles.length; i += 4) {
    slides.push(articles.slice(i, i + 4));
  }
  const totalSlides = slides.length || 1;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const intervalDuration = 10000; // 10 seconds

  const goTo = useCallback(
    (index: number) => {
      const next = ((index % totalSlides) + totalSlides) % totalSlides;
      setCurrentSlide(next);
      setProgress(0);
    },
    [totalSlides]
  );

  const next = useCallback(() => {
    goTo(currentSlide + 1);
  }, [currentSlide, goTo]);

  const prev = useCallback(() => {
    goTo(currentSlide - 1);
  }, [currentSlide, goTo]);

  // Auto-play + progress bar
  useEffect(() => {
    if (isPaused || totalSlides <= 1) {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
      return;
    }

    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min((elapsed / intervalDuration) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        next();
        return;
      }
      progressRef.current = requestAnimationFrame(animate);
    };

    progressRef.current = requestAnimationFrame(animate);
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [isPaused, currentSlide, next, totalSlides]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only consider horizontal swipe if it's more horizontal than vertical
    if (!isSwiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping.current = true;
    }
    if (isSwiping.current) {
      touchDeltaX.current = dx;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping.current) {
      if (touchDeltaX.current < -50) {
        next();
      } else if (touchDeltaX.current > 50) {
        prev();
      }
    }
    isSwiping.current = false;
    touchDeltaX.current = 0;
  }, [next, prev]);

  const currentArticles = slides[currentSlide] || [];
  const mainArticle = currentArticles[0];
  const subImageArticle = currentArticles[1];
  const textArticle1 = currentArticles[2];
  const textArticle2 = currentArticles[3];

  if (!mainArticle) return null;

  return (
    <section className="relative bg-white pt-6 pb-2" aria-label="주요 교육정보">
      <div
        ref={containerRef}
        className="relative max-w-[1420px] mx-auto px-4 md:px-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide transition wrapper */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform ease-out"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
              transitionDuration: "250ms",
            }}
          >
            {slides.map((slideArticles, slideIdx) => {
              const main = slideArticles[0];
              const subImg = slideArticles[1];
              const txt1 = slideArticles[2];
              const txt2 = slideArticles[3];
              if (!main) return null;

              return (
                <div
                  key={slideIdx}
                  className="w-full flex-shrink-0"
                >
                  {/* Desktop: grid layout */}
                  <div
                    className="hidden md:grid gap-5"
                    style={{ gridTemplateColumns: "66.57% 1fr" }}
                  >
                    {/* Main card */}
                    <MainImageCard article={main} priority={slideIdx === 0} />

                    {/* Right sub area */}
                    <div className="flex flex-col gap-5">
                      {subImg && (
                        <SubImageCard article={subImg} />
                      )}
                      {txt1 && (
                        <TextCard article={txt1} />
                      )}
                      {txt2 && (
                        <TextCard article={txt2} />
                      )}
                    </div>
                  </div>

                  {/* Mobile: single card with peek effect */}
                  <div className="md:hidden">
                    <MobileCard article={main} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-3 mt-3">
          {/* Page Counter */}
          <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums select-none">
            <span className="text-gray-900 font-bold">
              {String(currentSlide + 1).padStart(2, "0")}
            </span>
            <span className="text-gray-400 text-xs">/</span>
            <span className="text-gray-400 text-xs">
              {String(totalSlides).padStart(2, "0")}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 h-[2px] bg-gray-200 rounded-full max-w-[300px]">
            <div
              className="h-full bg-gray-900 rounded-full"
              style={{
                width: `${progress}%`,
                transition: "none",
              }}
            />
          </div>

          {/* Prev / Next Arrows */}
          <button
            onClick={prev}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1"
            aria-label="이전 슬라이드"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            onClick={next}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1"
            aria-label="다음 슬라이드"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1"
            aria-label={isPaused ? "슬라이드 재생" : "슬라이드 일시정지"}
          >
            {isPaused ? (
              <Play size={16} strokeWidth={2} />
            ) : (
              <Pause size={16} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Image Card (Main) ─── */
function MainImageCard({
  article,
  priority = false,
}: {
  article: Article;
  priority?: boolean;
}) {
  const hasImage = isValidThumbnail(article.thumbnail);
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block rounded-xl overflow-hidden"
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: hasImage
            ? undefined
            : placeholderGradient(article.id, "article"),
        }}
      />
      {hasImage && (
        <Image
          src={article.thumbnail}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-[350ms] ease-out group-hover:scale-110"
          priority={priority}
          unoptimized
        />
      )}

      {/* Overlay: gradient by default, solid on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-all duration-300 group-hover:from-black/50 group-hover:via-black/50 group-hover:to-black/50" />

      {/* Admin edit button */}
      <div className="absolute top-4 right-4 z-10">
        <AdminEditButton type="article" data={article} />
      </div>

      {/* Content area */}
      <div className="absolute left-0 right-0 bottom-0 p-6 md:p-8 lg:p-10 transition-all duration-300 group-hover:top-0 group-hover:flex group-hover:flex-col group-hover:justify-end">
        {/* Category */}
        <p
          className="text-xs font-semibold mb-2"
          style={{ color: "#89b4fa", fontSize: "12px", fontWeight: 600 }}
        >
          {article.categoryLabel}
        </p>
        {/* Title */}
        <p
          className="text-white leading-tight"
          style={{
            fontWeight: 700,
            letterSpacing: "-0.04em",
            fontSize: "clamp(1.5rem, 2vw, 1.75rem)",
          }}
        >
          {article.title}
        </p>
        {/* Description: hidden normally, shown on hover with line-clamp */}
        <p
          className="text-white/0 group-hover:text-white/90 mt-3 overflow-hidden transition-colors duration-300"
          style={{
            fontSize: "1rem",
            fontWeight: 400,
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
}

/* ─── Image Card (Sub) ─── */
function SubImageCard({ article }: { article: Article }) {
  const hasImage = isValidThumbnail(article.thumbnail);
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block rounded-xl overflow-hidden flex-1 min-h-0"
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: hasImage
            ? undefined
            : placeholderGradient(article.id, "article"),
        }}
      />
      {hasImage && (
        <Image
          src={article.thumbnail}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-[350ms] ease-out group-hover:scale-110"
          unoptimized
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-all duration-300 group-hover:from-black/50 group-hover:via-black/50 group-hover:to-black/50" />

      {/* Admin edit button */}
      <div className="absolute top-3 right-3 z-10">
        <AdminEditButton type="article" data={article} />
      </div>

      {/* Content */}
      <div className="absolute left-0 right-0 bottom-0 p-4 transition-all duration-300 group-hover:top-0 group-hover:flex group-hover:flex-col group-hover:justify-end">
        <p
          className="text-xs font-semibold mb-1"
          style={{ color: "#89b4fa", fontSize: "12px", fontWeight: 600 }}
        >
          {article.categoryLabel}
        </p>
        <p
          className="text-white text-sm leading-snug"
          style={{ fontWeight: 700, letterSpacing: "-0.04em" }}
        >
          {article.title}
        </p>
        <p
          className="text-white/0 group-hover:text-white/90 mt-2 overflow-hidden transition-colors duration-300 text-sm"
          style={{
            fontWeight: 400,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
}

/* ─── Text-Only Card ─── */
function TextCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block rounded-xl overflow-hidden flex-1 min-h-0 p-4 transition-colors duration-200"
      style={{ backgroundColor: "#e0e9fe" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#c7d5fa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#e0e9fe";
      }}
    >
      {/* Admin edit button */}
      <div className="absolute top-3 right-3 z-10">
        <AdminEditButton type="article" data={article} />
      </div>

      <p
        className="mb-1 transition-colors duration-200 group-hover:text-[#0e41ad]"
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#1428a0",
        }}
      >
        {article.categoryLabel}
      </p>
      <p
        className="leading-snug transition-colors duration-200 group-hover:text-[#0e41ad]"
        style={{
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontSize: "0.95rem",
          color: "#1a1a1a",
        }}
      >
        {article.title}
      </p>
    </Link>
  );
}

/* ─── Mobile Card ─── */
function MobileCard({ article }: { article: Article }) {
  const hasImage = isValidThumbnail(article.thumbnail);
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block rounded-xl overflow-hidden w-[85%]"
    >
      {/* Taller card for mobile: 130% padding-top */}
      <div className="relative" style={{ paddingTop: "130%" }}>
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background: hasImage
              ? undefined
              : placeholderGradient(article.id, "article"),
          }}
        />
        {hasImage && (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover"
            unoptimized
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Admin edit button */}
        <div className="absolute top-3 right-3 z-10">
          <AdminEditButton type="article" data={article} />
        </div>

        {/* Content */}
        <div className="absolute left-0 right-0 bottom-0 p-5">
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "#89b4fa", fontSize: "12px", fontWeight: 600 }}
          >
            {article.categoryLabel}
          </p>
          <p
            className="text-white leading-tight"
            style={{
              fontWeight: 700,
              letterSpacing: "-0.04em",
              fontSize: "1.25rem",
            }}
          >
            {article.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
