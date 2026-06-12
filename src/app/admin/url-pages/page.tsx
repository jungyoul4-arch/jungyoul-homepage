"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

interface UrlPage {
  id: string;
  title: string;
  externalUrl: string;
  date: string;
  hidden?: boolean;
}

export default function AdminUrlPagesPage() {
  const [pages, setPages] = useState<UrlPage[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/admin/url-pages");
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
    if (!confirm(`"${title}" URL 페이지를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/url-pages/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">URL 페이지</h1>
        <Link
          href="/admin/url-pages/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          새 URL 추가
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        외부 URL·카테고리·썸네일을 등록하면 메인 &quot;최신 교육정보&quot; 카드 목록에 날짜순으로 노출되고,
        카드를 클릭하면 등록한 외부 페이지가 새 탭으로 열립니다.
      </p>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-64">외부 URL</th>
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
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{page.externalUrl}</td>
                  <td className="px-4 py-3 text-gray-500">{page.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={page.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="새 탭에서 열기"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <Link
                        href={`/admin/url-pages/${page.id}/edit`}
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
            <p className="text-center text-gray-400 py-8">등록된 URL 페이지가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
