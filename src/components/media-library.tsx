"use client";

import { useRef, useState } from "react";
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
  const [playingId, setPlayingId] = useState<string | null>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 312;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-12 md:py-16" aria-label="정율TV">
      <div className="max-w-[1280px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[1.25rem] md:text-[1.5rem] font-bold text-[#1A1A1A]">
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
              className="text-[1.125rem] font-bold text-[#1A1A1A] hover:text-[#0E41AD] ml-2 transition-colors"
            >
              더보기
            </a>
          </div>
        </div>

        {/* Video Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {videos.map((video) => (
            <div key={video.id} className="relative shrink-0 w-[280px] md:w-[300px]">
              <div className="absolute top-2 right-2 z-10">
                <AdminEditButton type="video" data={video} />
              </div>
              <div className="relative aspect-square bg-gray-200 overflow-hidden rounded-sm">
                {playingId === video.id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&mute=1`}
                    className="absolute inset-0 w-full h-full"
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    onClick={() => setPlayingId(video.id)}
                    className="group block w-full h-full"
                    aria-label={`${video.title} 재생`}
                  >
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
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Play size={20} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
              {/* Title below image — Samsung Newsroom style */}
              <p className="mt-2.5 text-[#1A1A1A] text-[0.9375rem] md:text-[1rem] font-bold line-clamp-2 leading-snug">
                {video.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
