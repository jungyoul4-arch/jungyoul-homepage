"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Save,
  Pencil,
  X,
  ArrowUp,
  ArrowDown,
  Upload,
  ImageIcon,
  Video,
  Clock,
} from "lucide-react";
import { parseYouTubeId } from "@/lib/youtube";

type MediaType = "image" | "youtube";

interface PFItem {
  id: string;
  mediaType: MediaType;
  imageUrl: string | null;
  youtubeId: string | null;
  durationSec: number | null;
  sortOrder: number;
}

interface FormState {
  mediaType: MediaType;
  imageUrl: string;
  youtubeUrl: string;
  durationSec: number;
}

const DEFAULT_DURATION = 7;
const emptyForm = (durationSec = DEFAULT_DURATION): FormState => ({
  mediaType: "image",
  imageUrl: "",
  youtubeUrl: "",
  durationSec,
});

export default function AdminPictureFramesPage() {
  const [items, setItems] = useState<PFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [reordering, setReordering] = useState(false);
  const [defaultInterval, setDefaultInterval] = useState<number>(DEFAULT_DURATION);
  const [savingInterval, setSavingInterval] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/picture-frames");
      const data = await res.json();
      setItems((data.items ?? []) as PFItem[]);
      if (Number.isFinite(data.defaultIntervalSec)) {
        setDefaultInterval(data.defaultIntervalSec);
      }
    } catch {
      // 네트워크 에러 시 기존 상태 유지
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 폼 → API payload 변환. 유튜브는 URL 에서 ID 추출, 실패 시 null 반환(저장 중단).
  function toPayload(f: FormState): Record<string, unknown> | null {
    if (f.mediaType === "youtube") {
      const id = parseYouTubeId(f.youtubeUrl);
      if (!id) {
        alert("유효한 유튜브 URL 이 아닙니다. (예: https://youtu.be/xxxxxxxxxxx)");
        return null;
      }
      return { mediaType: "youtube", youtubeId: id, imageUrl: "", durationSec: f.durationSec };
    }
    if (!f.imageUrl) {
      alert("이미지를 업로드하세요.");
      return null;
    }
    return { mediaType: "image", imageUrl: f.imageUrl, youtubeId: "", durationSec: f.durationSec };
  }

  async function handleAdd() {
    const payload = toPayload(form);
    if (!payload) return;
    const res = await fetch("/api/admin/picture-frames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setForm(emptyForm(defaultInterval));
      setAdding(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`등록 실패: ${data?.error ?? "알 수 없는 오류"}`);
    }
  }

  async function handleUpdate(id: string) {
    const payload = toPayload(editForm);
    if (!payload) return;
    const res = await fetch(`/api/admin/picture-frames/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditId(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`수정 실패: ${data?.error ?? "알 수 없는 오류"}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/picture-frames/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("삭제 중 오류가 발생했습니다.");
  }

  async function handleMove(targetId: string, direction: -1 | 1) {
    if (reordering) return;
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === targetId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    setReordering(true);
    try {
      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      const res = await fetch("/api/admin/picture-frames/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
      if (res.ok) await load();
    } finally {
      setReordering(false);
    }
  }

  async function saveInterval() {
    setSavingInterval(true);
    try {
      const res = await fetch("/api/admin/picture-frames/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultIntervalSec: defaultInterval }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`저장 실패: ${data?.error ?? "알 수 없는 오류"}`);
      }
    } finally {
      setSavingInterval(false);
    }
  }

  function startEdit(item: PFItem) {
    setAdding(false);
    setEditId(item.id);
    setEditForm({
      mediaType: item.mediaType,
      imageUrl: item.imageUrl ?? "",
      youtubeUrl: item.youtubeId ? `https://youtu.be/${item.youtubeId}` : "",
      durationSec: item.durationSec ?? defaultInterval,
    });
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const inputCls =
    "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
  const btnBlueSm =
    "flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">액자</h1>
        <button
          onClick={() => {
            setEditId(null);
            setAdding(true);
            setForm(emptyForm(defaultInterval));
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          항목 추가
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        메인 헤더의 <strong>액자</strong> 버튼을 누르면 등록한 이미지·유튜브 영상이 풀스크린
        슬라이드쇼로 순서대로 재생됩니다(마지막 → 처음 무한 반복). 이미지는 아래 표시 시간(초) 후
        자동 전환되고, 유튜브 영상은 <strong>재생이 끝나면</strong> 자동으로 다음으로 넘어갑니다.
        등록된 항목이 없으면 헤더에 버튼이 노출되지 않습니다.
      </p>

      {/* 전역 기본 표시 시간 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center flex-wrap gap-3">
        <Clock size={16} className="text-gray-400" />
        <span className="text-sm text-gray-700">이미지 기본 표시 시간</span>
        <input
          type="number"
          min={1}
          max={3600}
          value={defaultInterval}
          onChange={(e) => setDefaultInterval(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
        />
        <span className="text-sm text-gray-500">초 (새 이미지 항목의 기본값)</span>
        <button onClick={saveInterval} className={btnBlueSm} disabled={savingInterval}>
          <Save size={14} /> {savingInterval ? "저장 중..." : "저장"}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((item, idx) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3">
                <MediaThumb item={item} />

                {editId === item.id ? (
                  <div className="flex-1">
                    <PFForm
                      formState={editForm}
                      setFormState={setEditForm}
                      onSave={() => handleUpdate(item.id)}
                      onCancel={() => setEditId(null)}
                      inputCls={inputCls}
                      btnBlueSm={btnBlueSm}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                        {item.mediaType === "youtube" ? (
                          <>
                            <Video size={14} className="text-red-600" /> 유튜브
                          </>
                        ) : (
                          <>
                            <ImageIcon size={14} className="text-blue-600" /> 이미지
                          </>
                        )}
                        <span className="text-gray-400 ml-1">#{idx + 1}</span>
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5 break-all">
                        {item.mediaType === "youtube"
                          ? `youtu.be/${item.youtubeId}`
                          : `${item.durationSec ?? defaultInterval}초 표시`}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 mr-1">
                      <button
                        onClick={() => handleMove(item.id, -1)}
                        className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === 0 || reordering}
                        title="위로 이동"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(item.id, 1)}
                        className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === sorted.length - 1 || reordering}
                        title="아래로 이동"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {sorted.length === 0 && !adding && (
            <div className="text-center py-12 text-gray-400">
              <p>등록된 항목이 없습니다.</p>
              <p className="text-xs mt-1">상단의 &lsquo;항목 추가&rsquo; 로 시작하세요.</p>
            </div>
          )}

          {adding && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <PFForm
                formState={form}
                setFormState={setForm}
                onSave={handleAdd}
                onCancel={() => {
                  setAdding(false);
                  setForm(emptyForm(defaultInterval));
                }}
                inputCls={inputCls}
                btnBlueSm={btnBlueSm}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 리스트 행 좌측 썸네일 (64×40).
function MediaThumb({ item }: { item: PFItem }) {
  const src =
    item.mediaType === "youtube" && item.youtubeId
      ? `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`
      : item.imageUrl || "";

  if (!src) {
    return (
      <div className="w-16 h-10 shrink-0 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
        <ImageIcon size={16} />
      </div>
    );
  }
  return (
    <div className="w-16 h-10 shrink-0 rounded-md border border-gray-200 bg-black flex items-center justify-center overflow-hidden">
      <Image
        src={src}
        alt=""
        width={64}
        height={40}
        unoptimized
        className="object-cover w-full h-full"
      />
    </div>
  );
}

interface PFFormProps {
  formState: FormState;
  setFormState: (v: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  inputCls: string;
  btnBlueSm: string;
}

function PFForm({ formState, setFormState, onSave, onCancel, inputCls, btnBlueSm }: PFFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "업로드에 실패했습니다.");
        return;
      }
      const { url } = await res.json();
      setFormState({ ...formState, imageUrl: url });
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isImage = formState.mediaType === "image";

  return (
    <div className="flex flex-col gap-3">
      {/* 미디어 종류 토글 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFormState({ ...formState, mediaType: "image" })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            isImage
              ? "bg-blue-50 border-blue-600 text-blue-600"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <ImageIcon size={14} /> 이미지
        </button>
        <button
          type="button"
          onClick={() => setFormState({ ...formState, mediaType: "youtube" })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            !isImage
              ? "bg-red-50 border-red-500 text-red-600"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Video size={14} /> 유튜브
        </button>
      </div>

      {isImage ? (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 w-16 shrink-0">이미지</span>
          {formState.imageUrl ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-10 rounded-md border border-gray-200 bg-black flex items-center justify-center overflow-hidden">
                <Image
                  src={formState.imageUrl}
                  alt=""
                  width={64}
                  height={40}
                  unoptimized
                  className="object-cover w-full h-full"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
                disabled={uploading}
              >
                <Upload size={12} /> 교체
              </button>
              <button
                onClick={() => setFormState({ ...formState, imageUrl: "" })}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
                disabled={uploading}
              >
                <X size={12} /> 제거
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
              disabled={uploading}
            >
              <Upload size={12} /> {uploading ? "업로드 중..." : "이미지 업로드"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 w-16 shrink-0">유튜브 URL</span>
          <input
            type="text"
            value={formState.youtubeUrl}
            onChange={(e) => setFormState({ ...formState, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputCls + " max-w-[360px]"}
          />
        </div>
      )}

      {/* 표시 시간 (이미지 전용) */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600 w-16 shrink-0">표시 시간</span>
        {isImage ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={3600}
              value={formState.durationSec}
              onChange={(e) =>
                setFormState({ ...formState, durationSec: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-20 h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600"
            />
            <span className="text-xs text-gray-500">초</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">영상 재생이 끝나면 자동 전환됩니다.</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onSave} className={btnBlueSm} disabled={uploading}>
          <Save size={14} /> 저장
        </button>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
