"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Type,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Square,
} from "lucide-react";

type OverlayAnchor = "tl" | "tr" | "center" | "bl" | "br";

export interface TextOverlay {
  id: string;
  text: string;
  // 5단계 위치 프리셋 — 좌상/우상/중앙/좌하/우하.
  anchor: OverlayAnchor;
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  shadow: boolean;
}

export interface ThumbnailOverlayMeta {
  version: 1;
  baseImageUrl: string | null;
  overlays: TextOverlay[];
}

interface Props {
  imageUrl: string | null;
  // 재편집 모드: 이전에 저장된 overlays 가 있으면 그대로 시드.
  existingOverlays?: TextOverlay[] | null;
  // onSave 시 합성된 새 썸네일 URL + 메타 JSON 직렬화 문자열을 함께 돌려준다.
  onSave: (newUrl: string, overlaysJson: string) => void;
  onCancel: () => void;
}

const FALLBACK_SIZE = { w: 1280, h: 720 };
const FALLBACK_GRADIENT_CSS =
  "linear-gradient(135deg, hsl(220,40%,70%) 0%, hsl(240,50%,50%) 100%)";

const FONT_FAMILY =
  '"Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';

// anchor 별 좌표(% 기준) + CSS transform.
// 8/92% 가장자리 패딩으로 컨테이너 안쪽에 위치 — 텍스트가 잘리지 않도록.
const ANCHOR_POSITIONS: Record<
  OverlayAnchor,
  { xPct: number; yPct: number; transform: string }
> = {
  tl: { xPct: 8, yPct: 12, transform: "translate(0,0)" },
  tr: { xPct: 92, yPct: 12, transform: "translate(-100%,0)" },
  center: { xPct: 50, yPct: 50, transform: "translate(-50%,-50%)" },
  bl: { xPct: 8, yPct: 88, transform: "translate(0,-100%)" },
  br: { xPct: 92, yPct: 88, transform: "translate(-100%,-100%)" },
};

function makeOverlay(): TextOverlay {
  return {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: "텍스트를 입력하세요",
    anchor: "center",
    fontSize: 56,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    shadow: true,
  };
}

// 구버전(xPct/yPct) 메타가 들어오면 가장 가까운 anchor 로 매핑해 호환.
function migrateLegacyOverlay(o: unknown): TextOverlay {
  const raw = o as Partial<TextOverlay> & { xPct?: number; yPct?: number };
  if (raw.anchor && ANCHOR_POSITIONS[raw.anchor]) {
    return {
      id: raw.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: raw.text ?? "",
      anchor: raw.anchor,
      fontSize: raw.fontSize ?? 56,
      color: raw.color ?? "#ffffff",
      fontWeight: raw.fontWeight ?? "bold",
      textAlign: raw.textAlign ?? "center",
      shadow: raw.shadow ?? true,
    };
  }
  // legacy xPct/yPct → 가장 가까운 5분면 anchor.
  const x = raw.xPct ?? 50;
  const y = raw.yPct ?? 50;
  let anchor: OverlayAnchor = "center";
  if (x < 33 && y < 33) anchor = "tl";
  else if (x > 66 && y < 33) anchor = "tr";
  else if (x < 33 && y > 66) anchor = "bl";
  else if (x > 66 && y > 66) anchor = "br";
  return {
    id: raw.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: raw.text ?? "",
    anchor,
    fontSize: raw.fontSize ?? 56,
    color: raw.color ?? "#ffffff",
    fontWeight: raw.fontWeight ?? "bold",
    textAlign: raw.textAlign ?? "center",
    shadow: raw.shadow ?? true,
  };
}

