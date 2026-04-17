"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Highlight } from "@/lib/data";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

interface HighlightsCarouselProps {
  highlights: Highlight[];
}

export function HighlightsCarousel({ highlights }: HighlightsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / highlights.length;
    container.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
    setCurrentIndex((prev) =>
      direction === "left"
        ? Math.max(0, prev - 1)
        : Math.min(highlights.length - 1, prev + 1)
    );
  };

  const displayIndex = String(currentIndex + 1).padStart(2, "0");
  const displayTotal = String(highlights.length).padStart(2, "0");

  return (
    <section
      className="bg-white overflow-hidden pb-[106px] max-[670px]:pb-14"
      aria-label="하이라이트"
    >
      <div className="max-w-[1480px] mx-auto px-10 max-[768px]:px-5">
        {/* Header — 삼성 뉴스룸 스타일 */}
        <div className="relative flex items-center mb-6">
          <h2 className="text-2xl max-[670px]:text-xl font-bold text-[#1a1a1a] leading-8 tracking-[-0.045rem]">
            하이라이트
          </h2>

          {/* Nav utils */}
          <div className="absolute right-[46px] flex items-center">
            <button
              onClick={() => scroll("left")}
              className="w-6 h-6 flex items-center justify-center text-[#1a1a1a] hover:text-[#666] transition-colors"
              aria-label="이전"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>

            {/* Page counter */}
            <div className="px-3 font-bold text-sm tracking-[-0.026rem] flex items-center">
              <span className="text-[#1a1a1a]">{displayIndex}</span>
              <span className="w-px h-[9px] bg-[#e0e0e0] mx-2" />
              <span className="text-[#666]">{displayTotal}</span>
            </div>

            <button
              onClick={() => scroll("right")}
              className="w-6 h-6 flex items-center justify-center text-[#1a1a1a] hover:text-[#666] transition-colors"
              aria-label="다음"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>

            {/* Divider */}
            <span className="w-px h-4 bg-[#e0e0e0] mx-4 pointer-events-none" />
          </div>

          {/* 더보기 link */}
          <Link
            href="/highlights"
            className="absolute right-0 text-lg font-bold text-[#1a1a1a] hover:text-[#0E41AD] flex items-center tracking-[-0.034rem] transition-colors"
          >
            더보기
          </Link>
        </div>

        {/* Carousel — 삼성 뉴스룸 3열 가로 스크롤 */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex -mr-5 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {highlights.map((item) => (
              <div
                key={item.id}
                className="relative shrink-0 mr-5 w-[calc((100%+20px)/3-20px)] max-[670px]:w-[calc(100%-12px)] max-[670px]:mr-3"
              >
                <div className="absolute top-2 right-2 z-10">
                  <AdminEditButton type="highlight" data={item} />
                </div>
                <Link
                  href={`/highlights/${item.slug}`}
                  className="group block"
                >
                  {/* Image — 16:9, rounded-lg */}
                  <div className="relative aspect-video bg-gray-200 overflow-hidden rounded-lg">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: placeholderGradient(item.id, "highlight"),
                      }}
                    />
                    {isValidThumbnail(item.thumbnail) && (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                      />
                    )}
                  </div>
                  {/* Title — 이미지 아래 (삼성 뉴스룸 패턴) */}
                  <p className="py-5 max-[670px]:py-3 text-[1.375rem] max-[670px]:text-base font-bold text-[#1a1a1a] leading-7 tracking-[-0.041rem] truncate">
                    {item.title}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
