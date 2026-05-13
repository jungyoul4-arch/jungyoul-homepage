// STYLING: rough v1 — community tokens only (see globals.css @theme)
"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { CommunityComment } from "./types";
import { formatRelativeTime, nicknameHue } from "./format";

type Props = { postId: string };

const COMMENT_MAX = 1000;

type MeResponse = { nickname: string | null; sessionId: string | null };

export function CommunityComments({ postId }: Props) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      const data = (await res.json()) as CommunityComment[];
      setComments(data);
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/community/session", { method: "POST" })
      .then(() => fetch("/api/community/me"))
      .then((r) => r.json() as Promise<MeResponse>)
      .then(setMe)
      .catch(() => setMe({ nickname: null, sessionId: null }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "댓글 등록 실패");
        return;
      }
      setBody("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/community/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "삭제에 실패했습니다.");
      return;
    }
    load();
  }

  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-text-primary mb-3">
        댓글 {loading ? "" : `(${comments.length})`}
      </h2>

      <form onSubmit={handleSubmit} className="mb-4 border border-community-border rounded-md p-3 bg-white">
        <div className="flex items-center gap-2 mb-2 text-xs text-community-muted">
          <span>내 닉네임:</span>
          <span className="font-medium text-text-primary">{me?.nickname ?? "로딩 중..."}</span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, COMMENT_MAX))}
          maxLength={COMMENT_MAX}
          placeholder="댓글을 입력하세요"
          rows={3}
          className="w-full px-3 py-2 border border-community-border rounded-sm text-sm bg-white focus:outline-none focus:border-community-accent"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-community-muted">
            {body.length}/{COMMENT_MAX}
          </span>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="px-4 py-1.5 bg-community-accent text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "댓글 등록"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-community-muted">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-community-muted py-4 text-center">
          첫 댓글을 남겨보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const hue = nicknameHue(c.nicknameSnapshot);
            const isOwn = me?.sessionId === c.sessionId;
            return (
              <li
                key={c.id}
                className="border border-community-border rounded-md p-3 bg-white"
              >
                <div className="flex items-center gap-2 text-xs text-community-muted mb-1">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                    style={{ backgroundColor: `hsl(${hue}, 60%, 60%)` }}
                    aria-hidden
                  >
                    {c.nicknameSnapshot.slice(0, 1)}
                  </span>
                  <span>{c.nicknameSnapshot}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(c.createdAt)}</span>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto p-1 text-community-muted hover:text-red-600"
                      aria-label="댓글 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div
                  className="text-sm text-text-primary whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: c.body }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
