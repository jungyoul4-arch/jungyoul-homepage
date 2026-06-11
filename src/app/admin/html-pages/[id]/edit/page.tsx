"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";

export default function EditHtmlPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    categoryLabel: "페이지",
    excerpt: "",
    content: "",
    thumbnail: "",
    thumbnailOverlays: "",
    date: "",
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/html-pages");
      const pages = await res.json();
      const page = Array.isArray(pages)
        ? pages.find((p: { id: string }) => p.id === id)
        : null;
      if (page) {
        setForm({
          title: page.title,
          slug: page.slug,
          categoryLabel: page.categoryLabel || "페이지",
          excerpt: page.excerpt || "",
          content: page.content || "",
          thumbnail: page.thumbnail || "",
          thumbnailOverlays: page.thumbnailOverlays || "",
          date: page.date,
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
    if (!form.content.trim()) {
      alert("HTML 소스를 입력하세요.");
      return;
    }
    setSaving(true);

    const res = await fetch(`/api/admin/html-pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push("/admin/html-pages");
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "수정에 실패했습니다.");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">HTML 페이지 수정</h1>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">슬러그 (URL)</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="비워두면 자동 생성 → /p/슬러그"
              className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            />
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카드 라벨</label>
            <input
              type="text"
              value={form.categoryLabel}
              onChange={(e) => update("categoryLabel", e.target.value)}
              placeholder="페이지"
              className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">요약 (카드 메타·SEO)</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML 소스</label>
          <textarea
            spellCheck={false}
            value={form.content}
            onChange={(e) => update("content", e.target.value)}
            rows={16}
            placeholder="<!doctype html> … 또는 <div>…</div> 같은 HTML 소스 전체를 붙여넣으세요"
            className="w-full font-mono text-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-600 transition-colors resize-y"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            등록한 HTML 이 <code className="px-1 bg-gray-100 rounded">/p/슬러그</code> 에서 전체화면으로 그대로 렌더됩니다(사이트 헤더/푸터 없음).
            CSS·이미지·스크립트가 모두 동작하며, 보안을 위해 sandbox iframe 으로 메인 사이트와 격리됩니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카드 썸네일</label>
          <ThumbnailUploader
            value={form.thumbnail}
            overlays={form.thumbnailOverlays}
            onChange={updateThumbnail}
            aspect="16:9"
          />
        </div>

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
