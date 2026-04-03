"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
}

export default function AdminVideosPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", youtubeId: "", thumbnail: "" });

  async function load() {
    const res = await fetch("/api/videos");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ title: "", youtubeId: "", thumbnail: "" });
      setShowForm(false);
      load();
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 영상을 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">영상 관리</h1>
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
            value={form.youtubeId}
            onChange={(e) => setForm({ ...form, youtubeId: e.target.value })}
            placeholder="YouTube ID (예: 7usrDA98kL0)"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
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
          {items.map((v) => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {v.youtubeId}</p>
                </div>
                <button
                  onClick={() => handleDelete(v.id, v.title)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-gray-400 col-span-3">등록된 영상이 없습니다.</p>}
        </div>
      )}
    </div>
  );
}
