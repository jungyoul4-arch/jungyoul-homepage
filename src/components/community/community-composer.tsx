// STYLING: rough v1 — community tokens only (see globals.css @theme)
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import type { CommunityTag } from "./types";

type Props = { tags: CommunityTag[] };

const TITLE_MAX = 120;
const BODY_MAX = 5000;

const inputClass =
  "w-full h-9 px-3 border border-community-border rounded-sm text-sm bg-white focus:outline-none focus:border-community-accent";

export function CommunityComposer({ tags }: Props) {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 마운트 시 익명 세션 발급 + 닉네임 노출.
  useEffect(() => {
    fetch("/api/community/session", { method: "POST" })
      .then((r) => r.json() as Promise<{ nickname: string }>)
      .then((data) => setNickname(data.nickname))
      .catch(() => setNickname(null));
  }, []);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/community/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "이미지 업로드 실패");
        return;
      }
      setImageUrl(data.url as string);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      alert("제목과 본문을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          body: b,
          imageUrl: imageUrl || undefined,
          tag: tag || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "게시글 작성 실패");
        return;
      }
      router.push(`/community/${data.id as string}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-community-border rounded-md p-4 lg:p-6 bg-white">
      <div className="flex items-center gap-2 mb-4 text-xs text-community-muted">
        <span>작성 닉네임:</span>
        <span className="font-medium text-text-primary">
          {nickname ?? "로딩 중..."}
        </span>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-community-muted mb-1">태그</label>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className={`${inputClass} min-w-[120px]`}
          aria-label="태그"
        >
          <option value="">선택 안 함</option>
          {tags.map((t) => (
            <option key={t.id} value={t.value}>
              {t.value}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-community-muted mb-1">
          제목 ({title.length}/{TITLE_MAX})
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          maxLength={TITLE_MAX}
          placeholder="제목을 입력하세요"
          className={inputClass}
        />
      </div>

      <div className="mb-3">
        <label className="block text-xs text-community-muted mb-1">
          본문 ({body.length}/{BODY_MAX})
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
          maxLength={BODY_MAX}
          placeholder="내용을 입력하세요"
          rows={10}
          className="w-full min-h-[240px] px-3 py-2 border border-community-border rounded-sm text-sm bg-white focus:outline-none focus:border-community-accent"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs text-community-muted mb-1">이미지 (1장, 최대 10MB)</label>
        {imageUrl ? (
          <div className="relative w-full max-w-md aspect-[16/9] overflow-hidden rounded-sm border border-community-border bg-community-surface">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 480px"
              unoptimized
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 p-1 bg-white border border-community-border rounded-full"
              aria-label="이미지 제거"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-community-border rounded-md text-sm text-community-muted hover:bg-community-surface cursor-pointer">
            <ImagePlus size={16} />
            {uploading ? "업로드 중..." : "이미지 추가"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImagePick}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-community-accent text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-community-border text-sm text-community-muted rounded-md hover:bg-community-surface"
        >
          취소
        </button>
      </div>
    </form>
  );
}
