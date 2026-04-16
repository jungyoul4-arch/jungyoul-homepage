"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import Image from "next/image";
import { isValidThumbnail } from "@/lib/thumbnail";

interface ArticleSummary {
  id: string;
  title: string;
  categoryLabel: string;
  date: string;
  thumbnail: string;
}

interface PinnedSlot {
  slot: number;
  articleId: string;
}

const SLOT_COUNT = 4;

export default function AdminPinnedArticlesPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});

  useEffect(() => {
    async function init() {
      try {
        const [articlesRes, pinnedRes] = await Promise.all([
          fetch("/api/articles"),
          fetch("/api/pinned-articles"),
        ]);
        const articlesData: ArticleSummary[] = await articlesRes.json().catch(() => []);
        const pinnedData: PinnedSlot[] = await pinnedRes.json().catch(() => []);

        setArticles(articlesData);

        const newSlots: (string | null)[] = Array(SLOT_COUNT).fill(null);
        for (const p of pinnedData) {
          if (p.slot >= 1 && p.slot <= SLOT_COUNT) {
            newSlots[p.slot - 1] = p.articleId;
          }
        }
        setSlots(newSlots);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function setSlot(index: number, articleId: string | null) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = articleId;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const payload = slots
      .map((articleId, i) => (articleId ? { slot: i + 1, articleId } : null))
      .filter((s): s is PinnedSlot => s !== null);

    const res = await fetch("/api/admin/pinned-articles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: payload }),
    });

    if (res.ok) {
      alert("저장되었습니다.");
    } else {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  }

  function getArticle(id: string | null): ArticleSummary | undefined {
    if (!id) return undefined;
    return articles.find((a) => a.id === id);
  }

  function getFilteredArticles(slotIndex: number): ArticleSummary[] {
    const query = (searchQuery[slotIndex] || "").toLowerCase();
    const usedIds = new Set(slots.filter((s): s is string => s !== null));
    return articles
      .filter((a) => !usedIds.has(a.id) || a.id === slots[slotIndex])
      .filter((a) => !query || a.title.toLowerCase().includes(query) || a.categoryLabel.toLowerCase().includes(query));
  }

  if (loading) return <p className="text-gray-500 p-8">불러오는 중...</p>;
  if (loadError) return <p className="text-red-500 p-8">데이터를 불러오지 못했습니다. 페이지를 새로고침하세요.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">메인 고정 기사</h1>
          <p className="text-sm text-gray-500 mt-1">메인 페이지 전체 탭 상위에 고정 표시할 기사 4개를 설정합니다.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loadError}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className="space-y-4">
        {slots.map((articleId, index) => {
          const article = getArticle(articleId);
          const filtered = getFilteredArticles(index);

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {index + 1}번째 고정 기사
                </span>
              </div>

              {article ? (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                  <div className="w-[100px] h-[56px] shrink-0 rounded overflow-hidden relative bg-gray-200">
                    {isValidThumbnail(article.thumbnail) && (
                      <Image
                        src={article.thumbnail}
                        alt={article.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-blue-600">{article.categoryLabel}</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                    <span className="text-xs text-gray-400">{article.date}</span>
                  </div>
                  <button
                    onClick={() => setSlot(index, null)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                    title="해제"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={searchQuery[index] || ""}
                    onChange={(e) => setSearchQuery((prev) => ({ ...prev, [index]: e.target.value }))}
                    placeholder="기사 제목으로 검색..."
                    className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600 mb-2"
                  />
                  <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-sm">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-gray-400 p-3 text-center">검색 결과가 없습니다.</p>
                    ) : (
                      filtered.slice(0, 20).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setSlot(index, a.id);
                            setSearchQuery((prev) => ({ ...prev, [index]: "" }));
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          <div className="w-[60px] h-[34px] shrink-0 rounded overflow-hidden relative bg-gray-100">
                            {isValidThumbnail(a.thumbnail) && (
                              <Image
                                src={a.thumbnail}
                                alt={a.title}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-blue-600">{a.categoryLabel}</span>
                            <p className="text-sm text-gray-900 truncate">{a.title}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
