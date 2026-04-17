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
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section
      className="overflow-hidden pt-20 pb-[120px] bg-media-bg"
      aria-label="정율TV"
    >
      <div className="max-w-[1480px] mx-auto px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[1.25rem] md:text-[1.5rem] font-bold text-[#1A1A1A] leading-8 tracking-[-0.045rem]">
            정율TV
          </h2>
          <div className="flex items-center">
            <button
              onClick={() => scroll("left")}
              className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
              aria-label="이전"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity ml-1"
              aria-label="다음"
            >
              <ChevronRight size={16} />
            </button>
            <span className="w-px h-4 bg-[#e0e0e0] mx-4" aria-hidden="true" />
            <a
              href="https://www.youtube.com/@jungyoulTV"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[1.125rem] font-bold text-[#1A1A1A] hover:text-[#0E41AD] transition-colors"
            >
              더보기
            </a>
          </div>
        </div>

        {/* Video Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {videos.map((video) => (
            <div
              key={video.id}
              className="relative shrink-0 w-[calc(20%-16px)] min-w-[200px]"
            >
              <div className="absolute top-2 right-2 z-10">
                <AdminEditButton type="video" data={video} />
              </div>
              <div className="relative aspect-video bg-gray-200 overflow-hidden rounded-lg group">
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
                    className="block w-full h-full"
                    aria-label={`${video.title} 재생`}
                  >
                    <div
                      className="absolute inset-0 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: placeholderGradient(video.id, "video"),
                      }}
                    />
                    {isValidThumbnail(video.thumbnail) && (
                      <Image
                        src={video.thumbnail.replace("hqdefault.jpg", "mqdefault.jpg")}
                        alt={video.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    )}
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center z-[1]">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Play size={18} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    {/* Title overlay with gradient */}
                    <div className="absolute bottom-0 left-0 w-full min-h-[30%] flex items-end p-4 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent z-[1]">
                      <span className="block w-full text-white text-lg md:text-xl font-bold truncate leading-snug">
                        {video.title}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
