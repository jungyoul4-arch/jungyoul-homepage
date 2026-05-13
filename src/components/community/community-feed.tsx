// STYLING: rough v1 — community tokens only (see globals.css @theme)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CommunityPostCard } from "./community-post-card";
import type { CommunityFeedPage, CommunityPostListItem } from "./types";

type Props = {
  initial: CommunityFeedPage;
  initialTag: string;
};

export function CommunityFeed({ initial, initialTag }: Props) {
  const sp = useSearchParams();
  const tag = sp.get("tag") ?? "";
  const [items, setItems] = useState<CommunityPostListItem[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initial.nextCursor === null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 태그 변경 시 리셋 (URL ?tag= 변경에 반응).
  useEffect(() => {
    if (tag === initialTag) return;
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setCursor(null);
    setDone(false);
    const qs = new URLSearchParams();
    if (tag) qs.set("tag", tag);
    fetch(`/api/community/posts?${qs.toString()}`)
      .then((r) => r.json() as Promise<CommunityFeedPage>)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setCursor(data.nextCursor);
        setDone(data.nextCursor === null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tag, initialTag]);

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (tag) qs.set("tag", tag);
      qs.set("cursor", cursor);
      const res = await fetch(`/api/community/posts?${qs.toString()}`);
      const data = (await res.json()) as CommunityFeedPage;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const it of data.items) {
          if (!seen.has(it.id)) merged.push(it);
        }
        return merged;
      });
      setCursor(data.nextCursor);
      if (data.nextCursor === null) setDone(true);
    } catch {
      // 네트워크 에러는 조용히 무시 — 다음 sentinel 트리거에서 재시도
    } finally {
      setLoading(false);
    }
  }, [loading, done, cursor, tag]);

  useEffect(() => {
    if (!sentinelRef.current || done) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

  if (items.length === 0 && !loading) {
    return (
      <div className="text-center text-community-muted py-12 text-sm">
        아직 게시글이 없어요. 첫 글을 작성해 보세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((post) => (
        <CommunityPostCard key={post.id} post={post} />
      ))}
      {!done && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-community-muted">
          {loading ? "불러오는 중..." : "스크롤하여 더 보기"}
        </div>
      )}
      {done && items.length > 0 && (
        <div className="py-6 text-center text-xs text-community-muted">
          마지막 게시글입니다.
        </div>
      )}
    </div>
  );
}
