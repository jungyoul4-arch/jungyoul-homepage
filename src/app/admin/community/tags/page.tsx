"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";

interface CommunityTag {
  id: string;
  value: string;
  sortOrder: number;
}

const inputClass =
  "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";

export default function AdminCommunityTagsPage() {
  const [items, setItems] = useState<CommunityTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/community/tags");
      const data: CommunityTag[] = await res.json();
      setItems(data);
    } catch {
      // 기존 상태 유지
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const value = draft.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/community/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        setDraft("");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`등록 실패: ${data?.error ?? "알 수 없는 오류"}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: CommunityTag) {
    if (
      !confirm(
        `"${item.value}" 태그를 삭제하시겠습니까? 이미 사용 중인 게시글의 태그 값은 그대로 유지됩니다.`
      )
    )
      return;
    const res = await fetch(`/api/admin/community/tags/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <TagIcon size={20} className="text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">커뮤니티 태그</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        /community 게시글의 태그 옵션을 관리합니다. 추가 즉시 글쓰기·필터에 노출됩니다. 태그 삭제는
        새 글에만 적용되며 기존 글의 태그 값은 보존됩니다.
      </p>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-md">
          <ul className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-400">등록된 태그가 없습니다.</li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="px-4 py-2 flex items-center gap-2 text-sm text-gray-800"
                >
                  <span className="flex-1 truncate">{item.value}</span>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    aria-label="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
            <input
              type="text"
              value={draft}
              placeholder="예: 진로"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className={inputClass}
            />
            <button
              onClick={handleAdd}
              disabled={submitting || !draft.trim()}
              className="flex items-center gap-1 px-3 h-9 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 shrink-0"
            >
              <Plus size={14} />
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
