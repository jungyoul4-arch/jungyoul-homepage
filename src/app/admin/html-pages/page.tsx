"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

interface HtmlPage {
  id: string;
  title: string;
  slug: string;
  date: string;
  hidden?: boolean;
}

export default function AdminHtmlPagesPage() {
  const [pages, setPages] = useState<HtmlPage[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/admin/html-pages");
      if (!res.ok) throw new Error();
      setPages(await res.json());
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" HTML 페이지를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/html-pages/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">HTML 페이지</h1>
        <Link
          href="/admin/html-pages/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          새 HTML 추가
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        원본 HTML 을 등록하면 <code className="px-1 bg-gray-100 rounded">/p/슬러그</code> 에서 전체화면(sandbox)으로 표시되고,
        메인 &quot;최신 교육정보&quot; 카드 목록에 날짜순으로 함께 노출됩니다.
      </p>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-48">슬러그</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">날짜</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-28">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 truncate max-w-xs">
                    {page.title}
                    {page.hidden && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded text-xs align-middle">숨김</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 truncate">/p/{page.slug}</td>
                  <td className="px-4 py-3 text-gray-500">{page.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="새 탭에서 보기"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <Link
                        href={`/admin/html-pages/${page.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(page.id, page.title)}
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
          {pages.length === 0 && (
            <p className="text-center text-gray-400 py-8">등록된 HTML 페이지가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
