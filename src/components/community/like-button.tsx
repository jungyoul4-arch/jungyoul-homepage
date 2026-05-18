// STYLING: rough v1 — community tokens only (see globals.css @theme)
"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

type Props = {
  postId: string;
  initialCount: number;
};

type LikeResponse = { liked: boolean; count: number };

export function LikeButton({ postId, initialCount }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  // 마운트 시 현재 세션의 좋아요 상태 확인.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community/posts/${postId}/like`)
      .then((r) => r.json() as Promise<LikeResponse>)
      .then((data) => {
        if (cancelled) return;
        setLiked(data.liked);
        setCount(data.count);
      })
      .catch((e) => {
        console.error("좋아요 상태 로드 실패:", e);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleClick() {
    if (pending) return;
    // 옵티미스틱 업데이트
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    setPending(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as LikeResponse;
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      // 롤백
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
        liked
          ? "border-community-accent text-community-accent bg-community-surface"
          : "border-community-border text-community-muted hover:bg-community-surface"
      }`}
      aria-pressed={liked}
    >
      <Heart size={16} fill={liked ? "currentColor" : "none"} />
      <span>{count}</span>
    </button>
  );
}
