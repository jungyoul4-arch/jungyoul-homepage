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

// base64 data URL → File 변환. 붙여넣은 HTML 의 inline 이미지를 업로드하기 위해 사용.
function dataUrlToFile(dataUrl: string, name: string): File {
  const commaIdx = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, commaIdx);
  const b64 = dataUrl.slice(commaIdx + 1);
  const mime = /data:([^;]+);base64/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = (mime.split("/")[1] || "png").replace(/\+.*$/, "");
  const safeName = (name || "image").replace(/[^\w.-]/g, "_");
  return new File([bytes], `${safeName}.${ext}`, { type: mime });
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
  const [toolbar, setToolbar] = useState({
    activeBlock: "p",
    isBold: false,
    isItalic: false,
    listType: "",
    alignType: "left",
  });
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
      let italic = false;
      let list = "";
      let align = "left";
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
          if (name === "i" || name === "em" || el.style.fontStyle === "italic") {
            italic = true;
          }
          if (name === "li") {
            const parentTag = el.parentElement?.tagName.toLowerCase();
            if (parentTag === "ol") list = "ol";
            else if (parentTag === "ul") list = "ul";
          }
          if (el.style.textAlign && ["left", "center", "right"].includes(el.style.textAlign)) {
            align = el.style.textAlign;
          }
        }
        node = node.parentNode;
      }

      setToolbar({ activeBlock: tag, isBold: bold, isItalic: italic, listType: list, alignType: align });
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

  // 커서 위치에 HTML 삽입.
  //  - 삽입 fragment 가 <table> 등 블록 미디어를 포함하고 커서가 빈 <p><br></p> 안에 있으면
  //    그 빈 <p> 를 fragment 로 교체한다 (브라우저가 <p> 안 <table> 을 자동 변형하면서
  //    구조가 깨지는 문제 방지).
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

    const blockChildSelector = "table, figure, ul, ol, blockquote, h1, h2, h3, h4";
    const fragHasBlock = Array.from(frag.childNodes).some((n) => {
      if (n.nodeType !== Node.ELEMENT_NODE) return false;
      const el = n as HTMLElement;
      const t = el.tagName.toLowerCase();
      return (
        ["table", "figure", "ul", "ol", "blockquote", "h1", "h2", "h3", "h4"].includes(t) ||
        !!el.querySelector(blockChildSelector)
      );
    });

    let parentP: HTMLElement | null = null;
    {
      let n: Node | null = range.startContainer;
      while (n && n !== editor) {
        if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as HTMLElement;
          if (el.tagName.toLowerCase() === "p") {
            parentP = el;
            break;
          }
        }
        n = n.parentNode;
      }
    }
    const isEmptyP =
      parentP &&
      (parentP.textContent || "").trim() === "" &&
      !parentP.querySelector("img, table, figure, iframe");

    if (fragHasBlock && parentP && isEmptyP && parentP.parentNode === editor) {
      // 빈 단락을 통째로 fragment 로 교체. 마지막 노드 뒤에 캐럿 빈 <p> 삽입해 후속 입력 보장.
      const lastInserted = frag.lastChild;
      const trailingP = document.createElement("p");
      trailingP.innerHTML = "<br>";
      frag.appendChild(trailingP);
      parentP.replaceWith(frag);
      const nextRange = document.createRange();
      if (lastInserted) nextRange.setStartAfter(lastInserted);
      else nextRange.setStart(editor, editor.childNodes.length);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    } else {
      range.insertNode(frag);
      // 커서를 삽입된 요소 뒤로 이동
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

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
        figcaption.setAttribute("contenteditable", "true");
        figcaption.setAttribute("data-placeholder", "\uc774\ubbf8\uc9c0 \uc124\uba85 (\uc120\ud0dd)");
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

    const files = Array.from(e.dataTransfer.files);
    // macOS 일부 환경에서 file.type 이 빈 문자열이라 확장자 fallback 도 함께 사용.
    const isPdf = (f: File) =>
      f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    const pdfs = files.filter(isPdf);
    const images = files.filter((f) => f.type.startsWith("image/"));

    for (const pdf of pdfs) {
      await handlePdfFile(pdf);
    }
    if (images.length > 0) {
      await handleImageFiles(images);
    }
  }

  // PDF 페이지 → PNG 이미지 → R2 업로드 → <figure> 순차 삽입.
  // - HWPX 내부 이미지의 클립보드 페이스트가 일관되지 않아, PDF 우회로로 시각 정확도 100% 보존.
  // - 표·수식·도형은 본문 검색이 불가하지만 시각적으로는 그대로 들어옴.
  async function handlePdfFile(file: File) {
    const placeholderId = `pdf-upload-${Date.now()}`;
    insertHtmlAtCursor(
      `<span id="${placeholderId}" style="color:#999;font-style:italic;">[PDF 변환 준비 중...]</span>`,
    );

    let blobs: Blob[];
    try {
      const { pdfToPngBlobs } = await import("./pdf-to-images");
      blobs = await pdfToPngBlobs(file, {
        scale: 2.0,
        onStart: (total) => {
          if (total > 30) {
            return window.confirm(
              `이 PDF 는 ${total} 페이지입니다. 모두 본문에 이미지로 삽입할까요?\n(취소하면 본문에 추가되지 않습니다.)`,
            );
          }
          return true;
        },
        onProgress: (done, total) => {
          const ph = document.getElementById(placeholderId);
          if (ph) ph.textContent = `[PDF 변환 중... ${done}/${total}]`;
        },
      });
    } catch (err) {
      const placeholder = document.getElementById(placeholderId);
      const msg = err instanceof Error ? err.message : "PDF 처리 실패";
      if (placeholder) {
        placeholder.textContent = `[PDF 처리 실패: ${msg}]`;
        placeholder.removeAttribute("id");
      }
      syncToParent();
      return;
    }

    // 사용자가 onStart 에서 취소했거나 빈 PDF 인 경우.
    if (blobs.length === 0) {
      const placeholder = document.getElementById(placeholderId);
      placeholder?.remove();
      syncToParent();
      return;
    }

    // 변환된 페이지 PNG 들을 순차 업로드 → <figure> 로 삽입.
    const figures: HTMLElement[] = [];
    for (let i = 0; i < blobs.length; i++) {
      const ph = document.getElementById(placeholderId);
      if (ph) ph.textContent = `[PDF 업로드 중... ${i + 1}/${blobs.length}]`;

      const pageFile = new File([blobs[i]], `pdf-page-${i + 1}.png`, {
        type: "image/png",
      });
      const url = await uploadImage(pageFile);
      if (!url) {
        // 단일 페이지 실패 시 안내만 남기고 계속 진행.
        const fail = document.createElement("span");
        fail.style.color = "#c00";
        fail.style.fontStyle = "italic";
        fail.textContent = `[페이지 ${i + 1} 업로드 실패]`;
        figures.push(fail);
        continue;
      }
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = url;
      img.alt = `${file.name} - 페이지 ${i + 1}`;
      const figcaption = document.createElement("figcaption");
      figcaption.setAttribute("contenteditable", "true");
      figcaption.setAttribute("data-placeholder", "페이지 설명 (선택)");
      figure.appendChild(img);
      figure.appendChild(figcaption);
      figures.push(figure);
    }

    const placeholder = document.getElementById(placeholderId);
    if (placeholder) {
      const parent = placeholder.parentNode;
      if (parent) {
        for (const node of figures) parent.insertBefore(node, placeholder);
        placeholder.remove();
      }
    }
    syncToParent();
  }

  // 붙여넣은 HTML 정규화 + data:URL 이미지 R2 업로드.
  //  - HWP/한컴오피스/MS Word 잡 마크업 정리 (Office namespace 태그 unwrap, mso-* 제거 등)
  //  - 표(<table>...) 구조 보존
  //  - data:URL 이미지는 R2 업로드 후 영구 URL 로 치환 → 서버 sanitize 의 data:URL 스트립
  //    이후에도 이미지가 살아남는다.
  async function normalizePastedHtml(html: string): Promise<string> {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 위험·잡 노드 통째 제거
    doc
      .querySelectorAll("script, style, meta, link, xml, title")
      .forEach((n) => n.remove());

    // inline event handler / javascript: URL 제거 (XSS 방어)
    doc.querySelectorAll("*").forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name;
        if (name.startsWith("on")) {
          el.removeAttribute(name);
          continue;
        }
        if (
          (name === "href" || name === "src") &&
          /^\s*javascript:/i.test(attr.value)
        ) {
          el.removeAttribute(name);
        }
      }
    });

    // Office/HWP namespace 태그 unwrap — 텍스트 보존, 컨테이너만 제거.
    // 단, <v:imagedata src=...> 같이 이미지 src 를 들고 있는 노드는 <img> 로 승격해
    // 후속 data:URL 업로드 파이프라인에 태운다.
    function unwrap(el: Element) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
    Array.from(doc.querySelectorAll("*")).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (!(tag.includes(":") && /^(o|w|m|v):/.test(tag))) return;
      const src =
        el.getAttribute("src") ||
        el.getAttribute("href") ||
        // v:imagedata 는 namespace prefix 가 붙은 속성에 들어가 있을 수 있음
        el.getAttributeNS("urn:schemas-microsoft-com:vml", "src") ||
        el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (src) {
        const img = doc.createElement("img");
        img.setAttribute("src", src);
        el.replaceWith(img);
      } else {
        unwrap(el);
      }
    });

    // <font> 도 unwrap
    Array.from(doc.querySelectorAll("font")).forEach(unwrap);

    // <img src="file://..."> 같이 로컬 파일 참조는 브라우저가 못 가져오므로 placeholder 로 교체.
    // Mac 한컴오피스 한글 뷰어가 본문 이미지를 file:// 절대 경로로 참조하는 케이스 대응.
    Array.from(doc.querySelectorAll('img[src^="file:"]')).forEach((img) => {
      const placeholder = doc.createElement("span");
      placeholder.setAttribute(
        "style",
        "padding:2px 6px;background-color:#fef3c7;color:#92400e;font-size:12px;border-radius:2px;",
      );
      placeholder.textContent =
        "[원본 이미지 — 이미지 영역만 다시 클립보드에 복사해 별도로 붙여넣어 주세요]";
      img.replaceWith(placeholder);
    });

    // <div> 가 표/이미지/리스트 같은 블록 자식 없이 텍스트만 갖고 있으면 <p> 로 교체.
    // 한컴 한글 뷰어/일부 브라우저 페이스트가 본문 단락을 div 로 감싸는 경우 대응.
    Array.from(doc.querySelectorAll("div")).forEach((div) => {
      const hasBlockChild = div.querySelector(
        "div, table, figure, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, p",
      );
      if (hasBlockChild) return;
      const p = doc.createElement("p");
      while (div.firstChild) p.appendChild(div.firstChild);
      // 정렬 등 핵심 인라인 스타일은 보존
      const style = div.getAttribute("style");
      if (style) p.setAttribute("style", style);
      div.replaceWith(p);
    });

    // 클래스/스타일에서 mso-*, Mso*, Hwp* 흔적 제거
    doc.querySelectorAll("*").forEach((el) => {
      const cls = el.getAttribute("class");
      if (cls) {
        const cleaned = cls
          .split(/\s+/)
          .filter((c) => !/^(mso|Mso|Hwp|hancell)/.test(c))
          .join(" ")
          .trim();
        if (cleaned) el.setAttribute("class", cleaned);
        else el.removeAttribute("class");
      }
      const style = el.getAttribute("style");
      if (style && /mso-/i.test(style)) {
        const cleaned = style
          .split(/;\s*/)
          .filter((decl) => !/^\s*mso-/i.test(decl))
          .join("; ")
          .trim();
        if (cleaned) el.setAttribute("style", cleaned);
        else el.removeAttribute("style");
      }
    });

    // 빈 <p> 제거 (이미지·표·br 가 없고 텍스트도 없는 경우)
    Array.from(doc.querySelectorAll("p")).forEach((p) => {
      const hasMedia = p.querySelector("img, br, table, figure");
      if (!hasMedia && !(p.textContent || "").trim()) p.remove();
    });

    // data:URL 이미지를 R2 업로드 후 영구 URL 로 치환.
    // 업로드 실패 시 조용히 제거하지 않고 placeholder 로 교체해 사용자가 인지 가능하도록.
    const imgs = Array.from(
      doc.querySelectorAll('img[src^="data:"]'),
    ) as HTMLImageElement[];
    for (const img of imgs) {
      const dataUrl = img.getAttribute("src")!;
      let success = false;
      try {
        const file = dataUrlToFile(dataUrl, img.getAttribute("alt") || "image");
        const url = await uploadImage(file);
        if (url) {
          img.setAttribute("src", url);
          success = true;
        }
      } catch {
        /* fallthrough — placeholder 처리 */
      }
      if (!success) {
        const placeholder = doc.createElement("span");
        // sanitize 화이트리스트 통과 가능한 속성만 사용 (display 는 허용 목록 외라 생략).
        placeholder.setAttribute(
          "style",
          "padding:2px 6px;background-color:#fef3c7;color:#92400e;font-size:12px;border-radius:2px;",
        );
        placeholder.textContent = "[이미지 업로드 실패 — 다시 붙여넣어 주세요]";
        img.replaceWith(placeholder);
      }
    }

    return doc.body.innerHTML;
  }

  // 클립보드 붙여넣기.
  //
  // 분기 우선순위 (HWPX/MS Word/Google Docs 같은 "구조 있는 페이스트"가 단독 이미지보다
  // 먼저 처리되도록 — HWPX 클립보드는 image item + text/html 을 동시에 제공하기 때문에
  // image 가 먼저 매칭되면 표 구조가 통째 폐기됨):
  //   1a. text/html 에 의미마크업(<table|img|figure|blockquote|h1-6|ul|ol>) 보유
  //       → normalizePastedHtml 후 삽입. image item 이 동시에 있으면 본문 끝에 figure 추가.
  //   1b. text/html 에 (p|div|span|br) 위주 일반 마크업이 100자 이상 있어도 normalize 통과
  //       → Mac 한컴오피스 한글 뷰어 같이 div/span 으로 감싸진 페이스트 대응.
  //   2.  clipboardData.items 에 image/* 단독 → 이미지 업로드 후 figure 삽입
  //   3.  text/plain 이 동영상 URL → 임베드
  //   4.  plain text fallback → 줄단위 <p> 정규화
  async function handlePaste(e: React.ClipboardEvent) {
    const htmlFromClipboard = e.clipboardData.getData("text/html");
    const plainFromClipboard = e.clipboardData.getData("text/plain");
    const items = e.clipboardData.items;
    const itemTypes = Array.from(items).map((i) => i.type);

    // 진단 로깅 — Mac 한컴오피스 한글 뷰어 등 다양한 클립보드 페이로드 형식 분석용.
    // 실제 사용자 환경에서 어떤 MIME 이 들어오는지 확인되면 분기 로직 보강 후 제거.
    if (typeof console !== "undefined") {
      console.info("[paste]", {
        types: Array.from(e.clipboardData.types),
        htmlLen: htmlFromClipboard.length,
        htmlSample: htmlFromClipboard.slice(0, 500),
        plainLen: plainFromClipboard.length,
        plainSample: plainFromClipboard.slice(0, 200),
        itemTypes,
        filesCount: e.clipboardData.files?.length ?? 0,
      });
    }

    // 이미지 item 수집 (text/html 처리 후 부족한 이미지 보강용 + 단독 페이스트 분기 공유)
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    // 1a. 의미 마크업이 있는 HTML 페이스트 우선
    const hasStructuralMarkup =
      htmlFromClipboard &&
      /<(table|img|figure|blockquote|h[1-6]|ul|ol)\b/i.test(htmlFromClipboard);
    // 1b. 일반 마크업 (p/div/span/br) 도 길이 임계값 이상이면 normalize 통과
    const hasGenericMarkup =
      htmlFromClipboard.length >= 100 &&
      /<(p|div|span|br)\b/i.test(htmlFromClipboard);

    if (hasStructuralMarkup || hasGenericMarkup) {
      e.preventDefault();
      const processed = await normalizePastedHtml(htmlFromClipboard);
      insertHtmlAtCursor(processed);
      // text/html 에 <img> 가 0개인데 image item 이 따로 있는 케이스 (HWPX) 보강:
      // 본문 끝에 figure 로 이미지 추가.
      const htmlHadImg = /<img\b/i.test(htmlFromClipboard);
      if (!htmlHadImg && imageFiles.length > 0) {
        await handleImageFiles(imageFiles);
      }
      return;
    }

    // 2. 단독 이미지 페이스트 (스크린샷 등)
    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleImageFiles(imageFiles);
      return;
    }

    // 3. 텍스트에서 동영상 URL 감지
    if (plainFromClipboard) {
      const embed = parseVideoUrl(plainFromClipboard);
      if (embed) {
        e.preventDefault();
        insertHtmlAtCursor(buildEmbedHtml(embed));
        return;
      }
    }

    // 4. 일반 텍스트: 외부 서식 제거 후 <p> 태그로 정규화
    if (plainFromClipboard) {
      e.preventDefault();
      const paragraphs = plainFromClipboard
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

  // ▲ 마크 삽입: 현재 커서 위치에 "▲ " 삽입 + 해당 블록 가운데 정렬
  function insertTriangleMark() {
    document.execCommand("insertText", false, "▲ ");
    document.execCommand("justifyCenter", false);
    editorRef.current?.focus();
    syncToParent();
  }

  // 커서/선택 위치의 가장 가까운 블록 요소를 찾는 헬퍼
  function findParentBlock(node: Node | null): HTMLElement | null {
    const editor = editorRef.current;
    if (!editor) return null;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const name = el.tagName.toLowerCase();
        if (["p", "h2", "h3", "h4", "div", "blockquote", "li", "ul", "ol"].includes(name)) {
          return el;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  function execFormatBlock(tag: string) {
    const editor = editorRef.current;
    if (!editor) return;

    // 토글: 현재 블록이 이미 같은 태그이면 <p>로 되돌림
    if (toolbar.activeBlock === tag && tag !== "p") {
      tag = "p";
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      document.execCommand("formatBlock", false, tag);
      editor.focus();
      syncToParent();
      return;
    }

    const range = selection.getRangeAt(0);
    const startBlock = findParentBlock(range.startContainer);
    const endBlock = findParentBlock(range.endContainer);

    // 단일 블록 (커서만 있거나 같은 블록 내 선택)
    if (range.collapsed || startBlock === endBlock) {
      document.execCommand("formatBlock", false, tag);
      editor.focus();
      syncToParent();
      return;
    }

    // 다중 블록: 선택 범위 내 모든 최상위 블록 수집
    const blocks: HTMLElement[] = [];
    for (let i = 0; i < editor.children.length; i++) {
      const child = editor.children[i] as HTMLElement;
      if (range.intersectsNode(child)) {
        blocks.push(child);
      }
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

  // 정렬 토글 (같은 정렬 다시 클릭 시 왼쪽으로 복귀)
  function execAlign(align: "left" | "center" | "right") {
    if (toolbar.alignType === align && align !== "left") {
      document.execCommand("justifyLeft", false);
    } else {
      const cmd = align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : "justifyRight";
      document.execCommand(cmd, false);
    }
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
      {/* Toolbar Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 pt-1.5 pb-1 bg-gray-50 border-b border-gray-100 text-xs">
        <button type="button" onClick={() => execCommand("bold")} className={toolbar.isBold ? tbtnOn : tbtnOff} title="굵게">
          굵게
        </button>
        <button type="button" onClick={() => execCommand("italic")} className={toolbar.isItalic ? tbtnOn : tbtnOff} title="기울임">
          기울임
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button type="button" onClick={() => execFormatBlock("p")} className={toolbar.activeBlock === "p" ? tbtnOn : tbtnOff} title="본문 단락">
          본문
        </button>
        <button type="button" onClick={() => execFormatBlock("h2")} className={toolbar.activeBlock === "h2" ? tbtnOn : tbtnOff} title="소제목">
          소제목
        </button>
        <button type="button" onClick={() => execFormatBlock("h3")} className={toolbar.activeBlock === "h3" ? tbtnOn : tbtnOff} title="소제목2">
          소제목2
        </button>
        <button type="button" onClick={() => execCommand("bold")} className={toolbar.isBold ? tbtnOn : tbtnOff} title="질문 (굵은 텍스트)">
          질문
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button type="button" onClick={() => execCommand("insertUnorderedList")} className={toolbar.listType === "ul" ? tbtnOn : tbtnOff} title="목록">
          목록
        </button>
        <button type="button" onClick={() => execCommand("insertOrderedList")} className={toolbar.listType === "ol" ? tbtnOn : tbtnOff} title="번호목록">
          번호목록
        </button>
        <button type="button" onClick={() => execFormatBlock("blockquote")} className={toolbar.activeBlock === "blockquote" ? tbtnOn : tbtnOff} title="인용구">
          인용
        </button>
      </div>
      {/* Toolbar Row 2 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 pb-1.5 pt-1 bg-gray-50 border-b border-gray-200 text-xs">
        <button type="button" onClick={() => execAlign("left")} className={toolbar.alignType === "left" ? tbtnOn : tbtnOff} title="왼쪽 정렬">
          왼쪽
        </button>
        <button type="button" onClick={() => execAlign("center")} className={toolbar.alignType === "center" ? tbtnOn : tbtnOff} title="가운데 정렬">
          가운데
        </button>
        <button type="button" onClick={() => execAlign("right")} className={toolbar.alignType === "right" ? tbtnOn : tbtnOff} title="오른쪽 정렬">
          오른쪽
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
        <button type="button" onClick={insertTriangleMark} className={`${tbtnOff} flex items-center gap-1`} title="▲ 마크 삽입 (커서 위치, 해당 블록 가운데 정렬)">
          ▲
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
