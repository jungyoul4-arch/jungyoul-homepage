"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Tags } from "lucide-react";

interface ExamTagOption {
  id: string;
  tagType: "year" | "grade" | "subject";
  value: string;
  sortOrder: number;
}

type TagType = ExamTagOption["tagType"];

const SECTIONS: { type: TagType; label: string; placeholder: string }[] = [
  { type: "year", label: "연도", placeholder: "예: 2026" },
  { type: "grade", label: "학년", placeholder: "예: 고1" },
  { type: "subject", label: "과목", placeholder: "예: 국어" },
];

const inputClass =
  "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";

export default function AdminExamTagOptionsPage() {
  const [items, setItems] = useState<ExamTagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<Record<TagType, string>>({
    year: "",
    grade: "",
    subject: "",
  });
  const [submitting, setSubmitting] = useState<TagType | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/exam-tag-options");
      const data: ExamTagOption[] = await res.json();
      setItems(data);
    } catch {
      // 네트워크 에러 시 기존 상태 유지
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(type: TagType) {
    const value = draft[type].trim();
    if (!value) return;
    setSubmitting(type);
    try {
      const res = await fetch("/api/admin/exam-tag-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagType: type, value }),
      });
      if (res.ok) {
        setDraft((prev) => ({ ...prev, [type]: "" }));
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`등록 실패: ${data?.error ?? "알 수 없는 오류"}`);
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDelete(item: ExamTagOption) {
    if (!confirm(`"${item.value}" 항목을 삭제하시겠습니까? 이미 사용 중인 글의 태그 값은 그대로 유지됩니다.`))
      return;
    const res = await fetch(`/api/admin/exam-tag-options/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleMove(type: TagType, targetId: string, direction: -1 | 1) {
    if (reordering) return;
    const sorted = items
      .filter((it) => it.tagType === type)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === targetId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    setReordering(true);
    try {
      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      const res = await fetch("/api/admin/exam-tag-options/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
      if (res.ok) await load();
    } finally {
      setReordering(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Tags size={20} className="text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">시험 태그 옵션</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        /exam 페이지의 글에 부여할 연도·학년·과목 태그 값을 관리합니다. 여기에서 옵션을 추가하면
        새 글 작성·빠른 편집·`/exam` 필터에서 즉시 선택할 수 있습니다.
      </p>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SECTIONS.map((section) => {
            const sectionItems = items
              .filter((it) => it.tagType === section.type)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <div
                key={section.type}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-800">{section.label}</h2>
                </div>

                <ul className="divide-y divide-gray-100">
                  {sectionItems.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-gray-400">등록된 항목이 없습니다.</li>
                  ) : (
                    sectionItems.map((item, i) => (
                      <li
                        key={item.id}
                        className="px-4 py-2 flex items-center gap-2 text-sm text-gray-800"
                      >
                        <span className="flex-1 truncate">{item.value}</span>
                        <button
                          onClick={() => handleMove(section.type, item.id, -1)}
                          disabled={reordering || i === 0}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          aria-label="위로"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMove(section.type, item.id, 1)}
                          disabled={reordering || i === sectionItems.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          aria-label="아래로"
                        >
                          <ArrowDown size={14} />
                        </button>
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
                    value={draft[section.type]}
                    placeholder={section.placeholder}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [section.type]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdd(section.type);
                      }
                    }}
                    className={inputClass}
                  />
                  <button
                    onClick={() => handleAdd(section.type)}
                    disabled={
                      submitting === section.type || !draft[section.type].trim()
                    }
                    className="flex items-center gap-1 px-3 h-9 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 shrink-0"
                  >
                    <Plus size={14} />
                    추가
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
