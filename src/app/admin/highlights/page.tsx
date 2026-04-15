"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
  slug: string;
}

export default function AdminHighlightsPage() {
  const [items, setItems] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", thumbnail: "", slug: "" });

  async function load() {
    const res = await fetch("/api/highlights");
    setItems(await res.json());
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is inside async callback
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ title: "", thumbnail: "", slug: "" });
      setShowForm(false);
      load();
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 항목을 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/highlights/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">하이라이트 관리</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 max-w-lg space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="제목"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
          />
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="슬러그 (비워두면 자동 생성)"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
          <input
            type="text"
            value={form.thumbnail}
            onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
            placeholder="썸네일 경로"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
          />
          <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            <Save size={14} /> 저장
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">/{item.slug}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id, item.title)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-gray-400 col-span-3">등록된 하이라이트가 없습니다.</p>}
        </div>
      )}
    </div>
  );
}
