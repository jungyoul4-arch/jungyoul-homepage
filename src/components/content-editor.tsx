"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Bold, Italic, ImageIcon, Video } from "lucide-react";

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/* ── 동영상 URL 파싱 ── */

interface VideoEmbed {
  platform: "youtube" | "vimeo";
  id: string;
}

function parseVideoUrl(text: string): VideoEmbed | null {
  const trimmed = text.trim();

  // YouTube: watch?v=, youtu.be/, embed/, shorts/
  const ytPatterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern);
    if (match) return { platform: "youtube", id: match[1] };
  }

  // Vimeo: vimeo.com/123456
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { platform: "vimeo", id: vimeoMatch[1] };

  return null;
}

function buildEmbedHtml(embed: VideoEmbed): string {
  const src =
    embed.platform === "youtube"
      ? `https://www.youtube.com/embed/${embed.id}`
      : `https://player.vimeo.com/video/${embed.id}`;

  return (
    `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:12px 0;border-radius:8px;" contenteditable="false">` +
    `<iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" ` +
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
    `allowfullscreen></iframe>` +
    `</div><p><br></p>`
  );
}

/* ── ContentEditor ── */

export function ContentEditor({ value, onChange }: ContentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const initializedRef = useRef(false);

  // 초기 HTML 설정 (한 번만)
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value;
      initializedRef.current = true;
    }
  }, [value]);

  // innerHTML → 부모 state 동기화
  const syncToParent = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // 이미지 업로드
  async function uploadImage(file: File): Promise<string | null> {
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
        alert(data.error || "이미지 업로드에 실패했습니다.");
        return null;
      }

      const { url } = await res.json();
      return url;
    } catch {
      alert("이미지 업로드 중 오류가 발생했습니다.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  // 커서 위치에 HTML 삽입
  function insertHtmlAtCursor(html: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const temp = document.createElement("div");
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (temp.firstChild) {
      frag.appendChild(temp.firstChild);
    }
    range.insertNode(frag);

    // 커서를 삽입된 요소 뒤로 이동
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    syncToParent();
  }

  // 이미지 파일 처리 (업로드 + 삽입)
  async function handleImageFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      const placeholderId = `upload-${Date.now()}`;
      insertHtmlAtCursor(
        `<span id="${placeholderId}" style="color:#999;font-style:italic;">[이미지 업로드 중...]</span>`
      );

      const url = await uploadImage(file);
      const placeholder = document.getElementById(placeholderId);

      if (url && placeholder) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.margin = "8px 0";
        img.style.borderRadius = "4px";
        placeholder.replaceWith(img);
      } else if (placeholder) {
        placeholder.remove();
      }

      syncToParent();
    }
  }

  // 드래그 앤 드롭
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    // 드롭된 텍스트에서 동영상 URL 감지
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      const embed = parseVideoUrl(text);
      if (embed) {
        insertHtmlAtCursor(buildEmbedHtml(embed));
        return;
      }
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleImageFiles(files);
    }
  }

  // 클립보드 붙여넣기
  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    // 1. 이미지 파일 체크
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleImageFiles(imageFiles);
      return;
    }

    // 2. 텍스트에서 동영상 URL 감지
    const text = e.clipboardData.getData("text/plain");
    if (text) {
      const embed = parseVideoUrl(text);
      if (embed) {
        e.preventDefault();
        insertHtmlAtCursor(buildEmbedHtml(embed));
        return;
      }
    }

    // 3. 일반 텍스트는 기본 동작 유지
  }

  // 툴바: 동영상 URL 직접 입력
  function handleVideoButton() {
    const url = prompt("동영상 URL을 입력하세요 (YouTube, Vimeo):");
    if (!url) return;

    const embed = parseVideoUrl(url);
    if (embed) {
      insertHtmlAtCursor(buildEmbedHtml(embed));
    } else {
      alert("지원하지 않는 동영상 URL입니다.\nYouTube 또는 Vimeo URL을 입력해주세요.");
    }
  }

  // 툴바 명령
  function execCommand(command: string) {
    document.execCommand(command, false);
    editorRef.current?.focus();
    syncToParent();
  }

  function handleImageButton() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleImageFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="border border-gray-300 rounded-sm overflow-hidden focus-within:border-blue-600 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="굵게"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="기울임"
        >
          <Italic size={15} />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={handleImageButton}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 text-xs text-gray-600"
          title="이미지 삽입"
        >
          <ImageIcon size={15} />
          <span>이미지</span>
        </button>
        <button
          type="button"
          onClick={handleVideoButton}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 text-xs text-gray-600"
          title="동영상 삽입"
        >
          <Video size={15} />
          <span>동영상</span>
        </button>
        {uploading && (
          <span className="text-xs text-blue-600 ml-2">업로드 중...</span>
        )}
      </div>

      {/* Editor Area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[200px] max-h-[400px] overflow-y-auto px-3 py-2 text-sm focus:outline-none prose prose-sm max-w-none"
          onInput={syncToParent}
          onBlur={syncToParent}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          suppressContentEditableWarning
        />

        {/* Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-50/90 border-2 border-dashed border-blue-400 rounded flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <ImageIcon size={32} className="text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-600">
                이미지 또는 동영상 URL을 놓으세요
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