export function ThumbnailOverlayEditor({
  imageUrl,
  existingOverlays,
  onSave,
  onCancel,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>(() =>
    existingOverlays && existingOverlays.length > 0
      ? existingOverlays.map(migrateLegacyOverlay)
      : [makeOverlay()],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    overlays[0]?.id ?? null,
  );
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    imageUrl ? null : FALLBACK_SIZE,
  );
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // Portal 마운트 가드 (SSR 회피)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!imageUrl) {
      setNaturalSize(FALLBACK_SIZE);
      setImgError(false);
      return;
    }
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
      const meta: ThumbnailOverlayMeta = {
        version: 1,
        baseImageUrl: imageUrl,
        overlays,
      };
      onSave(url, JSON.stringify(meta));
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const dialog = (
    // z-[2000] 으로 InlineEditModal(z-[1000]) 보다 위에 렌더. document.body 직속 portal
    // 이라 부모의 transform/overflow 영향에서 벗어남.
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
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
              className="relative bg-white shadow"
              style={{
                width: "min(100%, 720px)",
                aspectRatio: naturalSize
                  ? `${naturalSize.w} / ${naturalSize.h}`
                  : "16 / 9",
                // 자식 텍스트 박스의 cqw 단위가 이 미리보기 박스의 inline-size 를 기준으로
                // 환산되도록. 캔버스 자연 너비 ↔ 미리보기 너비 비율을 따라가며 fontSize·max-width
                // 가 비례 표시되어 저장 결과(JPEG) 와 시각적으로 일치한다.
                containerType: "inline-size",
              }}
              onClick={() => setSelectedId(null)}
            >
              {imageUrl ? (
                <>
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
                </>
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: FALLBACK_GRADIENT_CSS }}
                />
              )}
              {overlays.map((o) => {
                const pos = ANCHOR_POSITIONS[o.anchor];
                // 캔버스 자연 너비를 기준으로 fontSize 와 max-width 를 cqw 비율로 환산.
                // refW = 1280 일 때 56px → (56/1280*100)cqw = 4.375cqw → 미리보기 박스가 720px 이면 ≈31.5px,
                // 360px 이면 ≈15.75px 로 정확히 비례 축소됨. 저장 결과(JPEG) 와 시각적으로 일치.
                const refW = naturalSize?.w ?? FALLBACK_SIZE.w;
                const fontSizeCqw = (o.fontSize / refW) * 100;
                return (
                  <div
                    key={o.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(o.id);
                    }}
                    style={{
                      position: "absolute",
                      left: `${pos.xPct}%`,
                      top: `${pos.yPct}%`,
                      transform: pos.transform,
                      fontFamily: FONT_FAMILY,
                      fontSize: `max(8px, ${fontSizeCqw}cqw)`,
                      color: o.color,
                      fontWeight: o.fontWeight,
                      textAlign: o.textAlign,
                      textShadow: o.shadow
                        ? "0 2px 8px rgba(0,0,0,0.55)"
                        : "none",
                      // 8/92% 가장자리 패딩 사이 영역(84%) 을 max-width 로 강제해 어떤 앵커에서도
                      // 텍스트가 컨테이너 밖으로 빠지지 않도록. pre-wrap + word-break 로 자동 줄바꿈 허용.
                      maxWidth: "84cqw",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      cursor: "pointer",
                      userSelect: "none",
                      padding: "2px 6px",
                      outline:
                        selectedId === o.id
                          ? "1px dashed var(--color-brand-blue)"
                          : "none",
                    }}
                  >
                    {o.text || " "}
                  </div>
                );
              })}
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
                <Field label="위치">
                  <PositionGrid
                    value={selected.anchor}
                    onChange={(a) => update(selected.id, { anchor: a })}
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
            오른쪽 패널의 위치 버튼으로 텍스트 위치를 조정할 수 있습니다.
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
              disabled={saving || (!!imageUrl && imgError) || !naturalSize}
              className="h-9 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
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

