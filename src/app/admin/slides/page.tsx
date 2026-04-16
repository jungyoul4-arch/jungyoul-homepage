"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Trash2, Save, GripVertical, X, ChevronDown, FileText, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

interface RawArticle {
  id: string;
  title: string;
  categoryLabel: string;
  date: string;
  thumbnail: string;
}

interface SlideItem {
  id: string;
  slideId: string;
  articleId: string;
  role: string;
  sortOrder: number;
}

interface Slide {
  id: string;
  sortOrder: number;
}

const categoryOptions = [
  { value: "strategy", label: "입시전략" },
  { value: "column", label: "교육칼럼" },
  { value: "success", label: "합격스토리" },
  { value: "news", label: "공지사항" },
];

const roleLabels: Record<string, string> = {
  main: "메인",
  "sub-image": "서브이미지",
  "sub-text": "서브텍스트",
};

const layoutLabel: Record<number, string> = {
  1: "풀사이즈 레이아웃",
  2: "2단 레이아웃 (메인 + 서브)",
  3: "4단 레이아웃 (메인 + 서브 + 텍스트)",
  4: "4단 레이아웃 (메인 + 서브 + 텍스트×2)",
};

export default function AdminSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [items, setItems] = useState<SlideItem[]>([]);
  const [articles, setArticles] = useState<RawArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Quick create article state: key = "slideId-itemIndex", value = form data
  const [quickCreate, setQuickCreate] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState({ title: "", excerpt: "", category: "strategy", thumbnail: "" });
  const [qcSaving, setQcSaving] = useState(false);

  // Preview state
  const [previewSlide, setPreviewSlide] = useState<string | null>(null);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/slides");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlides(data.slides);
      setItems(data.items);
      setArticles(data.articles);
    } catch {
      setSlides([]);
      setItems([]);
    } finally {
      setLoading(false);
      setOrderChanged(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function getSlideItems(slideId: string) {
    return items
      .filter((i) => i.slideId === slideId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function getArticle(articleId: string) {
    return articles.find((a) => a.id === articleId);
  }

  // --- CRUD ---
  async function handleAddSlide() {
    if (articles.length === 0) {
      alert("먼저 기사를 등록하세요.");
      return;
    }
    const res = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ articleId: articles[0].id, role: "main" }],
      }),
    });
    if (res.ok) {
      await load();
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    }
  }

  async function handleDeleteSlide(slideId: string) {
    if (!confirm("이 슬라이드를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/slides/${slideId}`, { method: "DELETE" });
    load();
  }

  async function saveSlideItems(slideId: string, newItems: { articleId: string; role: string }[]) {
    await fetch(`/api/admin/slides/${slideId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: newItems }),
    });
    load();
  }

  function handleAddSlot(slideId: string) {
    const current = getSlideItems(slideId);
    if (current.length >= 4) return;

    const hasSubImage = current.some((i) => i.role === "sub-image");
    const subTextCount = current.filter((i) => i.role === "sub-text").length;

    let role = "sub-image";
    if (hasSubImage) role = "sub-text";
    if (subTextCount >= 2 && hasSubImage) return;

    const newItems = [
      ...current.map((i) => ({ articleId: i.articleId, role: i.role })),
      { articleId: articles[0]?.id || "", role },
    ];
    saveSlideItems(slideId, newItems);
  }

  function handleRemoveSlot(slideId: string, itemIndex: number) {
    const current = getSlideItems(slideId);
    const target = current[itemIndex];
    if (!target) return;

    if (target.role === "main") {
      if (!confirm("메인 슬롯을 삭제하면 슬라이드가 삭제됩니다. 계속하시겠습니까?")) return;
      handleDeleteSlide(slideId);
      return;
    }

    const newItems = current
      .filter((_, idx) => idx !== itemIndex)
      .map((i) => ({ articleId: i.articleId, role: i.role }));
    saveSlideItems(slideId, newItems);
  }

  function handleChangeArticle(slideId: string, itemIndex: number, articleId: string) {
    const current = getSlideItems(slideId);
    const newItems = current.map((i, idx) => ({
      articleId: idx === itemIndex ? articleId : i.articleId,
      role: i.role,
    }));
    saveSlideItems(slideId, newItems);
  }

  function openQuickCreate(slideId: string, itemIndex: number) {
    setQuickCreate(`${slideId}-${itemIndex}`);
    setQcForm({ title: "", excerpt: "", category: "strategy", thumbnail: "" });
  }

  async function handleQuickCreate(slideId: string, itemIndex: number) {
    if (!qcForm.title.trim()) {
      alert("제목을 입력하세요.");
      return;
    }
    setQcSaving(true);
    try {
      const catLabel = categoryOptions.find((c) => c.value === qcForm.category)?.label || "";
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: qcForm.title,
          excerpt: qcForm.excerpt || qcForm.title,
          category: qcForm.category,
          categoryLabel: catLabel,
          thumbnail: qcForm.thumbnail,
          date: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
          slug: "",
          featured: false,
        }),
      });
      if (!res.ok) {
        alert("기사 생성에 실패했습니다.");
        return;
      }
      const { id: newArticleId } = await res.json();
      // 슬롯에 새 기사 배정
      const current = getSlideItems(slideId);
      const newItems = current.map((i, idx) => ({
        articleId: idx === itemIndex ? newArticleId : i.articleId,
        role: i.role,
      }));
      await saveSlideItems(slideId, newItems);
      setQuickCreate(null);
    } finally {
      setQcSaving(false);
    }
  }

  function handleChangeRole(slideId: string, itemIndex: number, role: string) {
    const current = getSlideItems(slideId);
    const newItems = current.map((i, idx) => ({
      articleId: i.articleId,
      role: idx === itemIndex ? role : i.role,
    }));
    saveSlideItems(slideId, newItems);
  }

  // --- Drag ---
  function handleDragStart(index: number) {
    dragItem.current = index;
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setInsertAt(e.clientY < midY ? index : index + 1);
  }

  function handleDrop() {
    if (dragItem.current === null || insertAt === null) {
      setDragIndex(null);
      setInsertAt(null);
      return;
    }
    let targetIndex = insertAt;
    if (targetIndex > dragItem.current) targetIndex--;
    if (targetIndex === dragItem.current) {
      setDragIndex(null);
      setInsertAt(null);
      return;
    }
    const updated = [...slides];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(targetIndex, 0, dragged);
    setSlides(updated);
    setOrderChanged(true);
    dragItem.current = null;
    setDragIndex(null);
    setInsertAt(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setInsertAt(null);
  }

  async function handleSaveOrder() {
    setSavingOrder(true);
    const res = await fetch("/api/admin/slides/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: slides.map((s) => s.id) }),
    });
    if (res.ok) setOrderChanged(false);
    else alert("순서 저장에 실패했습니다.");
    setSavingOrder(false);
  }

  function canAddSlot(slideId: string) {
    return getSlideItems(slideId).length < 4;
  }

  function availableRoles(slideId: string, currentRole: string) {
    const current = getSlideItems(slideId);
    const hasMain = current.some((i) => i.role === "main");
    const hasSubImage = current.some((i) => i.role === "sub-image");
    const subTextCount = current.filter((i) => i.role === "sub-text").length;

    const roles: string[] = [];
    if (!hasMain || currentRole === "main") roles.push("main");
    if (!hasSubImage || currentRole === "sub-image") roles.push("sub-image");
    if (subTextCount < 2 || currentRole === "sub-text") roles.push("sub-text");
    return roles;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">슬라이드 관리</h1>
        <div className="flex items-center gap-2">
          {orderChanged && (
            <button
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {savingOrder ? "저장 중..." : "순서 저장"}
            </button>
          )}
          <button
            onClick={handleAddSlide}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            슬라이드 추가
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          {orderChanged && (
            <p className="text-sm text-amber-600 mb-3">
              순서가 변경되었습니다. &quot;순서 저장&quot; 버튼을 눌러 저장하세요.
            </p>
          )}

          <div className="space-y-4">
            {slides.map((slide, index) => {
              const slideItems = getSlideItems(slide.id);
              const count = slideItems.length;
              const showBarTop =
                dragIndex !== null &&
                insertAt === index &&
                insertAt !== dragIndex &&
                insertAt !== dragIndex + 1;
              const showBarBottom =
                dragIndex !== null &&
                insertAt === index + 1 &&
                insertAt !== dragIndex &&
                insertAt !== dragIndex + 1;

              return (
                <div key={slide.id} className="relative">
                  {showBarTop && (
                    <div className="absolute -top-2.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
                  )}
                  {showBarBottom && (
                    <div className="absolute -bottom-2.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
                  )}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border border-gray-200 rounded-lg p-5 transition-all ${
                      dragIndex === index ? "opacity-40 scale-[0.98]" : ""
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-gray-300 cursor-grab" />
                        <span className="text-sm font-bold text-gray-900">
                          슬라이드 {index + 1}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {layoutLabel[count] || `슬롯 ${count}개`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    </div>

                    {/* Slots */}
                    <div className="space-y-2">
                      {slideItems.map((item, itemIdx) => {
                        const article = getArticle(item.articleId);
                        const missing = !article;

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              missing
                                ? "border-red-300 bg-red-50"
                                : "border-gray-100 bg-gray-50"
                            }`}
                          >
                            {/* Role number */}
                            <span className="text-xs font-bold text-gray-400 w-4 text-center shrink-0">
                              {itemIdx + 1}
                            </span>

                            {/* Role selector */}
                            <div className="relative shrink-0">
                              <select
                                value={item.role}
                                onChange={(e) =>
                                  handleChangeRole(slide.id, itemIdx, e.target.value)
                                }
                                className="h-8 pl-2 pr-6 text-xs font-medium border border-gray-300 rounded bg-white appearance-none focus:outline-none focus:border-blue-600"
                              >
                                {availableRoles(slide.id, item.role).map((r) => (
                                  <option key={r} value={r}>
                                    {roleLabels[r]}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={12}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                              />
                            </div>

                            {/* Article selector + quick create */}
                            <div className="flex-1 min-w-0">
                              <div className="flex gap-1.5">
                                <select
                                  value={item.articleId}
                                  onChange={(e) =>
                                    handleChangeArticle(slide.id, itemIdx, e.target.value)
                                  }
                                  className={`flex-1 h-8 px-2 text-sm border rounded bg-white appearance-none truncate focus:outline-none focus:border-blue-600 ${
                                    missing ? "border-red-300" : "border-gray-300"
                                  }`}
                                >
                                  {missing && (
                                    <option value={item.articleId}>
                                      ⚠ 삭제된 기사
                                    </option>
                                  )}
                                  {articles.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      [{a.categoryLabel}] {a.title} ({a.date})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => openQuickCreate(slide.id, itemIdx)}
                                  className="shrink-0 h-8 px-2 text-xs text-green-700 border border-green-300 rounded bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-1"
                                  title="새 기사 만들기"
                                >
                                  <FileText size={12} />
                                  새 기사
                                </button>
                              </div>

                              {/* Quick create inline form */}
                              {quickCreate === `${slide.id}-${itemIdx}` && (
                                <div className="mt-2 p-3 border border-green-200 rounded-lg bg-green-50/50 space-y-2">
                                  <p className="text-xs font-bold text-green-800">새 기사 빠른 생성</p>
                                  <input
                                    type="text"
                                    placeholder="제목 (필수)"
                                    value={qcForm.title}
                                    onChange={(e) => setQcForm({ ...qcForm, title: e.target.value })}
                                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                                  />
                                  <textarea
                                    placeholder="요약 (비워두면 제목과 동일)"
                                    value={qcForm.excerpt}
                                    onChange={(e) => setQcForm({ ...qcForm, excerpt: e.target.value })}
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-600 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <select
                                      value={qcForm.category}
                                      onChange={(e) => setQcForm({ ...qcForm, category: e.target.value })}
                                      className="h-8 px-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-600"
                                    >
                                      {categoryOptions.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="썸네일 URL (선택)"
                                      value={qcForm.thumbnail}
                                      onChange={(e) => setQcForm({ ...qcForm, thumbnail: e.target.value })}
                                      className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleQuickCreate(slide.id, itemIdx)}
                                      disabled={qcSaving}
                                      className="h-8 px-3 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                      {qcSaving ? "생성 중..." : "생성 및 배정"}
                                    </button>
                                    <button
                                      onClick={() => setQuickCreate(null)}
                                      className="h-8 px-3 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveSlot(slide.id, itemIdx)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                              title="슬롯 삭제"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Warning for missing articles */}
                    {slideItems.some((i) => !getArticle(i.articleId)) && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠ 삭제된 기사가 포함되어 있습니다. 다른 기사를 선택하세요.
                      </p>
                    )}

                    {/* Add slot + Preview toggle */}
                    <div className="flex items-center gap-2 mt-3">
                      {canAddSlot(slide.id) && (
                        <button
                          onClick={() => handleAddSlot(slide.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={12} />
                          슬롯 추가
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setPreviewSlide(previewSlide === slide.id ? null : slide.id)
                        }
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors ml-auto"
                      >
                        {previewSlide === slide.id ? (
                          <><EyeOff size={12} /> 미리보기 닫기</>
                        ) : (
                          <><Eye size={12} /> 미리보기</>
                        )}
                      </button>
                    </div>

                    {/* Layout Preview */}
                    {previewSlide === slide.id && (
                      <SlidePreview items={slideItems} getArticle={getArticle} />
                    )}
                  </div>
                </div>
              );
            })}

            {slides.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
                등록된 슬라이드가 없습니다. &quot;슬라이드 추가&quot; 버튼을 눌러 시작하세요.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Slide Layout Preview ─── */
function SlidePreview({
  items,
  getArticle,
}: {
  items: SlideItem[];
  getArticle: (id: string) => RawArticle | undefined;
}) {
  const count = items.length;
  const main = items.find((i) => i.role === "main") ?? items[0];
  const subImage = items.find((i) => i.role === "sub-image");
  const subTexts = items.filter((i) => i.role === "sub-text");

  const mainArt = main ? getArticle(main.articleId) : undefined;
  const subArt = subImage ? getArticle(subImage.articleId) : undefined;

  return (
    <div className="mt-3 p-3 bg-gray-900 rounded-lg">
      <p className="text-[10px] text-gray-400 mb-2">레이아웃 미리보기</p>

      {count === 1 && (
        /* Case05: Full-width */
        <div className="relative rounded-lg overflow-hidden" style={{ paddingTop: "37.428%" }}>
          <PreviewCard article={mainArt} label="메인" />
        </div>
      )}

      {count === 2 && (
        /* Case03: 2-column */
        <div className="grid gap-2" style={{ gridTemplateColumns: "77.573% 1fr" }}>
          <div className="relative rounded-lg overflow-hidden" style={{ paddingTop: "48.251%" }}>
            <PreviewCard article={mainArt} label="메인" />
          </div>
          <div className="relative rounded-lg overflow-hidden" style={{ height: "100%", minHeight: "60px" }}>
            <PreviewCard article={subArt} label="서브" />
          </div>
        </div>
      )}

      {count >= 3 && (
        /* Case01: 4-column */
        <div className="grid gap-2" style={{ gridTemplateColumns: "66.5719% 1fr" }}>
          <div className="relative rounded-lg overflow-hidden" style={{ paddingTop: "56.2232%" }}>
            <PreviewCard article={mainArt} label="메인" />
          </div>
          <div className="flex flex-col gap-2">
            {subImage && (
              <div className="relative rounded-lg overflow-hidden flex-1 min-h-[40px]">
                <PreviewCard article={subArt} label="서브이미지" />
              </div>
            )}
            {subTexts.map((t, idx) => {
              const art = getArticle(t.articleId);
              return (
                <div
                  key={t.id}
                  className="rounded-lg px-2 py-1.5 flex items-center min-h-[32px]"
                  style={{ backgroundColor: "#e0e9fe" }}
                >
                  <p className="text-[10px] text-gray-800 font-medium truncate">
                    {art?.title || `텍스트 ${idx + 1}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewCard({
  article,
  label,
}: {
  article?: RawArticle;
  label: string;
}) {
  const hasThumb = article?.thumbnail && article.thumbnail.length > 0;
  return (
    <div className="absolute inset-0 bg-gray-700 flex flex-col justify-end">
      {hasThumb && (
        <Image
          src={article.thumbnail}
          alt={article.title || ""}
          fill
          className="object-cover opacity-60"
          unoptimized
        />
      )}
      <div className="relative p-2 z-10">
        <p className="text-[9px] text-blue-300 font-semibold">{label}</p>
        <p className="text-[11px] text-white font-bold leading-tight truncate">
          {article?.title || "기사 없음"}
        </p>
      </div>
    </div>
  );
}
