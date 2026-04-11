"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import { useAuth, type EditModalType } from "./auth-provider";
import { ContentEditor } from "./content-editor";
import { ThumbnailUploader } from "./thumbnail-uploader";

function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : trimmed;
}

function youtubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

const subjectOptions = ["국어", "수학", "영어", "탐구", "컨설팅"] as const;

const categoryOptions = [
  { value: "strategy", label: "입시전략" },
  { value: "column", label: "교육칼럼" },
  { value: "success", label: "합격스토리" },
  { value: "news", label: "공지사항" },
];

const apiMap: Record<EditModalType, string> = {
  article: "/api/admin/articles",
  highlight: "/api/admin/highlights",
  teacher: "/api/admin/teachers",
  video: "/api/admin/videos",
};

const titleMap: Record<EditModalType, string> = {
  article: "기사 편집",
  highlight: "하이라이트 편집",
  teacher: "강사 편집",
  video: "영상 편집",
};

const fetchMap: Record<EditModalType, string> = {
  article: "/api/articles",
  highlight: "/api/highlights",
  teacher: "/api/teachers",
  video: "/api/videos",
};

export function InlineEditModal() {
  const { editModal, closeEdit } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 모달 열릴 때 API에서 최신 데이터 fetch
  useEffect(() => {
    if (!editModal) return;

    const { type, data } = editModal;
    const id = data.id as string;

    // 우선 props 데이터로 폼을 채우고 (빠른 표시)
    setForm({ ...data });
    setConfirmDelete(false);
    setLoading(true);

    const controller = new AbortController();

    // API에서 최신 데이터를 가져와 덮어씌움
    fetch(fetchMap[type], { signal: controller.signal })
      .then((res) => res.json())
      .then((items: Record<string, unknown>[]) => {
        const latest = items.find((item) => item.id === id);
        if (latest) setForm({ ...latest });
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        // fetch 실패 시 props 데이터 유지
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [editModal]);

  useEffect(() => {
    if (!editModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeEdit();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editModal, closeEdit]);

  if (!editModal) return null;

  const { type, data } = editModal;
  const id = data.id as string;

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = { ...form };
      // article의 경우 categoryLabel 자동 생성
      if (type === "article" && body.category) {
        body.categoryLabel =
          categoryOptions.find((c) => c.value === body.category)?.label || "";
      }
      // video의 경우 youtubeId 파싱 + 자동 썸네일
      if (type === "video" && body.youtubeId) {
        const parsed = extractYoutubeId(body.youtubeId as string);
        body.youtubeId = parsed;
        body.thumbnail = youtubeThumbnail(parsed);
      }

      const res = await fetch(`${apiMap[type]}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        closeEdit();
        router.refresh();
      } else {
        alert("저장에 실패했습니다.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiMap[type]}/${id}`, { method: "DELETE" });
      if (res.ok) {
        closeEdit();
        router.refresh();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={closeEdit}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">{titleMap[type]}</h2>
          <button
            onClick={closeEdit}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-4">불러오는 중...</p>
          ) : (
            <>
              {type === "article" && <ArticleForm form={form} update={update} />}
              {type === "highlight" && <HighlightForm form={form} update={update} />}
              {type === "teacher" && <TeacherForm form={form} update={update} />}
              {type === "video" && <VideoForm form={form} update={update} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 bg-[#1E64FA] text-white text-sm font-medium rounded-md hover:bg-[#0E41AD] transition-colors disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={closeEdit}
              className="px-4 h-10 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={saving}
            className={`w-full h-9 text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-red-600 border border-red-200 hover:bg-red-50"
            }`}
          >
            <Trash2 size={14} />
            {confirmDelete ? "정말 삭제하시겠습니까?" : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Article Form ── */
function ArticleForm({
  form,
  update,
}: {
  form: Record<string, unknown>;
  update: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <Field label="제목">
        <input
          type="text"
          value={(form.title as string) || ""}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="슬러그 (URL)">
        <input
          type="text"
          value={(form.slug as string) || ""}
          onChange={(e) => update("slug", e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="카테고리">
          <select
            value={(form.category as string) || "strategy"}
            onChange={(e) => update("category", e.target.value)}
            className={inputClass}
          >
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="날짜">
          <input
            type="date"
            value={((form.date as string) || "").replace(/\//g, "-")}
            onChange={(e) => update("date", e.target.value.replace(/-/g, "/"))}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="요약">
        <textarea
          value={(form.excerpt as string) || ""}
          onChange={(e) => update("excerpt", e.target.value)}
          rows={2}
          className={textareaClass}
        />
      </Field>
      <Field label="본문">
        <ContentEditor
          value={(form.content as string) || ""}
          onChange={(val) => update("content", val)}
        />
      </Field>
      <Field label="썸네일">
        <ThumbnailUploader
          value={(form.thumbnail as string) || ""}
          onChange={(url) => update("thumbnail", url)}
        />
      </Field>
    </>
  );
}

/* ── Highlight Form ── */
function HighlightForm({
  form,
  update,
}: {
  form: Record<string, unknown>;
  update: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <Field label="제목">
        <input
          type="text"
          value={(form.title as string) || ""}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="슬러그">
        <input
          type="text"
          value={(form.slug as string) || ""}
          onChange={(e) => update("slug", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="썸네일">
        <ThumbnailUploader
          value={(form.thumbnail as string) || ""}
          onChange={(url) => update("thumbnail", url)}
        />
      </Field>
    </>
  );
}

/* ── Teacher Form ── */
function TeacherForm({
  form,
  update,
}: {
  form: Record<string, unknown>;
  update: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="이름">
          <input
            type="text"
            value={(form.name as string) || ""}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="과목">
          <select
            value={(form.subject as string) || "국어"}
            onChange={(e) => update("subject", e.target.value)}
            className={inputClass}
          >
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="슬러그">
        <input
          type="text"
          value={(form.slug as string) || ""}
          onChange={(e) => update("slug", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="사진">
        <ThumbnailUploader
          value={(form.photo as string) || ""}
          onChange={(url) => update("photo", url)}
        />
      </Field>
    </>
  );
}

/* ── Video Form ── */
function VideoForm({
  form,
  update,
}: {
  form: Record<string, unknown>;
  update: (field: string, value: unknown) => void;
}) {
  const raw = (form.youtubeId as string) || "";
  const parsedId = extractYoutubeId(raw);
  const previewAvailable = parsedId.length === 11;

  return (
    <>
      <Field label="제목">
        <input
          type="text"
          value={(form.title as string) || ""}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="YouTube 링크 또는 ID">
        <input
          type="text"
          value={raw}
          onChange={(e) => update("youtubeId", e.target.value)}
          placeholder="예: https://youtu.be/7usrDA98kL0"
          className={inputClass}
        />
      </Field>
      {previewAvailable && (
        <div className="relative aspect-video w-full max-w-xs rounded-sm overflow-hidden bg-gray-100">
          <Image
            src={youtubeThumbnail(parsedId)}
            alt="썸네일 미리보기"
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      )}
    </>
  );
}

/* ── Shared ── */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
const textareaClass =
  "w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
