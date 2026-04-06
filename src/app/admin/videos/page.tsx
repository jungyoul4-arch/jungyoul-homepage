"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Save } from "lucide-react";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
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
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export default function AdminVideosPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", youtubeInput: "" });

  async function load() {
    const res = await fetch("/api/videos");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((v) => {
            const thumb = v.thumbnail || youtubeThumbnail(v.youtubeId);
            return (
              <div
                key={v.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="relative aspect-video bg-gray-100">
                  <Image
                    src={thumb}
                    alt={v.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {v.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {v.youtubeId}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id, v.title)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
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
      )}
    </div>
  );
}
