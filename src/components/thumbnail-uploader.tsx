"use client";

import { useMemo, useRef, useState } from "react";
import { ImageIcon, X, Upload, Type } from "lucide-react";
import Image from "next/image";
import {
  ThumbnailOverlayEditor,
  type TextOverlay,
  type ThumbnailOverlayMeta,
} from "./thumbnail-overlay-editor";
import { resizeImageFile } from "@/lib/image-resize";
import { THUMB_ASPECTS, type ThumbAspect } from "@/lib/image-crop";

interface ThumbnailUploaderProps {
  value: string;
  // 이전 합성 시 저장된 오버레이 메타 JSON 문자열. 있으면 ThumbnailOverlayEditor 가
  // baseImageUrl + overlays 로 시드되어 재편집 가능.
  overlays?: string;
  // 일반 이미지 변경 시 url 만 변경 (overlays 인자는 빈 문자열로 메타 무효화).
  // 텍스트 오버레이 합성 저장 시 url 과 함께 새 메타 JSON 문자열 전달.
  onChange: (url: string, overlays?: string) => void;
  // 지정 시 업로드 시점에 센터 크롭으로 비율 강제(현재 "16:9" 만 — 기사/하이라이트 카드용).
  // 미지정 = 기존 동작(로고·강사 사진 등 비율 자유 업로드).
  aspect?: ThumbAspect;
}

// 메타 JSON 파싱. 손상되거나 빈 문자열이면 null.
function parseMeta(json: string | undefined): ThumbnailOverlayMeta | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as ThumbnailOverlayMeta;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.overlays)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ThumbnailUploader({ value, overlays, onChange, aspect }: ThumbnailUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploading(true);
    try {
      // aspect 지정 시 클라이언트에서 센터 크롭으로 비율을 굽는다(미리보기=최종 결과).
      const uploadable = await resizeImageFile(
        file,
        aspect ? { aspect: THUMB_ASPECTS[aspect] } : undefined,
      );
      const formData = new FormData();
      formData.append("file", uploadable);
      formData.append("thumbVariants", "1"); // 카드 서빙용 640/1280 webp 변형 생성
      // 서버 변형도 비율 강제(fit:cover) — gif·클라이언트 크롭 실패(fail-open) 보강선.
      if (aspect) formData.append("thumbAspect", aspect);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "업로드에 실패했습니다.");
        return;
      }

      const { url } = await res.json();
      // 새 이미지로 교체되면 기존 오버레이 메타는 무효 (baseImageUrl 이 달라짐).
      // 빈 문자열을 넘겨 호출자에게 메타 초기화를 알림.
      onChange(url, "");
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadFile(file);
        return;
      }
    }

    // 텍스트 URL 붙여넣기도 지원
    const text = e.clipboardData.getData("text/plain").trim();
    if (text && (text.startsWith("http") || text.startsWith("/"))) {
      e.preventDefault();
      onChange(text, "");
    }
  }

  const hasImage = !!(value && value.length > 0);

  // 이전 합성 메타가 있으면 baseImageUrl 위에 overlays 를 시드해 재편집 모드로 진입.
  // 없으면 현재 미리보기 이미지(value) 위에 신규 overlay 추가 모드로 진입.
  const meta = useMemo(() => parseMeta(overlays), [overlays]);
  function openOverlayEditor() {
    setEditingOverlay(true);
  }
  // 편집기 호출 시 사용할 imageUrl / 시드 overlays
  const editorImageUrl: string | null = meta
    ? meta.baseImageUrl
    : hasImage
      ? value
      : null;
  const editorSeedOverlays: TextOverlay[] | null = meta?.overlays ?? null;

  return (
    <div>
      {hasImage ? (
        /* 미리보기 */
        <div className="relative group">
          <div className="relative aspect-[16/9] bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
            {value.startsWith("/api/") || value.startsWith("http") ? (
              <Image
                src={value}
                alt="썸네일 미리보기"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, hsl(220,40%,70%) 0%, hsl(240,50%,50%) 100%)",
                }}
              />
            )}
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={openOverlayEditor}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              title={meta ? "텍스트 오버레이 재편집" : "텍스트 오버레이"}
            >
              <Type size={13} className="text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              title="변경"
            >
              <Upload size={13} className="text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              title="삭제"
            >
              <X size={13} className="text-gray-700" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">{value}</p>
        </div>
      ) : (
        /* 업로드 영역 */
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
            className={`relative aspect-[16/9] border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <p className="text-sm text-blue-600">업로드 중...</p>
            ) : (
              <>
                <ImageIcon size={28} className="text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">
                  클릭, 드래그 앤 드롭, 또는 Ctrl+V
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  이미지 파일 또는 URL
                </p>
              </>
            )}
          </div>
          {/* 이미지 없이도 텍스트만으로 썸네일 만들기 진입점 */}
          <button
            type="button"
            onClick={openOverlayEditor}
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            <Type size={12} />
            텍스트만으로 썸네일 만들기
          </button>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {editingOverlay && (
        <ThumbnailOverlayEditor
          imageUrl={editorImageUrl}
          existingOverlays={editorSeedOverlays}
          aspect={aspect}
          onSave={(newUrl, newOverlaysJson) => {
            onChange(newUrl, newOverlaysJson);
            setEditingOverlay(false);
          }}
          onCancel={() => setEditingOverlay(false)}
        />
      )}
    </div>
  );
}
