"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Article {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  date: string;
  slug: string;
  featured: boolean;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/articles");
    setArticles(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 기사를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">기사 관리</h1>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          새 기사
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">카테고리</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">날짜</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">주요</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 truncate max-w-xs">
                    {article.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {article.categoryLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{article.date}</td>
                  <td className="px-4 py-3 text-center">
                    {article.featured ? "★" : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(article.id, article.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {articles.length === 0 && (
            <p className="text-center text-gray-400 py-8">등록된 기사가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
