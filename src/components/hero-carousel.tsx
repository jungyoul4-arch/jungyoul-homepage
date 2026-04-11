"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HeroSlide, HeroSlideItem } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const totalSlides = slides.length;
  const hasMultiple = totalSlides > 1;

  // Clone: [cloneLast, ...slides, cloneFirst]
  const extendedSlides = hasMultiple
    ? [slides[totalSlides - 1], ...slides, slides[0]]
    : slides;

  const [currentSlide, setCurrentSlide] = useState(hasMultiple ? 1 : 0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [noTransition, setNoTransition] = useState(false);
  const progressRef = useRef<number | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const intervalDuration = 10000;

  // Display index (1-based, real slides only)
  const displayIndex = !hasMultiple
    ? 1
    : currentSlide <= 0
      ? totalSlides
      : currentSlide > totalSlides
        ? 1
        : currentSlide;

  const next = useCallback(() => {
    setCurrentSlide((prev) => prev + 1);
    setProgress(0);
  }, []);

  const prev = useCallback(() => {
    setCurrentSlide((prev) => prev - 1);
    setProgress(0);
  }, []);

  // Clone boundary: snap to real position after transition
  const handleTransitionEnd = useCallback(() => {
    if (!hasMultiple) return;
    if (currentSlide === 0) {
      setNoTransition(true);
      setCurrentSlide(totalSlides);
    } else if (currentSlide === totalSlides + 1) {
      setNoTransition(true);
      setCurrentSlide(1);
    }
  }, [currentSlide, totalSlides, hasMultiple]);

  // Restore transition after instant jump
  useEffect(() => {
    if (noTransition) {
      requestAnimationFrame(() => setNoTransition(false));
    }
  }, [noTransition]);

  // Auto-play + progress
  useEffect(() => {
    if (isPaused || !hasMultiple) {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
      return;
    }
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const pct = Math.min(((timestamp - start) / intervalDuration) * 100, 100);
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
  }, [isPaused, currentSlide, next, hasMultiple]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!isSwiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping.current = true;
    }
    if (isSwiping.current) touchDeltaX.current = dx;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping.current) {
      if (touchDeltaX.current < -50) next();
      else if (touchDeltaX.current > 50) prev();
    }
    isSwiping.current = false;
    touchDeltaX.current = 0;
  }, [next, prev]);

  if (slides.length === 0) return null;

  return (
    <section className="relative bg-white pt-6 pb-2" aria-label="주요 교육정보">
      <div
        ref={containerRef}
        className="relative max-w-[1420px] mx-auto px-4 md:px-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover arrows (desktop only, fade in/out) */}
        {hasMultiple && (
          <div
            className={`hidden md:block transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={prev}
              className="absolute z-20 rounded-full bg-white/80 shadow-lg hover:bg-white transition-colors"
              style={{ top: "calc(50% - 36px)", left: "16px", width: "56px", height: "56px" }}
              aria-label="이전 슬라이드"
            >
              <ChevronLeft className="mx-auto" size={28} strokeWidth={1.5} />
            </button>
            <button
              onClick={next}
              className="absolute z-20 rounded-full bg-white/80 shadow-lg hover:bg-white transition-colors"
              style={{ top: "calc(50% - 36px)", right: "16px", width: "56px", height: "56px" }}
              aria-label="다음 슬라이드"
            >
              <ChevronRight className="mx-auto" size={28} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Slide area */}
        <div className="relative overflow-hidden">
          <div
            className={`flex ${noTransition ? "" : "transition-transform ease-out"}`}
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
              transitionDuration: noTransition ? "0ms" : "350ms",
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedSlides.map((slide, slideIdx) => (
              <div key={`${slide.id}-${slideIdx}`} className="w-full flex-shrink-0">
                <SlideContent slide={slide} priority={slideIdx === (hasMultiple ? 1 : 0)} />
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          {/* Page counter */}
          <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums select-none">
            <span className="text-gray-900 font-bold">
              {String(displayIndex).padStart(2, "0")}
            </span>
            <span
              className="inline-block mx-0.5"
              style={{ width: "1px", height: "9px", background: "#ddd" }}
            />
            <span className="text-gray-400 text-xs">
              {String(totalSlides).padStart(2, "0")}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-[2px] bg-gray-200 rounded-full"
            style={{ width: "320px", maxWidth: "100%" }}
          >
            <div
              className="h-full bg-gray-900 rounded-full"
              style={{ width: `${progress}%`, transition: "none" }}
            />
          </div>

          {/* Prev / Next */}
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

          {/* Divider + Play/Pause */}
          <span
            className="inline-block"
            style={{ width: "1px", height: "16px", background: "#ddd" }}
          />
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1"
            aria-label={isPaused ? "슬라이드 재생" : "슬라이드 일시정지"}
          >
            {isPaused ? <Play size={16} strokeWidth={2} /> : <Pause size={16} strokeWidth={2} />}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Layout Router (방어 3: 자동 축소) ─── */
function SlideContent({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  const items = slide.items;
  const count = items.length;
  const main = items.find((i) => i.role === "main") ?? items[0];
  const subImage = items.find((i) => i.role === "sub-image");
  const subTexts = items.filter((i) => i.role === "sub-text");

  if (count === 1) return <Case05 main={main} priority={priority} />;
  if (count === 2) return <Case03 main={main} sub={subImage || subTexts[0]} priority={priority} />;
  return <Case01 main={main} subImage={subImage} texts={subTexts} priority={priority} />;
}

/* ─── Case05: Full-width (1 article) ─── */
function Case05({ main, priority }: { main: HeroSlideItem; priority: boolean }) {
  const a = main.article;
  const hasImage = isValidThumbnail(a.thumbnail);
  return (
    <>
      {/* Desktop */}
      <Link
        href={`/articles/${a.slug}`}
        className="group relative block rounded-xl overflow-hidden hidden md:block"
        style={{ paddingTop: "37.428%" }}
      >
        <ImageBg src={a.thumbnail} alt={a.title} hasImage={hasImage} id={a.id} priority={priority} />
        <GradientOverlay />
        <AdminBtn article={a} />
        <ContentOverlay title={a.title} desc={a.excerpt} category={a.categoryLabel} large />
      </Link>
      {/* Mobile */}
      <Link
        href={`/articles/${a.slug}`}
        className="group relative block rounded-xl overflow-hidden md:hidden"
        style={{ paddingTop: "139.144%" }}
      >
        <ImageBg src={a.thumbnail} alt={a.title} hasImage={hasImage} id={a.id} priority={priority} />
        <GradientOverlay />
        <AdminBtn article={a} />
        <MobileContent title={a.title} category={a.categoryLabel} />
      </Link>
    </>
  );
}

/* ─── Case03: 2-column (2 articles) ─── */
function Case03({
  main,
  sub,
  priority,
}: {
  main: HeroSlideItem;
  sub?: HeroSlideItem;
  priority: boolean;
}) {
  const a = main.article;
  const b = sub?.article;
  const hasA = isValidThumbnail(a.thumbnail);

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden md:grid gap-5"
        style={{ gridTemplateColumns: "77.573% 1fr" }}
      >
        <Link
          href={`/articles/${a.slug}`}
          className="group relative block rounded-xl overflow-hidden"
          style={{ paddingTop: "48.251%" }}
        >
          <ImageBg src={a.thumbnail} alt={a.title} hasImage={hasA} id={a.id} priority={priority} />
          <GradientOverlay />
          <AdminBtn article={a} />
          <ContentOverlay title={a.title} desc={a.excerpt} category={a.categoryLabel} large />
        </Link>
        {b && <SubCard article={b} tall />}
      </div>
      {/* Mobile */}
      <Link
        href={`/articles/${a.slug}`}
        className="group relative block rounded-xl overflow-hidden md:hidden"
        style={{ paddingTop: "139.144%" }}
      >
        <ImageBg src={a.thumbnail} alt={a.title} hasImage={hasA} id={a.id} priority={priority} />
        <GradientOverlay />
        <AdminBtn article={a} />
        <MobileContent title={a.title} category={a.categoryLabel} />
      </Link>
    </>
  );
}

/* ─── Case01: 4-column (3-4 articles) ─── */
function Case01({
  main,
  subImage,
  texts,
  priority,
}: {
  main: HeroSlideItem;
  subImage?: HeroSlideItem;
  texts: HeroSlideItem[];
  priority: boolean;
}) {
  const a = main.article;
  const hasA = isValidThumbnail(a.thumbnail);

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden md:grid gap-5"
        style={{ gridTemplateColumns: "66.5719% 1fr" }}
      >
        <Link
          href={`/articles/${a.slug}`}
          className="group relative block rounded-xl overflow-hidden"
          style={{ paddingTop: "56.2232%" }}
        >
          <ImageBg src={a.thumbnail} alt={a.title} hasImage={hasA} id={a.id} priority={priority} />
          <GradientOverlay />
          <AdminBtn article={a} />
          <ContentOverlay title={a.title} desc={a.excerpt} category={a.categoryLabel} large />
        </Link>
        <div className="flex flex-col gap-5">
          {subImage && <SubCard article={subImage.article} />}
          {texts.map((t) => (
            <TextCard key={t.id} article={t.article} />
          ))}
        </div>
      </div>
      {/* Mobile */}
      <Link
        href={`/articles/${a.slug}`}
        className="group relative block rounded-xl overflow-hidden md:hidden"
        style={{ paddingTop: "139.144%" }}
      >
        <ImageBg src={a.thumbnail} alt={a.title} hasImage={hasA} id={a.id} priority={priority} />
        <GradientOverlay />
        <AdminBtn article={a} />
        <MobileContent title={a.title} category={a.categoryLabel} />
      </Link>
    </>
  );
}

/* ─── Shared: Sub Image Card ─── */
function SubCard({ article, tall }: { article: { id: string; title: string; excerpt: string; slug: string; thumbnail: string; categoryLabel: string }; tall?: boolean }) {
  const hasImage = isValidThumbnail(article.thumbnail);
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block rounded-xl overflow-hidden flex-1 min-h-0"
      style={tall ? { height: "100%" } : { aspectRatio: "16 / 9" }}
    >
      <div className="absolute inset-0">
        {hasImage ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: placeholderGradient(article.id, "article") }}
          />
        )}
      </div>
      <GradientOverlay />
      <AdminBtn article={article} small />
      <div className="absolute left-0 right-0 bottom-0 p-4 lg:p-5 transition-all duration-300 group-hover:top-0 group-hover:flex group-hover:flex-col group-hover:justify-start group-hover:pt-6 z-[3]">
        <p className="text-xs font-semibold mb-1" style={{ color: "#89b4fa" }}>
          {article.categoryLabel}
        </p>
        <p
          className="text-white text-sm leading-snug"
          style={{ fontWeight: 700, letterSpacing: "-0.03em" }}
        >
          {article.title}
        </p>
        <p
          className="text-white/90 mt-2 overflow-hidden text-sm hidden group-hover:block line-clamp-2"
          style={{
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
}

/* ─── Shared: Text-only Card ─── */
function TextCard({ article }: { article: { id: string; title: string; slug: string; categoryLabel: string } }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block rounded-xl overflow-hidden p-4 transition-colors duration-200"
      style={{ backgroundColor: "#e0e9fe", height: "25%", minHeight: "64px" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#c7d5fa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#e0e9fe";
      }}
    >
      <AdminBtn article={article} small />
      <div className="flex items-center h-full pr-8">
        <div>
          <p
            className="text-xs font-semibold mb-1 transition-colors duration-200 group-hover:text-[#0E41AD]"
            style={{ color: "#1E64FA" }}
          >
            {article.categoryLabel}
          </p>
          <p
            className="leading-snug transition-colors duration-200 group-hover:text-[#0E41AD]"
            style={{
              fontWeight: 700,
              letterSpacing: "-0.03em",
              fontSize: "0.95rem",
              color: "#1A1A1A",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.title}
          </p>
        </div>
      </div>
      {/* Arrow icon */}
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#0E41AD] transition-colors">
        <ChevronRight size={16} />
      </span>
    </Link>
  );
}

/* ─── Shared micro-components ─── */
function ImageBg({
  src,
  alt,
  hasImage,
  id,
  priority,
}: {
  src: string;
  alt: string;
  hasImage: boolean;
  id: string;
  priority: boolean;
}) {
  return (
    <div className="absolute inset-0">
      {hasImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
          priority={priority}
          unoptimized
        />
      ) : (
        <div
          className="w-full h-full"
          style={{ background: placeholderGradient(id, "article") }}
        />
      )}
    </div>
  );
}

function GradientOverlay() {
  return (
    <>
      {/* Bottom gradient (always) */}
      <div
        className="absolute left-0 bottom-0 w-full z-[1] pointer-events-none"
        style={{
          height: "50%",
          background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 z-[2] pointer-events-none" />
    </>
  );
}

function ContentOverlay({
  title,
  desc,
  category,
  large,
}: {
  title: string;
  desc: string;
  category: string;
  large?: boolean;
}) {
  return (
    <div className="absolute left-0 right-0 bottom-0 p-6 md:p-8 lg:p-10 transition-all duration-300 group-hover:top-0 group-hover:flex group-hover:flex-col group-hover:justify-start group-hover:pt-10 z-[3]">
      <p className="text-xs font-semibold mb-2" style={{ color: "#89b4fa" }}>
        {category}
      </p>
      <p
        className="text-white leading-tight"
        style={{
          fontWeight: 700,
          letterSpacing: "-0.03em",
          fontSize: large ? "clamp(1.375rem, 2vw, 1.875rem)" : "clamp(1rem, 1.5vw, 1.375rem)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </p>
      <p
        className="text-white/90 mt-3 overflow-hidden hidden md:group-hover:block line-clamp-3"
        style={{
          fontSize: "1rem",
          fontWeight: 400,
          lineHeight: 1.6,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

function MobileContent({ title, category }: { title: string; category: string }) {
  return (
    <div className="absolute left-0 right-0 bottom-0 p-5 z-[3]">
      <p className="text-xs font-semibold mb-2" style={{ color: "#89b4fa" }}>
        {category}
      </p>
      <p
        className="text-white leading-tight"
        style={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: "1.375rem" }}
      >
        {title}
      </p>
    </div>
  );
}

function AdminBtn({ article, small }: { article: object; small?: boolean }) {
  return (
    <div className={`absolute ${small ? "top-3 right-3" : "top-4 right-4"} z-10`}>
      <AdminEditButton type="article" data={article} />
    </div>
  );
}
