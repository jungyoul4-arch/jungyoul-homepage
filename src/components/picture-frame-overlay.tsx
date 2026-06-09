"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type PFItem = {
  id: string;
  mediaType: "image" | "youtube";
  imageUrl: string | null;
  youtubeId: string | null;
  durationSec: number | null;
};

// ── YouTube IFrame Player API 최소 타입 선언 ──
interface YTPlayer {
  destroy(): void;
  playVideo(): void;
}
interface YTPlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number }) => void;
  };
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// iframe_api 스크립트는 1회만 로드. 여러 슬라이드가 공유.
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// 이미지 노출시간 진행바: 슬라이드마다 key 로 remount → mount 시 더블 rAF 로 scaleX(0)→scaleX(1)
// 전환을 트리거(초기 0% 프레임 paint 보장). transform 기반이라 GPU 컴포지팅, 매 프레임 리렌더 없음.
function ImageProgressBar({ durationSec }: { durationSec: number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFilled(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/20 overflow-hidden"
    >
      <div
        className="h-full w-full origin-left bg-white/80 will-change-transform"
        style={{
          transform: filled ? "scaleX(1)" : "scaleX(0)",
          transition: `transform ${durationSec}s linear`,
        }}
      />
    </div>
  );
}

export function PictureFrameOverlay({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<PFItem[]>([]);
  const [defaultInterval, setDefaultInterval] = useState(7);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // 터치(coarse pointer) 기기는 hover 가 없어 컨트롤을 항상 표시. 마우스는 가장자리 hover 시 등장.
  const [coarse, setCoarse] = useState(false);

  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setIndex((i) => (items.length ? (i + 1) % items.length : 0));
  }, [items.length]);
  const goPrev = useCallback(() => {
    setIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
  }, [items.length]);

  // 포인터 종류 감지 (터치=coarse → 컨트롤 항상 표시)
  useEffect(() => {
    setCoarse(window.matchMedia?.("(pointer: coarse)").matches ?? false);
  }, []);

  // 슬라이드 데이터 지연 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/picture-frames");
        const data = await res.json();
        if (cancelled) return;
        setItems((data.items ?? []) as PFItem[]);
        if (Number.isFinite(data.defaultIntervalSec)) setDefaultInterval(data.defaultIntervalSec);
      } catch {
        // 무시 — loaded 처리 후 빈 상태 안내
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 키보드: Esc 닫기 / ←→ 수동 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") advance();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, advance, goPrev]);

  // body 스크롤 잠금 + best-effort 네이티브 전체화면
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const current = items[index];
  // 이미지 노출시간(초): durationSec 우선, 없으면 전역 기본값. 재생 타이머와 진행바가 공유(드리프트 방지)
  const imageDurationSec =
    current?.durationSec && current.durationSec >= 1 ? current.durationSec : defaultInterval;

  // 현재 항목 재생 제어: 이미지=타이머, 유튜브=IFrame API(ENDED 시 전환)
  useEffect(() => {
    function clearAll() {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          /* noop */
        }
        ytPlayerRef.current = null;
      }
    }

    clearAll();
    if (!current) return;

    if (current.mediaType === "image") {
      // 항목이 1개뿐이면 전환 불필요(정지 화면)
      if (items.length > 1) {
        imageTimerRef.current = setTimeout(advance, imageDurationSec * 1000);
      }
      return clearAll;
    }

    // youtube
    let destroyed = false;
    loadYouTubeApi().then(() => {
      const host = ytHostRef.current;
      if (destroyed || !host || !window.YT?.Player || !current.youtubeId) return;
      // YT.Player 는 전달한 엘리먼트를 iframe 으로 치환하므로 매번 새 자식 div 사용
      host.innerHTML = "";
      const playerDiv = document.createElement("div");
      host.appendChild(playerDiv);

      ytPlayerRef.current = new window.YT.Player(playerDiv, {
        videoId: current.youtubeId,
        width: "100%",
        height: "100%",
        // 클릭(사용자 제스처)으로 열려 소리 자동재생 일반 허용.
        // 차단 환경에서 무음 재생을 원하면 playerVars 에 mute:1 추가.
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo();
            } catch {
              /* noop */
            }
          },
          onStateChange: (e) => {
            if (e.data === window.YT?.PlayerState.ENDED) {
              if (items.length > 1) advance();
              else
                try {
                  e.target.playVideo(); // 단일 영상이면 반복
                } catch {
                  /* noop */
                }
            }
          },
          onError: () => {
            if (items.length > 1) advance(); // 재생 불가 영상이면 다음으로
          },
        },
      });
    });

    return () => {
      destroyed = true;
      clearAll();
    };
  }, [current, defaultInterval, imageDurationSec, items.length, advance]);

  // 컨트롤 표시: 터치는 항상, 마우스는 해당 가장자리 hover/focus 시 등장
  const reveal = coarse
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

  return (
    <div className="fixed inset-0 z-[10000] bg-black">
      {/* 닫기 — 우상단 hover 존 (우측 '다음' 존보다 위에 와야 클릭 가로채임 방지 → z-30) */}
      <div className="group absolute top-0 right-0 w-40 h-24 z-30 flex items-start justify-end p-4">
        <button
          onClick={onClose}
          aria-label="닫기"
          className={`p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-opacity duration-200 ${reveal}`}
        >
          <X size={24} />
        </button>
      </div>

      {/* 스테이지 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!loaded ? (
          <span className="text-white/60 text-sm">불러오는 중...</span>
        ) : items.length === 0 ? (
          <span className="text-white/60 text-sm">등록된 콘텐츠가 없습니다.</span>
        ) : current?.mediaType === "image" && current.imageUrl ? (
          <div className="relative w-full h-full">
            <Image src={current.imageUrl} alt="" fill unoptimized className="object-contain" />
          </div>
        ) : current?.mediaType === "youtube" ? (
          <div className="w-full h-full max-w-[177.78vh] max-h-[56.25vw] aspect-video">
            <div ref={ytHostRef} className="w-full h-full" />
          </div>
        ) : null}
      </div>

      {/* 이미지 노출시간 진행바 — 맨 아래 풀너비, 이미지 + 2개 이상(타이머 동작)일 때만 */}
      {loaded && items.length > 1 && current?.mediaType === "image" && current.imageUrl && (
        <ImageProgressBar key={index} durationSec={imageDurationSec} />
      )}

      {/* 수동 이동 — 좌/우 가장자리 hover 존 + 인덱스 (2개 이상일 때) */}
      {items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="이전 콘텐츠"
            className="group absolute inset-y-0 left-0 w-1/6 min-w-[80px] z-20 flex items-center justify-start pl-4 focus:outline-none"
          >
            <span
              className={`p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-opacity duration-200 ${reveal}`}
            >
              <ChevronLeft size={28} />
            </span>
          </button>
          <button
            onClick={advance}
            aria-label="다음 콘텐츠"
            className="group absolute inset-y-0 right-0 w-1/6 min-w-[80px] z-20 flex items-center justify-end pr-4 focus:outline-none"
          >
            <span
              className={`p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-opacity duration-200 ${reveal}`}
            >
              <ChevronRight size={28} />
            </span>
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white/10 text-white text-xs">
            {index + 1} / {items.length}
          </div>
        </>
      )}
    </div>
  );
}
