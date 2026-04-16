"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Pencil, X, ChevronDown, ChevronRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Eye, RefreshCw } from "lucide-react";

interface NavMenu {
  id: string;
  parentId: string | null;
  label: string;
  href: string;
  sortOrder: number;
}

interface ParentWithChildren {
  parent: NavMenu;
  children: NavMenu[];
}

function buildTree(items: NavMenu[]): ParentWithChildren[] {
  const parents = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return parents.map((p) => ({
    parent: p,
    children: items
      .filter((c) => c.parentId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

/* ── 메뉴 미리보기 컴포넌트 ── */
function MenuPreview({ tree }: { tree: ParentWithChildren[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredGroup = tree.find((t) => t.parent.id === hovered);
  const showSub = !!hoveredGroup && hoveredGroup.children.length > 0;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden"
      onMouseLeave={() => setHovered(null)}
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <Eye size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500">미리보기</span>
      </div>
      <div className="px-6 py-4">
        {/* 상위 메뉴 */}
        <div className="flex items-center gap-8 relative">
          {tree.map((group) => (
            <span
              key={group.parent.id}
              className={`relative text-[1rem] font-bold cursor-default transition-colors pb-2 ${
                hovered === group.parent.id ? "text-[#1E64FA]" : "text-[#1A1A1A]"
              }`}
              onMouseEnter={() => setHovered(group.parent.id)}
            >
              {group.parent.label}
              <span
                className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#1E64FA] transition-opacity duration-200 ${
                  hovered === group.parent.id ? "opacity-100" : "opacity-0"
                }`}
              />
            </span>
          ))}
        </div>
        {/* 하위 메뉴 — 호버된 그룹의 children만 표시 */}
        {showSub && (
          <div className="pt-4 border-t border-gray-100 mt-2">
            {hoveredGroup!.children.map((child) => (
              <span
                key={child.id}
                className="block py-1 text-[0.875rem] text-[#666666] cursor-default"
              >
                {child.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminNavMenusPage() {
  const router = useRouter();
  const [items, setItems] = useState<NavMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", href: "" });
  const [addParent, setAddParent] = useState(false);
  const [addChildFor, setAddChildFor] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", href: "" });
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [reordering, setReordering] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/nav-menus");
      const data: NavMenu[] = await res.json();
      setItems(data);
      setExpandedParents((prev) => {
        if (prev.size > 0) return prev;
        const parentIds = data.filter((i) => !i.parentId).map((i) => i.id);
        return new Set(parentIds);
      });
    } catch {
      // 네트워크 에러 시 기존 상태 유지
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleExpand(id: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd(parentId: string | null) {
    if (!form.label.trim() || !form.href.trim()) return;
    const res = await fetch("/api/admin/nav-menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: form.label, href: form.href, parentId }),
    });
    if (res.ok) {
      setForm({ label: "", href: "" });
      setAddParent(false);
      setAddChildFor(null);
      load();
    }
  }

  async function handleUpdate(id: string) {
    if (!editForm.label.trim() || !editForm.href.trim()) return;
    const res = await fetch(`/api/admin/nav-menus/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editForm.label, href: editForm.href }),
    });
    if (res.ok) {
      setEditId(null);
      load();
    }
  }

  async function handleDelete(id: string, label: string, isParent: boolean) {
    const msg = isParent
      ? `"${label}" 상위 메뉴와 하위 항목을 모두 삭제하시겠습니까?`
      : `"${label}" 항목을 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/admin/nav-menus/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  // 기본 메뉴 초기화 (DB가 비어 있을 때 fallback 데이터를 등록)
  async function handleInitDefaults() {
    if (!confirm("기본 메뉴(교육정보/선생님/FAQ/상담신청)를 등록하시겠습니까?")) return;

    const defaults = [
      { label: "교육정보", href: "/articles", children: [
        { label: "전체", href: "/articles" },
        { label: "입시전략", href: "/articles?category=strategy" },
        { label: "교육칼럼", href: "/articles?category=column" },
        { label: "합격스토리", href: "/articles?category=success" },
        { label: "공지사항", href: "/articles?category=news" },
      ]},
      { label: "선생님", href: "/teachers", children: [] },
      { label: "FAQ", href: "/faq", children: [] },
      { label: "상담신청", href: "/contact", children: [] },
    ];

    let anyFailed = false;
    for (const parent of defaults) {
      const res = await fetch("/api/admin/nav-menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: parent.label, href: parent.href, parentId: null }),
      });
      if (!res.ok) { anyFailed = true; continue; }
      const { id: parentId } = await res.json();
      for (const child of parent.children) {
        const cres = await fetch("/api/admin/nav-menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: child.label, href: child.href, parentId }),
        });
        if (!cres.ok) anyFailed = true;
      }
    }
    if (anyFailed) alert("일부 메뉴 등록에 실패했습니다. 결과를 확인하세요.");
    load();
  }

  // 순서 변경: 형제 항목 배열에서 위치를 swap 후 즉시 API 저장
  async function handleMove(targetId: string, direction: -1 | 1, parentId: string | null) {
    if (reordering) return;
    const siblings = items
      .filter((i) => (parentId === null ? !i.parentId : i.parentId === parentId))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idx = siblings.findIndex((s) => s.id === targetId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    setReordering(true);
    try {
      const reordered = [...siblings];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

      const res = await fetch("/api/admin/nav-menus/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
      if (res.ok) await load();
    } finally {
      setReordering(false);
    }
  }

  function startEdit(item: NavMenu) {
    setEditId(item.id);
    setEditForm({ label: item.label, href: item.href });
  }

  const tree = buildTree(items);

  const inputCls =
    "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
  const btnBlueSm =
    "flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors";

  function renderAddForm(parentId: string | null) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="이름"
          className={inputCls + " max-w-[160px]"}
        />
        <input
          type="text"
          value={form.href}
          onChange={(e) => setForm({ ...form, href: e.target.value })}
          placeholder="링크 (예: /articles)"
          className={inputCls + " max-w-[240px]"}
        />
        <button onClick={() => handleAdd(parentId)} className={btnBlueSm}>
          <Save size={14} /> 저장
        </button>
        <button
          onClick={() => { setAddParent(false); setAddChildFor(null); setForm({ label: "", href: "" }); }}
          className="p-1.5 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">메뉴 관리</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { router.refresh(); alert("헤더에 반영되었습니다."); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={16} />
            헤더에 반영
          </button>
          <button
            onClick={() => { setAddParent(true); setAddChildFor(null); setForm({ label: "", href: "" }); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            상위 메뉴 추가
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        상위 메뉴에 하위 항목이 있으면 마우스 오버 시 드롭다운으로 펼쳐집니다.
      </p>

      {/* 실시간 메뉴 미리보기 */}
      {!loading && tree.length > 0 && (
        <MenuPreview tree={tree} />
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="space-y-3">
          {tree.map(({ parent, children }) => (
            <div key={parent.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* 상위 메뉴 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <button
                  onClick={() => toggleExpand(parent.id)}
                  className="p-0.5 text-gray-400 hover:text-gray-600"
                >
                  {expandedParents.has(parent.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {editId === parent.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className={inputCls + " max-w-[160px]"}
                    />
                    <input
                      type="text"
                      value={editForm.href}
                      onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                      className={inputCls + " max-w-[240px]"}
                    />
                    <button onClick={() => handleUpdate(parent.id)} className={btnBlueSm}>
                      <Save size={14} /> 저장
                    </button>
                    <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 text-sm">{parent.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{parent.href}</span>
                      {children.length > 0 && (
                        <span className="text-xs text-blue-500 ml-2">하위 {children.length}개</span>
                      )}
                    </div>
                    {/* 순서 변경: 좌우 */}
                    <div className="flex items-center gap-0.5 mr-1">
                      <button
                        onClick={() => handleMove(parent.id, -1, null)}
                        className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={tree.findIndex((t) => t.parent.id === parent.id) === 0}
                        title="왼쪽으로 이동"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(parent.id, 1, null)}
                        className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={tree.findIndex((t) => t.parent.id === parent.id) === tree.length - 1}
                        title="오른쪽으로 이동"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    <button onClick={() => startEdit(parent)} className="p-1.5 text-gray-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(parent.id, parent.label, true)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* 하위 메뉴 */}
              {expandedParents.has(parent.id) && (
                <div className="px-4 py-2">
                  {children.length === 0 && addChildFor !== parent.id && (
                    <p className="text-xs text-gray-400 py-2 pl-6">하위 항목이 없습니다. 하위 항목을 추가하면 드롭다운이 활성화됩니다.</p>
                  )}
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center gap-3 py-2 pl-6 border-b border-gray-50 last:border-b-0">
                      {editId === child.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editForm.label}
                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                            className={inputCls + " max-w-[160px]"}
                          />
                          <input
                            type="text"
                            value={editForm.href}
                            onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                            className={inputCls + " max-w-[240px]"}
                          />
                          <button onClick={() => handleUpdate(child.id)} className={btnBlueSm}>
                            <Save size={14} /> 저장
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700">{child.label}</span>
                            <span className="text-xs text-gray-400 ml-2">{child.href}</span>
                          </div>
                          {/* 순서 변경: 상하 */}
                          <div className="flex items-center gap-0.5 mr-1">
                            <button
                              onClick={() => handleMove(child.id, -1, parent.id)}
                              className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={children.findIndex((c) => c.id === child.id) === 0}
                              title="위로 이동"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              onClick={() => handleMove(child.id, 1, parent.id)}
                              className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={children.findIndex((c) => c.id === child.id) === children.length - 1}
                              title="아래로 이동"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                          <button onClick={() => startEdit(child)} className="p-1.5 text-gray-400 hover:text-blue-600">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(child.id, child.label, false)}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {addChildFor === parent.id ? (
                    <div className="pl-6">{renderAddForm(parent.id)}</div>
                  ) : (
                    <button
                      onClick={() => { setAddChildFor(parent.id); setAddParent(false); setForm({ label: "", href: "" }); }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 py-2 pl-6 mt-1"
                    >
                      <Plus size={14} /> 하위 항목 추가
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {tree.length === 0 && !addParent && (
            <div className="text-center py-12 text-gray-400">
              <p>등록된 메뉴가 없습니다.</p>
              <p className="text-xs mt-1 mb-4">상위 메뉴를 추가하거나 기본 메뉴로 초기화하세요.</p>
              <button
                onClick={handleInitDefaults}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                <RotateCcw size={14} />
                기본 메뉴로 초기화
              </button>
            </div>
          )}

          {addParent && renderAddForm(null)}
        </div>
      )}
    </div>
  );
}
