"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface TrackingCode {
  id: string;
  name: string;
  code: string;
  position: string;
  enabled: boolean;
  createdAt: string;
}

const POSITIONS = [
  { value: "head", label: "<head>" },
  { value: "body-start", label: "<body> 시작" },
  { value: "body-end", label: "<body> 끝" },
];

export default function AdminTrackingCodesPage() {
  const [codes, setCodes] = useState<TrackingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TrackingCode | null>(null);
  const [isNew, setIsNew] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/tracking-codes");
      if (!res.ok) throw new Error();
      setCodes(await res.json());
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleNew() {
    setEditing({ id: "", name: "", code: "", position: "head", enabled: true, createdAt: "" });
    setIsNew(true);
  }

  function handleEdit(tc: TrackingCode) {
    setEditing({ ...tc });
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing) return;
    const method = isNew ? "POST" : "PUT";
    const url = isNew ? "/api/admin/tracking-codes" : `/api/admin/tracking-codes/${editing.id}`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        code: editing.code,
        position: editing.position,
        enabled: editing.enabled,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "저장 실패");
      return;
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 추적 코드를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/tracking-codes/${id}`, { method: "DELETE" });
    load();
  }

  async function handleToggle(tc: TrackingCode) {
    await fetch(`/api/admin/tracking-codes/${tc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !tc.enabled }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">추적 코드 관리</h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm text-amber-700">
        💡 추적 코드에 <code className="bg-amber-100 px-1 rounded">async</code> 또는 <code className="bg-amber-100 px-1 rounded">defer</code> 속성을 추가하면 페이지 로딩 속도에 영향을 주지 않습니다.
        {codes.length >= 5 && (
          <p className="mt-1 font-medium">⚠️ 추적 코드가 {codes.length}개입니다. 너무 많으면 성능이 저하될 수 있습니다.</p>
        )}
      </div>

      {editing && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {isNew ? "새 추적 코드" : "추적 코드 수정"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="예: Google Analytics"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">삽입 위치</label>
              <select
                value={editing.position}
                onChange={(e) => setEditing({ ...editing, position: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">코드</label>
              <textarea
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                rows={6}
                placeholder={'<script async src="..."></script>'}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                id="enabled"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">활성화</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Check size={14} /> 저장
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
              >
                <X size={14} /> 취소
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="space-y-3">
          {codes.map((tc) => (
            <div key={tc.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{tc.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    tc.position === "head" ? "bg-blue-100 text-blue-700" :
                    tc.position === "body-start" ? "bg-green-100 text-green-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    {POSITIONS.find((p) => p.value === tc.position)?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${tc.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {tc.enabled ? "활성" : "비활성"}
                  </span>
                </div>
                <pre className="text-xs text-gray-500 truncate max-w-lg font-mono">{tc.code.slice(0, 80)}...</pre>
              </div>
              <div className="flex items-center gap-1 ml-4 shrink-0">
                <button onClick={() => handleToggle(tc)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors" title={tc.enabled ? "비활성화" : "활성화"}>
                  {tc.enabled ? <Check size={15} /> : <X size={15} />}
                </button>
                <button onClick={() => handleEdit(tc)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(tc.id, tc.name)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {codes.length === 0 && (
            <p className="text-center text-gray-400 py-8">등록된 추적 코드가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
