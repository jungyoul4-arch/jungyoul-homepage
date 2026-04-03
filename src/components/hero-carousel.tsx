"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Article } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";

interface HeroCarouselProps {
  articles: Article[];
}

export function HeroCarousel({ articles }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);
  const intervalDuration = 5000; // 5초 자동 전환
  const total = articles.length;

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setProgress(0);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [isTransitioning]
  );

  const next = useCallback(() => {
    goTo((current + 1) % total);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total);
  }, [current, total, goTo]);

  // Auto-play + progress bar
  useEffect(() => {
    if (isPaused) {
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
  }, [isPaused, current, next]);

  // 슬라이드 위치 계산 (삼성 뉴스룸: 중앙 카드 + 양쪽 프리뷰)
  const getSlideStyle = (index: number) => {
    // 현재 슬라이드 대비 오프셋 계산 (순환 고려)
    let offset = index - current;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const isActive = offset === 0;
    const isAdjacent = Math.abs(offset) === 1;
    const isVisible = Math.abs(offset) <= 2;

    // 삼성 뉴스룸: 중앙 카드가 크고, 옆 카드는 살짝 보임
    // 중앙 카드 너비: ~76% of container, 옆 카드는 갭 포함해서 나머지 공간에 peek
    const translateX = offset * 78; // % 단위로 이동
    const scale = isActive ? 1 : 0.85;
    const opacity = isActive ? 1 : isAdjacent ? 0.7 : 0;
    const zIndex = isActive ? 10 : isAdjacent ? 5 : 1;

    return {
      transform: `translateX(${translateX}%) scale(${scale})`,
      opacity: isVisible ? opacity : 0,
      zIndex,
      transition: "all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)",
      pointerEvents: (isActive ? "auto" : "none") as React.CSSProperties["pointerEvents"],
    };
  };

  return (
    <section className="relative bg-white pt-6 pb-2" aria-label="주요 교육정보">
      {/* Carousel Container — 삼성 뉴스룸 스타일: overflow visible로 양쪽 카드 프리뷰 */}
      <div className="relative max-w-[1420px] mx-auto">
        {/* Slides Viewport */}
        <div className="relative overflow-hidden aspect-[100/37]">
          <div className="absolute inset-0 flex items-center justify-center">
            {articles.map((art, index) => (
              <div
                key={art.id}
                className="absolute w-[76%] h-full"
                style={getSlideStyle(index)}
              >
                <Link
                  href={`/articles/${art.slug}`}
                  className="block relative w-full h-full rounded-xl overflow-hidden group"
                >
                  {/* 이미지 (placeholder gradient → 실제 이미지로 교체) */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg,
                        hsl(${200 + index * 35}, 55%, 35%) 0%,
                        hsl(${220 + index * 35}, 45%, 20%) 100%)`,
                    }}
                  />
                  {/* 실제 이미지가 있으면 보여줌 */}
                  {art.thumbnail && !art.thumbnail.includes("placeholder") && (
                    <Image
                      src={art.thumbnail}
                      alt={art.title}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                  )}

                  {/* 하단 그라디언트 오버레이 (삼성 뉴스룸 패턴) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* 편집 버튼 (관리자 전용) */}
                  <div className="absolute top-4 right-4">
                    <AdminEditButton type="article" data={art} />
                  </div>

                  {/* 제목 텍스트 — 하단 좌측, 흰색 bold 30px */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-10">
                    <p className="text-white text-lg md:text-2xl lg:text-[28px] font-bold leading-tight group-hover:underline decoration-1 underline-offset-4">
                      {art.title}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Controls Bar — 삼성 뉴스룸: 좌측 페이지네이션 + 프로그레스바 + 화살표 + 재생 */}
        <div className="flex items-center gap-3 mt-3 px-4 md:px-8">
          {/* Page Counter: 01 / 04 */}
          <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums select-none">
            <span className="text-gray-900 font-bold">
              {String(current + 1).padStart(2, "0")}
            </span>
            <span className="text-gray-400 text-xs">
              {String(total).padStart(2, "0")}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 h-[2px] bg-gray-200 rounded-full max-w-[300px]">
            <div
              className="h-full bg-gray-900 rounded-full transition-none"
              style={{ width: `${progress}%` }}
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
