"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Pencil, X, ArrowUp, ArrowDown, Eye } from "lucide-react";
import {
  HEADER_LINK_ICON_NAMES,
  getHeaderLinkIcon,
} from "@/lib/header-link-icons";

interface HeaderLink {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  sortOrder: number;
}

function HeaderLinkPreview({ items }: { items: HeaderLink[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <Eye size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500">헤더 미리보기 (돋보기 왼편)</span>
      </div>
      <div className="px-6 py-4 flex flex-wrap items-center gap-2">
        {items.length === 0 ? (
          <span className="text-xs text-gray-400">등록된 버튼이 없습니다.</span>
        ) : (
          items.map((link) => {
            const Icon = getHeaderLinkIcon(link.icon);
            return (
              <span
                key={link.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E64FA] text-white text-xs font-medium rounded-full cursor-default"
              >
                <Icon size={14} />
                {link.label}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminHeaderLinksPage() {
  const [items, setItems] = useState<HeaderLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", href: "", icon: "" });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", href: "", icon: "" });
  const [reordering, setReordering] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/header-links");
      const data: HeaderLink[] = await res.json();
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

  async function handleAdd() {
    if (!form.label.trim() || !form.href.trim()) return;
    const res = await fetch("/api/admin/header-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        href: form.href,
        icon: form.icon || "",
      }),
    });
    if (res.ok) {
      setForm({ label: "", href: "", icon: "" });
      setAdding(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`등록 실패: ${data?.error ?? "알 수 없는 오류"}`);
    }
  }

  async function handleUpdate(id: string) {
    if (!editForm.label.trim() || !editForm.href.trim()) return;
    const res = await fetch(`/api/admin/header-links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editForm.label,
        href: editForm.href,
        icon: editForm.icon || "",
      }),
    });
    if (res.ok) {
      setEditId(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`수정 실패: ${data?.error ?? "알 수 없는 오류"}`);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`"${label}" 버튼을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/header-links/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleMove(targetId: string, direction: -1 | 1) {
    if (reordering) return;
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === targetId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    setReordering(true);
    try {
      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

      const res = await fetch("/api/admin/header-links/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
      if (res.ok) await load();
    } finally {
      setReordering(false);
    }
  }

  function startEdit(item: HeaderLink) {
    setEditId(item.id);
    setEditForm({ label: item.label, href: item.href, icon: item.icon ?? "" });
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const inputCls =
    "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
  const btnBlueSm =
    "flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors";

  function IconPreview({ name }: { name: string }) {
    const Icon = getHeaderLinkIcon(name);
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 bg-[#1E64FA] text-white rounded-full shrink-0"
        title={name || "기본(ExternalLink)"}
      >
        <Icon size={14} />
      </span>
    );
  }

  function renderForm(
    formState: { label: string; href: string; icon: string },
    setFormState: (v: { label: string; href: string; icon: string }) => void,
    onSave: () => void,
    onCancel: () => void
  ) {
    return (
      <div className="flex items-center flex-wrap gap-2 mt-2">
        <input
          type="text"
          value={formState.label}
          onChange={(e) => setFormState({ ...formState, label: e.target.value })}
          placeholder="라벨 (예: 학원 홈페이지)"
          className={inputCls + " max-w-[180px]"}
        />
        <input
          type="text"
          value={formState.href}
          onChange={(e) => setFormState({ ...formState, href: e.target.value })}
          placeholder="링크 (https://... 또는 /...)"
          className={inputCls + " max-w-[260px]"}
        />
        <input
          type="text"
          list="header-link-icon-names"
          value={formState.icon}
          onChange={(e) => setFormState({ ...formState, icon: e.target.value })}
          placeholder="아이콘 (선택)"
          className={inputCls + " max-w-[160px]"}
        />
        <IconPreview name={formState.icon} />
        <button onClick={onSave} className={btnBlueSm}>
          <Save size={14} /> 저장
        </button>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <datalist id="header-link-icon-names">
        {HEADER_LINK_ICON_NAMES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">헤더 링크 버튼</h1>
        <button
          onClick={() => {
            setAdding(true);
            setForm({ label: "", href: "", icon: "" });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          버튼 추가
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        상단 헤더 우측의 돋보기 아이콘 왼편(데스크탑) 또는 헤더 아래 우측(모바일)에 노출됩니다.
        모든 버튼은 새 탭에서 열립니다. 아이콘 이름은{" "}
        <a
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          lucide.dev
        </a>{" "}
        목록을 참고하되, 사전 등록된 아이콘({HEADER_LINK_ICON_NAMES.length}개) 이외 이름은 기본
        아이콘(ExternalLink)으로 표시됩니다.
      </p>

      {!loading && <HeaderLinkPreview items={sorted} />}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((link, idx) => (
            <div
              key={link.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <IconPreview name={link.icon ?? ""} />

                {editId === link.id ? (
                  <div className="flex-1">
                    {renderForm(
                      editForm,
                      setEditForm,
                      () => handleUpdate(link.id),
                      () => setEditId(null)
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 text-sm">{link.label}</span>
                      <span className="text-xs text-gray-400 ml-2 break-all">{link.href}</span>
                      {link.icon && (
                        <span className="text-xs text-gray-300 ml-2">아이콘: {link.icon}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 mr-1">
                      <button
                        onClick={() => handleMove(link.id, -1)}
                        className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === 0}
                        title="위로 이동"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(link.id, 1)}
                        className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === sorted.length - 1}
                        title="아래로 이동"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => startEdit(link)}
                      className="p-1.5 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id, link.label)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {sorted.length === 0 && !adding && (
            <div className="text-center py-12 text-gray-400">
              <p>등록된 버튼이 없습니다.</p>
              <p className="text-xs mt-1">상단의 &lsquo;버튼 추가&rsquo; 로 시작하세요.</p>
            </div>
          )}

          {adding && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              {renderForm(form, setForm, handleAdd, () => {
                setAdding(false);
                setForm({ label: "", href: "", icon: "" });
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
