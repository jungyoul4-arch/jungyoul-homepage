"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";
import { useCategoryOptions } from "@/hooks/use-category-options";

export default function EditUrlPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const categoryOptions = useCategoryOptions();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    category: "",
    excerpt: "",
    externalUrl: "",
    thumbnail: "",
    thumbnailOverlays: "",
    date: "",
    hidden: false,
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/url-pages");
      const pages = await res.json();
      const page = Array.isArray(pages)
        ? pages.find((p: { id: string }) => p.id === id)
        : null;
      if (page) {
        setForm({
          title: page.title,
          category: page.category || "",
          excerpt: page.excerpt || "",
          externalUrl: page.externalUrl || "",
          thumbnail: page.thumbnail || "",
          thumbnailOverlays: page.thumbnailOverlays || "",
          date: page.date,
          hidden: !!page.hidden,
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  function updateThumbnail(url: string, overlaysJson?: string) {
    setForm((prev) => ({ ...prev, thumbnail: url, thumbnailOverlays: overlaysJson ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//i.test(form.externalUrl.trim())) {
      alert("http(s):// 로 시작하는 외부 URL을 입력하세요.");
      return;
    }
    setSaving(true);

    // 선택한 카테고리로 카드 라벨을 자동 도출. 미지정("")이면 "링크"(레거시 표시 유지).
    const categoryLabel = categoryOptions.find((c) => c.value === form.category)?.label || "링크";

    const res = await fetch(`/api/admin/url-pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryLabel }),
    });

    if (res.ok) {
      router.push("/admin/url-pages");
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "수정에 실패했습니다.");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">URL 페이지 수정</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            >
              <option value="">미지정 (전체 탭만 노출)</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">메인 &quot;최신 교육정보&quot; 피드에서 이 카테고리 탭에 노출됩니다.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={form.date.replace(/\//g, "-")}
              onChange={(e) => update("date", e.target.value.replace(/-/g, "/"))}
              className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">외부 URL</label>
          <input
            type="url"
            value={form.externalUrl}
            onChange={(e) => update("externalUrl", e.target.value)}
            placeholder="https://example.com/page"
            className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            카드를 클릭하면 이 주소가 새 탭으로 열립니다. <code className="px-1 bg-gray-100 rounded">http://</code> 또는 <code className="px-1 bg-gray-100 rounded">https://</code> 로 시작해야 합니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">요약 (카드 메타)</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카드 썸네일</label>
          <ThumbnailUploader
            value={form.thumbnail}
            overlays={form.thumbnailOverlays}
            onChange={updateThumbnail}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.hidden}
            onChange={(e) => setForm((prev) => ({ ...prev, hidden: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300"
          />
          메인·목록·카테고리 페이지에서 숨기기 (콘텐츠는 보존됩니다)
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "수정 완료"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
