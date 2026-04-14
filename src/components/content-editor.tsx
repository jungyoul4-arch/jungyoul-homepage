"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ImageIcon, Video } from "lucide-react";

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
    `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:0;border-radius:0;" contenteditable="false">` +
    `<iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" ` +
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
    `allowfullscreen></iframe>` +
    `</div><p><br></p>`
  );
}

const tbtnBase =
  "px-2 py-1 rounded transition-colors font-medium";
const tbtnOff = `${tbtnBase} text-gray-700 hover:bg-gray-200`;
const tbtnOn = `${tbtnBase} text-blue-600 bg-blue-50`;

/* ── ContentEditor ── */

export function ContentEditor({ value, onChange }: ContentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeBlock, setActiveBlock] = useState<string>("p");
  const [isBold, setIsBold] = useState(false);
  const initializedRef = useRef(false);

  // 기본 단락 구분자를 <p>로 설정 (브라우저 기본 <div> 방지)
  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  // 커서 위치의 블록 태그를 감지하여 활성 상태 업데이트
  useEffect(() => {
    function detectBlock() {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      let node: Node | null = selection.anchorNode;
      let tag = "p";
      let bold = false;

      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const name = el.tagName.toLowerCase();
          if (["p", "h2", "h3", "h4", "blockquote", "li"].includes(name)) {
            tag = name;
          }
          if (name === "b" || name === "strong" || el.style.fontWeight === "bold" || el.style.fontWeight === "700") {
            bold = true;
          }
        }
        node = node.parentNode;
      }

      setActiveBlock(tag);
      setIsBold(bold);
    }

    document.addEventListener("selectionchange", detectBlock);
    return () => document.removeEventListener("selectionchange", detectBlock);
  }, []);

  // 초기 HTML 설정 (한 번만)
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      // 빈 콘텐츠면 <p> 태그로 시작
      editorRef.current.innerHTML = value || "<p><br></p>";
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
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
        const figcaption = document.createElement("figcaption");
        figcaption.textContent = "\u25b2 ";
        figcaption.setAttribute("contenteditable", "true");
        figure.appendChild(img);
        figure.appendChild(figcaption);
        placeholder.replaceWith(figure);
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

    // 3. 일반 텍스트: 외부 서식 제거 후 <p> 태그로 정규화
    const plain = e.clipboardData.getData("text/plain");
    if (plain) {
      e.preventDefault();
      const paragraphs = plain
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      const html = paragraphs.map((line) => `<p>${line}</p>`).join("");
      document.execCommand("insertHTML", false, html);
      syncToParent();
    }
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

  function execFormatBlock(tag: string) {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      document.execCommand("formatBlock", false, tag);
      editor.focus();
      syncToParent();
      return;
    }

    const range = selection.getRangeAt(0);

    // 선택 범위가 한 블록 내에 있으면 기본 동작
    if (range.collapsed || range.startContainer === range.endContainer) {
      document.execCommand("formatBlock", false, tag);
      editor.focus();
      syncToParent();
      return;
    }

    // 선택 범위 내 모든 최상위 블록 요소를 수집
    const blocks: Element[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const el = node as Element;
        if (el.parentElement !== editor) return NodeFilter.FILTER_SKIP;
        if (!range.intersectsNode(el)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) {
      blocks.push(walker.currentNode as Element);
    }

    if (blocks.length === 0) {
      document.execCommand("formatBlock", false, tag);
      editor.focus();
      syncToParent();
      return;
    }

    // 각 블록을 지정 태그로 변환
    for (const block of blocks) {
      const newEl = document.createElement(tag);
      newEl.innerHTML = block.innerHTML;
      block.replaceWith(newEl);
    }

    editor.focus();
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
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 text-xs">
        <button type="button" onClick={() => execCommand("bold")} className={isBold ? tbtnOn : tbtnOff} title="굵게">
          굵게
        </button>
        <button type="button" onClick={() => execCommand("italic")} className={tbtnOff} title="기울임">
          기울임
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button type="button" onClick={() => execFormatBlock("p")} className={activeBlock === "p" ? tbtnOn : tbtnOff} title="본문 단락">
          본문
        </button>
        <button type="button" onClick={() => execFormatBlock("h2")} className={activeBlock === "h2" ? tbtnOn : tbtnOff} title="소제목">
          소제목
        </button>
        <button type="button" onClick={() => execFormatBlock("h3")} className={activeBlock === "h3" ? tbtnOn : tbtnOff} title="소제목2">
          소제목2
        </button>
        <button type="button" onClick={() => execCommand("bold")} className={isBold ? tbtnOn : tbtnOff} title="질문 (굵은 텍스트)">
          질문
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button type="button" onClick={() => execCommand("insertUnorderedList")} className={activeBlock === "li" ? tbtnOn : tbtnOff} title="목록">
          목록
        </button>
        <button type="button" onClick={() => execCommand("insertOrderedList")} className={tbtnOff} title="번호목록">
          번호목록
        </button>
        <button type="button" onClick={() => execFormatBlock("blockquote")} className={activeBlock === "blockquote" ? tbtnOn : tbtnOff} title="인용구">
          인용
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button type="button" onClick={handleImageButton} className={`${tbtnOff} flex items-center gap-1`} title="이미지 삽입">
          <ImageIcon size={14} />
          이미지
        </button>
        <button type="button" onClick={handleVideoButton} className={`${tbtnOff} flex items-center gap-1`} title="동영상 삽입">
          <Video size={14} />
          동영상
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
          className="min-h-[200px] max-h-[400px] overflow-y-auto px-5 py-3 focus:outline-none article-content-preview"
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
