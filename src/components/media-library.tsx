"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { AdminEditButton } from "./admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";
import { placeholderGradient } from "@/lib/utils";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
}

interface MediaLibraryProps {
  videos: Video[];
}

export function MediaLibrary({ videos }: MediaLibraryProps) {
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
    <section className="py-12 md:py-16" aria-label="정율TV">
      <div className="max-w-[1280px] mx-auto px-4">
        {/* Header — 삼성 뉴스룸 "미디어 라이브러리" 스타일 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-[28px] font-bold text-gray-900">
            정율TV
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
            <a
              href="https://www.youtube.com/@jungyoulTV"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-900 ml-2 transition-colors"
            >
              더보기
            </a>
          </div>
        </div>

        {/* Video Carousel — 삼성 뉴스룸 미디어 라이브러리 캐러셀 */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {videos.map((video) => (
            <div key={video.id} className="relative shrink-0 w-[280px] md:w-[352px]">
              <div className="absolute top-2 right-2 z-10">
                <AdminEditButton type="video" data={video} />
              </div>
            <a
              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              {/* Thumbnail with play button */}
              <div className="relative aspect-square bg-gray-200 overflow-hidden rounded-sm">
                <div
                  className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: placeholderGradient(video.id, "video"),
                  }}
                />
                {isValidThumbnail(video.thumbnail) && (
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                {/* Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Play size={24} className="text-white ml-1" fill="white" />
                  </div>
                </div>
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-sm font-medium line-clamp-2">
                    {video.title}
                  </p>
                </div>
              </div>
            </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
