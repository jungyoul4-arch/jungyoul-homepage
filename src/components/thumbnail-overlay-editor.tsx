"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Type } from "lucide-react";

interface TextOverlay {
  id: string;
  text: string;
  xPct: number;
  yPct: number;
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  shadow: boolean;
}

interface Props {
  imageUrl: string;
  onSave: (newUrl: string) => void;
  onCancel: () => void;
}

const FONT_FAMILY =
  '"Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';

function makeOverlay(): TextOverlay {
  return {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: "텍스트를 입력하세요",
    xPct: 50,
    yPct: 50,
    fontSize: 56,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    shadow: true,
  };
}

export function ThumbnailOverlayEditor({ imageUrl, onSave, onCancel }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([makeOverlay()]);
  const [selectedId, setSelectedId] = useState<string | null>(
    overlays[0]?.id ?? null,
  );
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(
    null,
  );

  const selected = overlays.find((o) => o.id === selectedId) ?? null;

  function update(id: string, patch: Partial<TextOverlay>) {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  }

  function add() {
    const next = makeOverlay();
    setOverlays((prev) => [...prev, next]);
    setSelectedId(next.id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setOverlays((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;
    const cx = (overlay.xPct / 100) * rect.width;
    const cy = (overlay.yPct / 100) * rect.height;
    dragState.current = {
      id,
      offsetX: e.clientX - rect.left - cx,
      offsetY: e.clientY - rect.top - cy,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const ds = dragState.current;
    if (!ds) return;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left - ds.offsetX;
    const cy = e.clientY - rect.top - ds.offsetY;
    const xPct = Math.max(0, Math.min(100, (cx / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (cy / rect.height) * 100));
    update(ds.id, { xPct, yPct });
  }

  function onPointerUp() {
    dragState.current = null;
  }

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [imageUrl]);

  async function handleSave() {
    if (!naturalSize) return;
    setSaving(true);
    try {
      const blob = await renderToBlob(imageUrl, overlays, naturalSize);
      if (!blob) {
        alert(
          "이미지 합성에 실패했습니다. 외부 URL 이미지일 경우 먼저 업로드 영역에 첨부한 후 다시 시도해 주세요.",
        );
        return;
      }
      const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "업로드에 실패했습니다.");
        return;
      }
      const { url } = await res.json();
      onSave(url);
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Type size={16} /> 썸네일 텍스트 오버레이
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Preview */}
          <div className="flex-1 bg-gray-100 p-4 overflow-auto flex items-center justify-center">
            <div
              ref={previewRef}
              className="relative bg-white shadow"
              style={{
                width: "min(100%, 720px)",
                aspectRatio: naturalSize
                  ? `${naturalSize.w} / ${naturalSize.h}`
                  : "16 / 9",
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={() => setSelectedId(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt="썸네일 원본"
                crossOrigin="anonymous"
                onLoad={(e) => {
                  const t = e.currentTarget;
                  setNaturalSize({ w: t.naturalWidth, h: t.naturalHeight });
                  setImgError(false);
                }}
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />
              {imgError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                  이미지를 불러오지 못했습니다.
                </div>
              )}
              {overlays.map((o) => (
                <div
                  key={o.id}
                  onPointerDown={(e) => onPointerDown(e, o.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(o.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${o.xPct}%`,
                    top: `${o.yPct}%`,
                    transform: "translate(-50%, -50%)",
                    fontFamily: FONT_FAMILY,
                    fontSize: `clamp(12px, ${o.fontSize / 7.2}cqw, ${o.fontSize}px)`,
                    color: o.color,
                    fontWeight: o.fontWeight,
                    textAlign: o.textAlign,
                    textShadow: o.shadow
                      ? "0 2px 8px rgba(0,0,0,0.55)"
                      : "none",
                    whiteSpace: "pre",
                    cursor: "move",
                    userSelect: "none",
                    padding: "2px 6px",
                    outline:
                      selectedId === o.id
                        ? "1px dashed rgba(30,100,250,0.9)"
                        : "none",
                    containerType: "inline-size",
                  }}
                >
                  {o.text || " "}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <aside className="w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto flex flex-col gap-4 shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={add}
                className="flex-1 h-9 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> 텍스트 추가
              </button>
              <button
                type="button"
                onClick={removeSelected}
                disabled={!selectedId}
                className="h-9 px-3 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Trash2 size={14} /> 삭제
              </button>
            </div>

            {selected ? (
              <div className="space-y-3">
                <Field label="텍스트">
                  <textarea
                    value={selected.text}
                    onChange={(e) =>
                      update(selected.id, { text: e.target.value })
                    }
                    rows={2}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:border-blue-600"
                  />
                </Field>
                <Field label={`폰트 크기 (${selected.fontSize}px)`}>
                  <input
                    type="range"
                    min={16}
                    max={160}
                    value={selected.fontSize}
                    onChange={(e) =>
                      update(selected.id, { fontSize: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <Field label="색상">
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) =>
                      update(selected.id, { color: e.target.value })
                    }
                    className="h-9 w-full border border-gray-300 rounded cursor-pointer"
                  />
                </Field>
                <Field label="굵기">
                  <div className="flex gap-2">
                    {(["normal", "bold"] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => update(selected.id, { fontWeight: w })}
                        className={`flex-1 h-8 text-xs rounded border ${
                          selected.fontWeight === w
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {w === "bold" ? "굵게" : "보통"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="정렬">
                  <div className="flex gap-2">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => update(selected.id, { textAlign: a })}
                        className={`flex-1 h-8 text-xs rounded border ${
                          selected.textAlign === a
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {a === "left"
                          ? "왼쪽"
                          : a === "center"
                            ? "가운데"
                            : "오른쪽"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="그림자">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selected.shadow}
                      onChange={(e) =>
                        update(selected.id, { shadow: e.target.checked })
                      }
                    />
                    가독성 향상 (반투명 그림자)
                  </label>
                </Field>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                미리보기에서 텍스트를 클릭해 선택하세요.
              </p>
            )}
          </aside>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            텍스트를 드래그해 위치를 조정할 수 있습니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || imgError || !naturalSize}
              className="h-9 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

async function renderToBlob(
  imageUrl: string,
  overlays: TextOverlay[],
  size: { w: number; h: number },
): Promise<Blob | null> {
  const img = await loadImage(imageUrl);
  if (!img) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0, size.w, size.h);
  } catch {
    return null;
  }

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  for (const o of overlays) {
    const px = (o.xPct / 100) * size.w;
    const py = (o.yPct / 100) * size.h;
    ctx.save();
    ctx.font = `${o.fontWeight} ${o.fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = o.color;
    ctx.textAlign = o.textAlign === "left"
      ? "left"
      : o.textAlign === "right"
        ? "right"
        : "center";
    ctx.textBaseline = "middle";
    if (o.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }
    const lines = o.text.split(/\r?\n/);
    const lineHeight = o.fontSize * 1.2;
    const totalHeight = lineHeight * lines.length;
    const startY = py - totalHeight / 2 + lineHeight / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, px, startY + i * lineHeight);
    });
    ctx.restore();
  }

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
