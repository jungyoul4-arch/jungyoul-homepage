"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const categoryOptions = [
  { value: "strategy", label: "입시전략" },
  { value: "column", label: "교육칼럼" },
  { value: "success", label: "합격스토리" },
  { value: "news", label: "공지사항" },
];

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "strategy",
    categoryLabel: "입시전략",
    slug: "",
    thumbnail: "",
    date: "",
    featured: false,
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/articles");
      const articles = await res.json();
      const article = articles.find((a: { id: string }) => a.id === id);
      if (article) {
        setForm({
          title: article.title,
          excerpt: article.excerpt,
          content: article.content || "",
          category: article.category,
          categoryLabel: article.categoryLabel,
          slug: article.slug,
          thumbnail: article.thumbnail || "",
          date: article.date,
          featured: !!article.featured,
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const categoryLabel = categoryOptions.find((c) => c.value === form.category)?.label || "";

    const res = await fetch(`/api/admin/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryLabel }),
    });

    if (res.ok) {
      router.push("/admin/articles");
    } else {
      alert("수정에 실패했습니다.");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">기사 수정</h1>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">슬러그 (URL)</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
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
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="text"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">요약</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
          <textarea
            value={form.content}
            onChange={(e) => update("content", e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">썸네일 경로</label>
          <input
            type="text"
            value={form.thumbnail}
            onChange={(e) => update("thumbnail", e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => update("featured", e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="featured" className="text-sm text-gray-700">주요 기사로 표시</label>
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
