"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  subject: string;
  photo: string;
  slug: string;
}

export default function AdminTeachersPage() {
  const [items, setItems] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", photo: "", slug: "" });

  async function load() {
    const res = await fetch("/api/teachers");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", subject: "", photo: "", slug: "" });
      setShowForm(false);
      load();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 강사를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 관리</h1>
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
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="이름"
              className="h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
              required
            />
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="과목 (국어, 수학 등)"
              className="h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
              required
            />
          </div>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="슬러그"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
          />
          <input
            type="text"
            value={form.photo}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
            placeholder="사진 경로"
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
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">과목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">슬러그</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t.subject}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.slug}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="text-center text-gray-400 py-8">등록된 강사가 없습니다.</p>}
        </div>
      )}
    </div>
  );
}
