"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
  sortOrder: number;
}

function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : trimmed;
}

function youtubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

export default function AdminVideosPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", youtubeInput: "" });
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null); // 삽입 슬롯 (카드 앞 = index, 카드 뒤 = index+1)

  async function load() {
    const res = await fetch("/api/videos");
    setItems(await res.json());
    setLoading(false);
    setOrderChanged(false);
  }

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- setState is inside async callback
  }, []);

  const parsedId = extractYoutubeId(form.youtubeInput);
  const previewAvailable = parsedId.length === 11;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const youtubeId = extractYoutubeId(form.youtubeInput);
    if (youtubeId.length !== 11) return;

    const res = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        youtubeId,
        thumbnail: youtubeThumbnail(youtubeId),
      }),
    });
    if (res.ok) {
      setForm({ title: "", youtubeInput: "" });
      setShowForm(false);
      load();
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 영상을 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
    load();
  }

  // Drag handlers
  function handleDragStart(index: number) {
    dragItem.current = index;
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const slot = e.clientX < midX ? index : index + 1;
    setInsertAt(slot);
  }

  function handleDrop() {
    if (dragItem.current === null || insertAt === null) {
      setDragIndex(null);
      setInsertAt(null);
      return;
    }

    let targetIndex = insertAt;
    // 자기 자신 앞뒤로 이동하는 경우 보정
    if (targetIndex > dragItem.current) targetIndex--;
    if (targetIndex === dragItem.current) {
      setDragIndex(null);
      setInsertAt(null);
      return;
    }

    const updated = [...items];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(targetIndex, 0, dragged);
    setItems(updated);
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
    const res = await fetch("/api/admin/videos/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items.map((v) => v.id) }),
    });
    if (res.ok) {
      setOrderChanged(false);
    } else {
      alert("순서 저장에 실패했습니다.");
    }
    setSavingOrder(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">영상 관리</h1>
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
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            추가
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-lg p-5 mb-6 max-w-lg space-y-3"
        >
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
            value={form.youtubeInput}
            onChange={(e) =>
              setForm({ ...form, youtubeInput: e.target.value })
            }
            placeholder="YouTube 링크 또는 ID (예: https://youtu.be/7usrDA98kL0)"
            className="w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            required
          />
          {previewAvailable && (
            <div className="relative aspect-video w-full max-w-xs rounded-sm overflow-hidden bg-gray-100">
              <Image
                src={youtubeThumbnail(parsedId)}
                alt="썸네일 미리보기"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}
          <button
            type="submit"
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Save size={14} /> 저장
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          {orderChanged && (
            <p className="text-sm text-amber-600 mb-3">
              순서가 변경되었습니다. &quot;순서 저장&quot; 버튼을 눌러 저장하세요.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((v, index) => {
              const thumb = v.thumbnail || youtubeThumbnail(v.youtubeId);
              const showBarLeft = dragIndex !== null && insertAt === index && insertAt !== dragIndex && insertAt !== dragIndex + 1;
              const showBarRight = dragIndex !== null && insertAt === index + 1 && insertAt !== dragIndex && insertAt !== dragIndex + 1;
              return (
                <div key={v.id} className="relative">
                  {/* 왼쪽 삽입 바 */}
                  {showBarLeft && (
                    <div className="absolute -left-2.5 top-0 bottom-0 w-1 bg-blue-500 rounded-full z-10" />
                  )}
                  {/* 오른쪽 삽입 바 */}
                  {showBarRight && (
                    <div className="absolute -right-2.5 top-0 bottom-0 w-1 bg-blue-500 rounded-full z-10" />
                  )}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border border-gray-200 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                      dragIndex === index ? "opacity-40 scale-95" : ""
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <Image
                        src={thumb}
                        alt={v.title}
                        fill
                        unoptimized
                        className="object-cover pointer-events-none"
                      />
                    </div>
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical
                          size={16}
                          className="text-gray-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {v.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {v.youtubeId}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(v.id, v.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-gray-400 col-span-3">
                등록된 영상이 없습니다.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
