"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Highlight } from "@/lib/data";

interface HighlightsCarouselProps {
  highlights: Highlight[];
}

export function HighlightsCarousel({ highlights }: HighlightsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-12 md:py-16 bg-gray-50" aria-label="하이라이트">
      <div className="max-w-[1280px] mx-auto px-4">
        {/* Header — 삼성 뉴스룸 "하이라이트" 스타일 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-[28px] font-bold text-gray-900">
            하이라이트
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-9 h-9 border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
              aria-label="이전"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-9 h-9 border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
              aria-label="다음"
            >
              <ChevronRight size={18} />
            </button>
            <Link
              href="/highlights"
              className="text-sm text-gray-500 hover:text-gray-900 ml-2 transition-colors"
            >
              더보기
            </Link>
          </div>
        </div>

        {/* Carousel — 삼성 뉴스룸 가로 스크롤 캐러셀 */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {highlights.map((item) => (
            <Link
              key={item.id}
              href={`/highlights/${item.slug}`}
              className="group shrink-0 w-[280px] md:w-[320px]"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[728/410] bg-gray-200 overflow-hidden rounded-sm">
                <div
                  className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg,
                      hsl(${parseInt(item.id) * 50 + 180}, 50%, 60%) 0%,
                      hsl(${parseInt(item.id) * 50 + 200}, 60%, 40%) 100%)`,
                  }}
                />
                {/* Overlay with title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="text-white font-bold text-lg">
                    {item.title}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
