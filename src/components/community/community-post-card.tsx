// STYLING: rough v1 — community tokens only (see globals.css @theme)
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, ImageIcon } from "lucide-react";
import type { CommunityPostListItem } from "./types";
import { formatRelativeTime, nicknameHue } from "./format";
import { thumbSrc } from "@/lib/thumbnail";

type Props = { post: CommunityPostListItem };

export function CommunityPostCard({ post }: Props) {
  const hue = nicknameHue(post.nicknameSnapshot);
  return (
    <Link
      href={`/community/${post.id}`}
      className="block border border-community-border rounded-md p-4 bg-white hover:bg-community-surface transition-colors"
    >
      <div className="flex items-center gap-2 text-xs text-community-muted mb-2">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold"
          style={{ backgroundColor: `hsl(${hue}, 60%, 60%)` }}
          aria-hidden
        >
          {post.nicknameSnapshot.slice(0, 1)}
        </span>
        <span className="truncate max-w-[8rem]">{post.nicknameSnapshot}</span>
        <span>·</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
        {post.tag ? (
          <>
            <span>·</span>
            <span className="px-2 py-0.5 bg-community-surface text-community-accent rounded text-[11px]">
              {post.tag}
            </span>
          </>
        ) : null}
      </div>

      <h3 className="text-base font-semibold text-text-primary mb-1 truncate">
        {post.title}
      </h3>
      <p className="text-sm text-community-muted line-clamp-2 mb-3">
        {post.bodyPreview}
      </p>

      {post.hasImage && post.imageUrl ? (
        <div className="relative w-full aspect-[16/9] mb-3 overflow-hidden rounded-sm bg-community-surface">
          <Image
            src={thumbSrc(post.imageUrl, 1280)}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-4 text-xs text-community-muted">
        <span className="inline-flex items-center gap-1">
          <Heart size={16} />
          {post.likeCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={16} />
          {post.commentCount}
        </span>
        {post.hasImage && !post.imageUrl ? (
          <span className="inline-flex items-center gap-1">
            <ImageIcon size={16} />
            이미지
          </span>
        ) : null}
      </div>
    </Link>
  );
}
