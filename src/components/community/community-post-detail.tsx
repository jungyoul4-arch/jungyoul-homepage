// STYLING: rough v1 — community tokens only (see globals.css @theme)
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CommunityPostDetail as Post } from "./types";
import { formatRelativeTime, nicknameHue } from "./format";
import { LikeButton } from "./like-button";

type MeResponse = { nickname: string | null; sessionId: string | null };

export function CommunityPostDetail({ post }: { post: Post }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hue = nicknameHue(post.nicknameSnapshot);

  useEffect(() => {
    fetch("/api/community/me")
      .then((r) => r.json() as Promise<MeResponse>)
      .then(setMe)
      .catch(() => setMe({ nickname: null, sessionId: null }));
  }, []);

  const isOwn = me?.sessionId === post.sessionId;

  async function handleDelete() {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.push("/community");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="border border-community-border rounded-md p-4 lg:p-6 bg-white">
      <div className="flex items-center gap-2 text-xs text-community-muted mb-3">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: `hsl(${hue}, 60%, 60%)` }}
          aria-hidden
        >
          {post.nicknameSnapshot.slice(0, 1)}
        </span>
        <span>{post.nicknameSnapshot}</span>
        <span>·</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
        {post.tag ? (
          <Link
            href={`/community?tag=${encodeURIComponent(post.tag)}`}
            className="ml-auto px-2 py-0.5 bg-community-surface text-community-accent rounded text-[11px]"
          >
            #{post.tag}
          </Link>
        ) : null}
      </div>

      <h1 className="text-lg lg:text-xl font-bold text-text-primary mb-4">{post.title}</h1>

      {post.imageUrl ? (
        <div className="relative w-full aspect-[16/9] mb-4 overflow-hidden rounded-sm bg-community-surface">
          <Image
            src={post.imageUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            unoptimized
            className="object-contain"
          />
        </div>
      ) : null}

      <div
        className="text-base text-text-primary leading-relaxed whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      <div className="mt-6 flex items-center gap-2">
        <LikeButton postId={post.id} initialCount={post.likeCount} />
        {isOwn && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-community-border text-sm text-community-muted hover:bg-community-surface disabled:opacity-50"
          >
            <Trash2 size={16} />
            삭제
          </button>
        )}
      </div>
    </article>
  );
}
