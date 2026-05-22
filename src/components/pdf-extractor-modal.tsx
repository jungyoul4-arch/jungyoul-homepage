"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle, RotateCw } from "lucide-react";
import {
  loadPdf,
  renderPageRaster,
  extractPageText,
  type PageRaster,
} from "@/lib/pdf-extract";
import type { PdfBlock } from "@/lib/pdf-convert-prompt";

interface PdfConvertResponse {
  blocks: PdfBlock[];
  usage?: { input_tokens: number; output_tokens: number };
  /** 응답이 max_tokens 한도에 부딪쳐 잘렸음. 마지막 블록이 누락됐을 가능성. */
  truncated?: boolean;
  /** 형식이 깨져 폐기된 항목 수. 0 이상이면 일부 블록이 누락됐을 가능성. */
  droppedBlocks?: number;
  /** blocks 가 0개. 페이지 자체가 비어있거나 LLM 응답 실패. */
  empty?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 사용자가 "본문에 삽입"을 누르면 결합된 HTML 을 한 번에 전달. */
  onInsert: (html: string) => void;
}

interface PageState {
  num: number;
  thumbDataUrl: string;
  raster: PageRaster | null;
  selected: boolean;
  status: "idle" | "converting" | "done" | "error";
  blocks?: PdfBlock[];
  error?: string;
  usage?: { input_tokens: number; output_tokens: number };
  /** 누락 우려 — done 상태인데 잘림/폐기/빈 응답 신호가 있을 때 true. */
  warning?: { truncated?: boolean; droppedBlocks?: number; empty?: boolean };
}

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export function PdfExtractorModal({ open, onClose, onInsert }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageState[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !converting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, converting]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setFile(null);
      setPages([]);
      setLoadingPdf(false);
      setConverting(false);
      setError(null);
      cancelRef.current = false;
    }
  }, [open]);

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 업로드할 수 있습니다");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setError(`파일 크기는 25MB 이하여야 합니다 (현재 ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    setFile(f);
    setLoadingPdf(true);
    setPages([]);

    try {
      const pdf = await loadPdf(f);
      const count = pdf.numPages;
      const init: PageState[] = Array.from({ length: count }, (_, i) => ({
        num: i + 1,
        thumbDataUrl: "",
        raster: null,
        selected: true,
        status: "idle",
      }));
      setPages(init);

      // 썸네일 + raster 를 페이지별로 순차 생성 (병렬은 메모리/CPU 부담 ↑)
      for (let i = 0; i < count; i++) {
        const raster = await renderPageRaster(pdf, i + 1, 1600);
        setPages((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], raster, thumbDataUrl: raster.dataUrl };
          return next;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`PDF 로드 실패: ${msg}`);
    } finally {
      setLoadingPdf(false);
    }
  }, []);

  // PDF 페이스트 지원 (Ctrl+V). handleFile 정의 후에 와야 deps 참조 가능.
  useEffect(() => {
    if (!open) return;
    function onPaste(e: ClipboardEvent) {
      if (loadingPdf || converting) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type === "application/pdf") {
          const f = item.getAsFile();
          if (f) {
            void handleFile(f);
            e.preventDefault();
            return;
          }
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open, loadingPdf, converting, handleFile]);

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dropRef.current?.classList.remove("ring-2", "ring-brand-blue");
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  function togglePage(num: number) {
    setPages((prev) => prev.map((p) => (p.num === num ? { ...p, selected: !p.selected } : p)));
  }

  function toggleAll(selected: boolean) {
    setPages((prev) => prev.map((p) => ({ ...p, selected })));
  }

  const convertOne = useCallback(
    async (page: PageState, pageText: string): Promise<PageState> => {
      if (!page.raster) {
        return { ...page, status: "error", error: "raster 미준비" };
      }
      const res = await fetch("/api/admin/pdf-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageImageBase64: page.raster.jpegBase64,
          pageText,
          pageNumber: page.num,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        return { ...page, status: "error", error: data?.error || "변환 실패" };
      }
      const data = (await res.json()) as PdfConvertResponse;
      return {
        ...page,
        status: "done",
        blocks: data.blocks,
        usage: data.usage,
        warning: buildWarning(data),
        error: undefined,
      };
    },
    [],
  );

  const startConvert = useCallback(async () => {
    if (!file || converting) return;
    cancelRef.current = false;
    setConverting(true);
    setError(null);

    // 변환 시점에 텍스트 추출도 같이 진행 (PDF 인스턴스를 한 번 더 로드해 그대로 활용)
    let pdf;
    try {
      pdf = await loadPdf(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConverting(false);
      return;
    }

    const targets = pages.filter((p) => p.selected && p.status !== "done");
    for (const t of targets) {
      if (cancelRef.current) break;
      setPages((prev) => prev.map((p) => (p.num === t.num ? { ...p, status: "converting", error: undefined, warning: undefined } : p)));

      const text = await extractPageText(pdf, t.num).then((r) => r.joined).catch(() => "");
      const res = await fetch("/api/admin/pdf-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageImageBase64: t.raster?.jpegBase64 ?? "",
          pageText: text,
          pageNumber: t.num,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        setPages((prev) =>
          prev.map((p) => (p.num === t.num ? { ...p, status: "error", error: data?.error || "변환 실패" } : p)),
        );
        continue;
      }
      const data = (await res.json()) as PdfConvertResponse;
      setPages((prev) =>
        prev.map((p) =>
          p.num === t.num
            ? {
                ...p,
                status: "done",
                blocks: data.blocks,
                usage: data.usage,
                warning: buildWarning(data),
                error: undefined,
              }
            : p,
        ),
      );
    }

    setConverting(false);
  }, [file, pages, converting]);

  function cancelConvert() {
    cancelRef.current = true;
  }

  async function retryPage(num: number) {
    if (!file) return;
    const page = pages.find((p) => p.num === num);
    if (!page) return;
    setPages((prev) => prev.map((p) => (p.num === num ? { ...p, status: "converting", error: undefined, warning: undefined } : p)));
    let text = "";
    try {
      const pdf = await loadPdf(file);
      text = await extractPageText(pdf, num).then((r) => r.joined).catch(() => "");
    } catch {
      // PDF 재로드 실패해도 이미지 기반 변환은 가능 — text 만 빈 문자열로
    }
    const next = await convertOne(page, text);
    setPages((prev) => prev.map((p) => (p.num === num ? next : p)));
  }

  function insertAll() {
    const done = pages.filter((p) => p.selected && p.status === "done" && p.blocks);
    if (done.length === 0) return;
    const warnedSelected = done.filter((p) => p.warning);
    if (warnedSelected.length > 0) {
      const nums = warnedSelected.map((p) => p.num).join(", ");
      const ok = window.confirm(
        `다음 페이지는 누락 우려가 있습니다 (잘림/빈 응답/형식 폐기). 그래도 본문에 삽입할까요?\n페이지: ${nums}\n\n취소하고 해당 페이지를 다시 변환할 수 있습니다.`,
      );
      if (!ok) return;
    }
    const html = done
      .flatMap((p) => p.blocks ?? [])
      .map((b) => b.html)
      .join("\n");
    if (!html) return;
    onInsert(html);
    onClose();
  }

  function insertPage(num: number) {
    const page = pages.find((p) => p.num === num);
    if (!page?.blocks?.length) return;
    onInsert(page.blocks.map((b) => b.html).join("\n"));
    onClose();
  }

  if (!open) return null;

  const allSelected = pages.length > 0 && pages.every((p) => p.selected);
  const doneCount = pages.filter((p) => p.status === "done").length;
  const warnCount = pages.filter((p) => p.status === "done" && p.warning).length;
  const selectedCount = pages.filter((p) => p.selected).length;
  const totalInputTokens = pages.reduce((s, p) => s + (p.usage?.input_tokens ?? 0), 0);
  const totalOutputTokens = pages.reduce((s, p) => s + (p.usage?.output_tokens ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={converting ? undefined : onClose} />
      <div className="relative bg-white shadow-2xl rounded-md w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-blue" />
            <h2 className="text-base font-bold text-text-primary">PDF에서 객체 추출</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={converting}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!file && (
            <div
              ref={dropRef}
              onDragOver={(e) => {
                e.preventDefault();
                dropRef.current?.classList.add("ring-2", "ring-brand-blue");
              }}
              onDragLeave={() => dropRef.current?.classList.remove("ring-2", "ring-brand-blue")}
              onDrop={onDrop}
              className="border-2 border-dashed border-border-light rounded-md py-12 px-6 flex flex-col items-center justify-center gap-3 bg-media-bg transition-all"
            >
              <Upload size={32} className="text-text-secondary" />
              <p className="text-sm text-text-primary">PDF 파일을 끌어다 놓거나 클릭해서 선택하세요</p>
              <p className="text-xs text-text-secondary">또는 Ctrl+V (Cmd+V) 로 클립보드에서 붙여넣기 · 최대 25MB</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-brand-blue-dark transition-colors cursor-pointer">
                <Upload size={14} />
                PDF 선택
                <input type="file" accept="application/pdf" className="hidden" onChange={onFileInput} />
              </label>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
              {error}
            </div>
          )}

          {file && (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-text-secondary" />
                  <span className="font-medium text-text-primary">{file.name}</span>
                  <span className="text-text-secondary">
                    · {pages.length || "…"} 페이지 · {(file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      disabled={converting || loadingPdf}
                    />
                    <span>전체 선택</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPages([]);
                    }}
                    disabled={converting || loadingPdf}
                    className="text-text-secondary hover:text-text-primary underline disabled:opacity-50"
                  >
                    다른 파일 선택
                  </button>
                </div>
              </div>

              {loadingPdf && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Loader2 size={14} className="animate-spin" />
                  PDF 로딩 + 페이지 렌더링 중…
                </div>
              )}

              {/* 페이지 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {pages.map((p) => (
                  <PageCard
                    key={p.num}
                    page={p}
                    onToggle={() => togglePage(p.num)}
                    onRetry={() => retryPage(p.num)}
                    onInsert={() => insertPage(p.num)}
                    disabled={converting || loadingPdf}
                  />
                ))}
              </div>

              {/* 변환 결과: 페이지별 HTML 미리보기 (done 상태만) — 누락 우려 페이지 우선 정렬, 기본 펼침 */}
              {pages.some((p) => p.status === "done") && (
                <div className="space-y-3 pt-3 border-t border-border-light">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary">변환 결과 미리보기</h3>
                    {warnCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-800 rounded">
                        <AlertTriangle size={12} /> 누락 우려 {warnCount}개 — 본문 삽입 전 재변환 권장
                      </span>
                    )}
                  </div>
                  {pages
                    .filter((p) => p.status === "done")
                    .slice()
                    .sort((a, b) => {
                      const aw = a.warning ? 0 : 1;
                      const bw = b.warning ? 0 : 1;
                      if (aw !== bw) return aw - bw;
                      return a.num - b.num;
                    })
                    .map((p) => (
                      <details
                        key={p.num}
                        open={!!p.warning}
                        className={`border rounded ${p.warning ? "border-amber-300" : "border-border-light"}`}
                      >
                        <summary className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between ${p.warning ? "bg-amber-50 hover:bg-amber-100" : "bg-gray-50 hover:bg-gray-100"}`}>
                          <span className="flex items-center gap-2">
                            {p.warning && <AlertTriangle size={14} className="text-amber-600" />}
                            <strong>페이지 {p.num}</strong>
                            <span className="text-text-secondary">· 블록 {p.blocks?.length ?? 0}개</span>
                            {p.warning && (
                              <span className="text-amber-800 text-xs">
                                {formatWarning(p.warning)}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            {p.warning && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  void retryPage(p.num);
                                }}
                                disabled={converting}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-amber-300 text-amber-800 bg-white rounded hover:bg-amber-50 disabled:opacity-50"
                              >
                                <RotateCw size={11} /> 이 페이지만 다시 변환
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                insertPage(p.num);
                              }}
                              className="text-xs px-2 py-1 bg-brand-blue text-white rounded hover:bg-brand-blue-dark"
                            >
                              이 페이지 삽입
                            </button>
                          </span>
                        </summary>
                        <div
                          className="px-3 py-3 article-content text-sm max-h-96 overflow-y-auto"
                          dangerouslySetInnerHTML={{
                            __html: p.blocks?.map((b) => b.html).join("\n") ?? "",
                          }}
                        />
                      </details>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-border-light bg-gray-50">
          <div className="text-xs text-text-secondary">
            {pages.length > 0 && (
              <>
                선택 {selectedCount} / {pages.length} · 변환 완료 {doneCount}
                {warnCount > 0 && (
                  <span className="ml-1 text-amber-700 font-medium">(누락 우려 {warnCount})</span>
                )}
                {totalInputTokens + totalOutputTokens > 0 && (
                  <span className="ml-2">
                    · 토큰 in {totalInputTokens.toLocaleString()} / out{" "}
                    {totalOutputTokens.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {converting ? (
              <button
                type="button"
                onClick={cancelConvert}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
              >
                취소
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
              >
                닫기
              </button>
            )}
            <button
              type="button"
              onClick={startConvert}
              disabled={!file || loadingPdf || converting || selectedCount === 0}
              className="px-4 py-1.5 text-sm bg-brand-blue text-white rounded hover:bg-brand-blue-dark disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {converting && <Loader2 size={14} className="animate-spin" />}
              {converting ? "변환 중…" : "선택 페이지 변환"}
            </button>
            <button
              type="button"
              onClick={insertAll}
              disabled={doneCount === 0 || converting}
              className="px-4 py-1.5 text-sm bg-brand-blue text-white rounded hover:bg-brand-blue-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              완료된 페이지 본문에 삽입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageCard({
  page,
  onToggle,
  onRetry,
  onInsert,
  disabled,
}: {
  page: PageState;
  onToggle: () => void;
  onRetry: () => void;
  onInsert: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`border rounded overflow-hidden flex flex-col ${
        page.selected ? "border-brand-blue" : "border-border-light"
      }`}
    >
      <label className="relative cursor-pointer">
        <input
          type="checkbox"
          checked={page.selected}
          onChange={onToggle}
          disabled={disabled}
          className="absolute top-2 left-2 z-10"
        />
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {page.status === "converting" && <Loader2 size={14} className="animate-spin text-brand-blue" />}
          {page.status === "done" && !page.warning && <CheckCircle2 size={14} className="text-green-600" />}
          {page.status === "done" && page.warning && <AlertTriangle size={14} className="text-amber-600" />}
          {page.status === "error" && <AlertCircle size={14} className="text-red-600" />}
        </div>
        <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
          {page.thumbDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.thumbDataUrl} alt={`페이지 ${page.num}`} className="max-w-full max-h-full object-contain" />
          ) : (
            <Loader2 size={20} className="animate-spin text-text-secondary" />
          )}
        </div>
      </label>
      <div className="px-2 py-1.5 text-xs flex items-center justify-between bg-white">
        <span className="text-text-secondary">페이지 {page.num}</span>
        <span className="flex items-center gap-2">
          {page.status === "done" && page.warning && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
              className="inline-flex items-center gap-0.5 text-amber-700 hover:underline disabled:opacity-50"
            >
              <RotateCw size={11} /> 다시 변환
            </button>
          )}
          {page.status === "done" && (
            <button
              type="button"
              onClick={onInsert}
              className="text-brand-blue hover:underline"
            >
              삽입
            </button>
          )}
          {page.status === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-0.5 text-red-600 hover:underline"
            >
              <RotateCw size={11} /> 재시도
            </button>
          )}
        </span>
      </div>
      {page.status === "done" && page.warning && (
        <p
          className="px-2 py-1.5 text-[11px] leading-snug text-amber-800 bg-amber-50 border-t border-amber-200 break-words whitespace-pre-wrap"
          role="alert"
        >
          누락 우려 — {formatWarning(page.warning)}
        </p>
      )}
      {page.status === "error" && page.error && (
        <p
          className="px-2 py-1.5 text-[11px] leading-snug text-red-700 bg-red-50 border-t border-red-100 break-words whitespace-pre-wrap"
          role="alert"
        >
          {page.error}
        </p>
      )}
    </div>
  );
}

function buildWarning(data: PdfConvertResponse): PageState["warning"] {
  const truncated = !!data.truncated;
  const droppedBlocks = data.droppedBlocks ?? 0;
  const empty = !!data.empty;
  if (!truncated && droppedBlocks === 0 && !empty) return undefined;
  return { truncated, droppedBlocks, empty };
}

function formatWarning(w: NonNullable<PageState["warning"]>): string {
  const parts: string[] = [];
  if (w.truncated) parts.push("응답 잘림 (max_tokens 초과)");
  if (w.droppedBlocks && w.droppedBlocks > 0) parts.push(`형식 폐기 ${w.droppedBlocks}개`);
  if (w.empty) parts.push("빈 응답");
  return parts.join(" · ");
}
