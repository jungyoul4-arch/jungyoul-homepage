"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Plus, Trash2, Save, Pencil, X, ArrowUp, ArrowDown, Eye, Upload, ImageIcon } from "lucide-react";
import { getHeaderLinkIcon } from "@/lib/header-link-icons";
import { resizeImageFile } from "@/lib/image-resize";

interface HeaderLink {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

interface FormState {
  label: string;
  href: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = { label: "", href: "", imageUrl: "" };

function HeaderLinkPreview({ items }: { items: HeaderLink[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <Eye size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500">헤더 미리보기 (실제 노출 시안)</span>
      </div>
      <div className="px-6 py-4 flex flex-wrap items-center gap-2">
        {items.length === 0 ? (
          <span className="text-xs text-gray-400">등록된 버튼이 없습니다.</span>
        ) : (
          items.map((link) => (
            <span
              key={link.id}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-text-primary text-xs font-medium rounded-full cursor-default"
            >
              {renderButtonGlyph(link.imageUrl, link.icon)}
              {link.label}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

// 헤더 버튼 좌측 글리프 — 이미지 우선, 없으면 레거시 lucide 아이콘 폴백.
// 함수형 컴포넌트 대신 ReactNode 반환 헬퍼로 두어 react-hooks/static-components 룰 회피.
function renderButtonGlyph(imageUrl: string | null, icon: string | null): ReactNode {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={14}
        height={14}
        unoptimized
        className="object-contain"
      />
    );
  }
  return createElement(getHeaderLinkIcon(icon), { size: 14 });
}

export default function AdminHeaderLinksPage() {
  const [items, setItems] = useState<HeaderLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editLegacyIcon, setEditLegacyIcon] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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
        imageUrl: form.imageUrl || "",
      }),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
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
        imageUrl: editForm.imageUrl || "",
      }),
    });
    if (res.ok) {
      setEditId(null);
      setEditLegacyIcon(null);
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
    setEditForm({
      label: item.label,
      href: item.href,
      imageUrl: item.imageUrl ?? "",
    });
    setEditLegacyIcon(item.icon ?? null);
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const inputCls =
    "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
  const btnBlueSm =
    "flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">헤더 링크 버튼</h1>
        <button
          onClick={() => {
            setAdding(true);
            setForm(EMPTY_FORM);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          버튼 추가
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        상단 헤더 우측의 돋보기 아이콘 왼편(데스크탑) 또는 헤더 아래 좌측(모바일)에 노출됩니다.
        모든 버튼은 새 탭에서 열립니다. 라벨 왼쪽에 노출할 <strong>버튼 이미지</strong>를 업로드하세요
        (권장 40×40, png/svg/webp). 이미지를 올리지 않은 기존 항목은 자동으로 기본 외부링크 아이콘으로 표시됩니다.
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
              <div className="flex items-start gap-3 px-4 py-3">
                {renderGlyphThumb(link.imageUrl, link.icon)}

                {editId === link.id ? (
                  <div className="flex-1">
                    <LinkForm
                      formState={editForm}
                      setFormState={setEditForm}
                      legacyIcon={editLegacyIcon}
                      onSave={() => handleUpdate(link.id)}
                      onCancel={() => {
                        setEditId(null);
                        setEditLegacyIcon(null);
                      }}
                      inputCls={inputCls}
                      btnBlueSm={btnBlueSm}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 text-sm">{link.label}</span>
                      <span className="text-xs text-gray-400 ml-2 break-all">{link.href}</span>
                      {!link.imageUrl && link.icon && (
                        <span className="text-xs text-amber-600 ml-2">
                          이미지 없음 — 레거시 아이콘({link.icon}) 표시 중
                        </span>
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
              <LinkForm
                formState={form}
                setFormState={setForm}
                legacyIcon={null}
                onSave={handleAdd}
                onCancel={() => {
                  setAdding(false);
                  setForm(EMPTY_FORM);
                }}
                inputCls={inputCls}
                btnBlueSm={btnBlueSm}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 리스트 행 좌측 큰 미리보기 글리프 (40×40). ReactNode 반환 헬퍼.
function renderGlyphThumb(imageUrl: string | null, icon: string | null): ReactNode {
  if (imageUrl) {
    return (
      <div className="w-10 h-10 shrink-0 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
        <Image
          src={imageUrl}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 shrink-0 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400"
      title={icon ? `레거시 아이콘: ${icon}` : "이미지를 업로드하면 여기 표시됩니다"}
    >
      {createElement(getHeaderLinkIcon(icon), { size: 18 })}
    </div>
  );
}

interface LinkFormProps {
  formState: FormState;
  setFormState: (v: FormState) => void;
  legacyIcon: string | null;
  onSave: () => void;
  onCancel: () => void;
  inputCls: string;
  btnBlueSm: string;
}

function LinkForm({ formState, setFormState, legacyIcon, onSave, onCancel, inputCls, btnBlueSm }: LinkFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      // 헤더 글리프는 작게 표시(권장 40×40) — 긴 변 256 으로 충분.
      const uploadable = await resizeImageFile(file, { maxEdge: 256 });
      const fd = new FormData();
      fd.append("file", uploadable);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "업로드에 실패했습니다.");
        return;
      }
      const { url } = await res.json();
      setFormState({ ...formState, imageUrl: url });
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearImage() {
    setFormState({ ...formState, imageUrl: "" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center flex-wrap gap-2">
        <input
          type="text"
          value={formState.label}
          onChange={(e) => setFormState({ ...formState, label: e.target.value })}
          placeholder="라벨 (예: 학원 홈페이지)"
          className={inputCls + " max-w-[200px]"}
        />
        <input
          type="text"
          value={formState.href}
          onChange={(e) => setFormState({ ...formState, href: e.target.value })}
          placeholder="링크 (https://... 또는 /...)"
          className={inputCls + " max-w-[300px]"}
        />
        <button onClick={onSave} className={btnBlueSm} disabled={uploading}>
          <Save size={14} /> 저장
        </button>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600 w-16 shrink-0">버튼 이미지</span>
        {formState.imageUrl ? (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
              <Image
                src={formState.imageUrl}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="object-contain"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              <Upload size={12} /> 교체
            </button>
            <button
              onClick={clearImage}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              <X size={12} /> 제거
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
              <ImageIcon size={16} />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              <Upload size={12} /> {uploading ? "업로드 중..." : "이미지 업로드"}
            </button>
            {legacyIcon && (
              <span className="text-xs text-amber-600">
                레거시 아이콘({legacyIcon}) 사용 중 — 이미지를 올리면 대체됩니다
              </span>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
