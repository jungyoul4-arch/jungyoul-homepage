"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Plus, Trash2, Save, Pencil, ImageIcon, X, Upload } from "lucide-react";
import { isValidThumbnail } from "@/lib/thumbnail";

interface Teacher {
  id: string;
  name: string;
  subject: string;
  photo: string;
  slug: string;
}

const subjectOptions = ["국어", "수학", "영어", "탐구", "컨설팅"] as const;

export default function AdminTeachersPage() {
  const [items, setItems] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "국어",
    photo: "",
    slug: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    subject: "국어",
    photo: "",
    slug: "",
  });

  async function load() {
    const res = await fetch("/api/teachers");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", subject: "국어", photo: "", slug: "" });
      setShowForm(false);
      load();
    }
  }

  function startEdit(t: Teacher) {
    setEditingId(t.id);
    setEditForm({ name: t.name, subject: t.subject, photo: t.photo, slug: t.slug });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const res = await fetch(`/api/admin/teachers/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      alert("저장에 실패했습니다.");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 강사를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 관리</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-lg p-5 mb-6 max-w-lg space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="이름"
              className="h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
              required
            />
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600 bg-white"
              required
            >
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="슬러그 (비워두면 자동 생성)"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
          <PhotoUploader
            value={form.photo}
            onChange={(url) => setForm({ ...form, photo: url })}
          />
          <button
            type="submit"
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Save size={14} /> 저장
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) =>
            editingId === t.id ? (
              /* 수정 폼 */
              <form
                key={t.id}
                onSubmit={handleEdit}
                className="bg-white border-2 border-blue-400 rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="이름"
                    className="h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
                    required
                  />
                  <select
                    value={editForm.subject}
                    onChange={(e) =>
                      setEditForm({ ...editForm, subject: e.target.value })
                    }
                    className="h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm({ ...editForm, slug: e.target.value })
                  }
                  placeholder="슬러그 (비워두면 자동 생성)"
                  className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
                />
                <PhotoUploader
                  value={editForm.photo}
                  onChange={(url) =>
                    setEditForm({ ...editForm, photo: url })
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Save size={14} /> 저장
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </form>
            ) : (
              /* 기존 카드 */
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100">
                  {isValidThumbnail(t.photo) ? (
                    <Image
                      src={t.photo}
                      alt={`${t.name} 선생님`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                      <span className="text-gray-400 text-3xl font-bold">
                        {t.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {t.name} 선생님
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.subject}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="수정"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
          {items.length === 0 && (
            <p className="text-gray-400 col-span-3">
              등록된 강사가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 사진 업로드 컴포넌트 ── */
function PhotoUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "업로드에 실패했습니다.");
        return;
      }
      const { url } = await res.json();
      onChange(url);
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadFile(file);
        return;
      }
    }
    const text = e.clipboardData.getData("text/plain").trim();
    if (text && (text.startsWith("http") || text.startsWith("/"))) {
      e.preventDefault();
      onChange(text);
    }
  }

  const hasImage = value && value.length > 0;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        사진
      </label>
      {hasImage ? (
        <div className="relative group">
          <div className="relative aspect-square w-40 bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
            <Image
              src={value}
              alt="사진 미리보기"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
              title="변경"
            >
              <Upload size={13} className="text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
              title="삭제"
            >
              <X size={13} className="text-gray-700" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onPaste={handlePaste}
          tabIndex={0}
          className={`relative aspect-square w-40 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <p className="text-xs text-blue-600">업로드 중...</p>
          ) : (
            <>
              <ImageIcon size={24} className="text-gray-300 mb-1" />
              <p className="text-xs text-gray-500">클릭 또는 드래그</p>
              <p className="text-xs text-gray-400">Ctrl+V 붙여넣기</p>
            </>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </div>
  );
}
