"use client";

import { useRef, useState } from "react";
import { ImageIcon, X, Upload } from "lucide-react";
import Image from "next/image";

interface ThumbnailUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export function ThumbnailUploader({ value, onChange }: ThumbnailUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

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
      onChange(url);
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
      onChange(text);
    }
  }

  const hasImage = value && value.length > 0;

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
                className="object-cover"
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
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              onClick={() => onChange("")}
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
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