// 5개 활성 + 4개 spacer 의 3×3 그리드. 좌상/우상/중앙/좌하/우하.
function PositionGrid({
  value,
  onChange,
}: {
  value: OverlayAnchor;
  onChange: (a: OverlayAnchor) => void;
}) {
  const cells: ({ a: OverlayAnchor; icon: React.ReactNode; label: string } | null)[] = [
    { a: "tl", icon: <ArrowUpLeft size={14} />, label: "좌상" },
    null,
    { a: "tr", icon: <ArrowUpRight size={14} />, label: "우상" },
    null,
    { a: "center", icon: <Square size={12} />, label: "중앙" },
    null,
    { a: "bl", icon: <ArrowDownLeft size={14} />, label: "좌하" },
    null,
    { a: "br", icon: <ArrowDownRight size={14} />, label: "우하" },
  ];
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-32 mx-auto">
      {cells.map((c, i) =>
        c === null ? (
          <div key={i} aria-hidden className="w-9 h-9" />
        ) : (
          <button
            key={c.a}
            type="button"
            onClick={() => onChange(c.a)}
            title={c.label}
            aria-label={c.label}
            className={`w-9 h-9 rounded border flex items-center justify-center transition-colors ${
              value === c.a
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {c.icon}
          </button>
        ),
      )}
    </div>
  );
}

async function renderToBlob(
  imageUrl: string | null,
  overlays: TextOverlay[],
  size: { w: number; h: number },
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (imageUrl) {
    const img = await loadImage(imageUrl);
    if (!img) return null;
    try {
      ctx.drawImage(img, 0, 0, size.w, size.h);
    } catch {
      return null;
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, size.w, size.h);
    grad.addColorStop(0, "hsl(220,40%,70%)");
    grad.addColorStop(1, "hsl(240,50%,50%)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size.w, size.h);
  }

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  for (const o of overlays) {
    const pos = ANCHOR_POSITIONS[o.anchor];
    const px = (pos.xPct / 100) * size.w;
    const py = (pos.yPct / 100) * size.h;
    ctx.save();
    ctx.font = `${o.fontWeight} ${o.fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = o.color;
    // Canvas textAlign 은 anchor 기준으로 자동 결정 (DOM transform 과 일관되게).
    // 사용자의 textAlign(좌/중/우) 은 다중 줄 입력 시 행 정렬에 영향을 주므로 별도로 사용.
    ctx.textAlign =
      o.anchor === "tl" || o.anchor === "bl"
        ? "left"
        : o.anchor === "tr" || o.anchor === "br"
          ? "right"
          : "center";
    ctx.textBaseline =
      o.anchor === "tl" || o.anchor === "tr"
        ? "top"
        : o.anchor === "bl" || o.anchor === "br"
          ? "bottom"
          : "middle";
    if (o.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }
    // DOM 미리보기의 max-width: 84cqw 와 동일한 비율로 캔버스에서도 줄바꿈.
    // → 미리보기 ↔ 저장 결과 시각적 일치 + 텍스트가 가장자리 패딩 안쪽에 머무름.
    const maxWidth = size.w * 0.84;
    const rawLines = o.text.split(/\r?\n/);
    const lines: string[] = [];
    for (const raw of rawLines) {
      lines.push(...wrapByMaxWidth(ctx, raw, maxWidth));
    }
    const lineHeight = o.fontSize * 1.2;
    const totalHeight = lineHeight * lines.length;
    let startY: number;
    if (ctx.textBaseline === "top") {
      startY = py;
    } else if (ctx.textBaseline === "bottom") {
      startY = py - totalHeight + lineHeight;
    } else {
      startY = py - totalHeight / 2 + lineHeight / 2;
    }
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

// 캔버스 텍스트를 maxW 너비 안에 들어가도록 줄바꿈.
// 1) 공백 split 으로 단어 단위 wrap (영문·혼용 텍스트 대응)
// 2) 단일 단어가 maxW 를 초과하면 문자 단위로 강제 분리 (한국어·긴 URL 대응)
function wrapByMaxWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  if (!text) return [""];
  const words = text.split(/(\s+)/); // 공백을 보존해서 줄 안에서는 원본 간격 유지
  const lines: string[] = [];
  let current = "";

  const pushChar = (ch: string) => {
    if (ctx.measureText(current + ch).width <= maxW) {
      current += ch;
    } else {
      if (current) lines.push(current);
      current = ch;
    }
  };

  for (const w of words) {
    if (!w) continue;
    if (ctx.measureText(current + w).width <= maxW) {
      current += w;
      continue;
    }
    // 현재 줄이 비어있지 않으면 일단 마감하고 새 줄에서 단어 시도.
    if (current.trim()) {
      lines.push(current);
      current = "";
    } else {
      current = "";
    }
    if (ctx.measureText(w).width <= maxW) {
      current = w;
    } else {
      // 단일 단어가 너무 길면 문자 단위 분리.
      for (const ch of w) pushChar(ch);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
