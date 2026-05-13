"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ExternalLink } from "lucide-react";

interface CommunityPostRow {
  id: string;
  nicknameSnapshot: string;
  title: string;
  tag: string;
  likeCount: number;
  commentCount: number;
  isDeleted: boolean;
  createdAt: string;
}

export default function AdminCommunityPostsPage() {
  const [items, setItems] = useState<CommunityPostRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community/posts");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 게시글을 삭제하시겠습니까? (soft delete — 사용자에게는 404)`))
      return;
    const res = await fetch(`/api/admin/community/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">커뮤니티 게시글 모더레이션</h1>
        <Link
          href="/community"
          target="_blank"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ExternalLink size={14} />
          공개 페이지 열기
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        soft-deleted 게시글도 표시됩니다. 강제 삭제는 좋아요·댓글과 함께 사용자에게 숨겨집니다.
      </p>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">닉네임</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">태그</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">좋아요</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">댓글</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">작성</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id} className={p.isDeleted ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 text-gray-900 truncate max-w-xs">
                    <Link
                      href={p.isDeleted ? "#" : `/community/${p.id}`}
                      target="_blank"
                      className={p.isDeleted ? "text-gray-400" : "hover:text-blue-600"}
                    >
                      {p.title}
                      {p.isDeleted && <span className="ml-2 text-xs text-red-500">(삭제됨)</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700 truncate">{p.nicknameSnapshot}</td>
                  <td className="px-4 py-3">
                    {p.tag ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {p.tag}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.likeCount}</td>
                  <td className="px-4 py-3 text-gray-700">{p.commentCount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.createdAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.isDeleted ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="text-center text-gray-400 py-8">게시글이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
