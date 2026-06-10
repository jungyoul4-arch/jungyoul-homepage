"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Code, X, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 삽입 확정. resolve 까지 busy 표시. reject 시 message 를 inline 에러로 노출하고 모달 유지. */
  onSubmit: (rawHtml: string) => Promise<void>;
}

/**
 * 에디터 툴바 "HTML" 버튼이 여는 raw HTML 소스 입력 모달.
 * 정화(normalizePastedHtml)·삽입 책임은 onSubmit 을 넘긴 쪽(ContentEditor)에 있고
 * 이 컴포넌트는 입력/busy/에러 표시만 담당하는 dumb 모달.
 *
 * InlineEditModal(z-[1000], transform 패널 — 자식 fixed 의 containing block 함정) 내부에서도
 * viewport 풀사이즈로 뜨도록 document.body 직속 portal + z-[2000] 으로 렌더
 * (ThumbnailOverlayEditor 와 동일 패턴). open=false 동안은 null 을 반환하므로
 * 클라이언트 클릭 이후에만 portal 이 생성되어 SSR mounted 가드가 필요 없다.
 */
export function HtmlInputModal({ open, onClose, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC 닫기 (업로드 등 진행 중에는 무시)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setValue("");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    const raw = value.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(raw);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삽입 처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const dialog = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative bg-white shadow-2xl rounded-md w-full max-w-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-brand-blue" />
            <h2 className="text-base font-bold text-text-primary">HTML 소스 삽입</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          <textarea
            autoFocus
            spellCheck={false}
            rows={12}
            disabled={busy}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="<p>문단</p>, <table>…</table> 같은 HTML 소스를 붙여넣으세요"
            className="w-full font-mono text-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-600 transition-colors resize-y disabled:opacity-50 disabled:bg-gray-50"
          />
          <p className="text-xs text-text-secondary">
            삽입 시 붙여넣기와 동일한 정리 규칙이 적용됩니다 — script 등 위험 요소 제거, 허용 외
            인라인 스타일 정리, data:URL 이미지 자동 업로드.
          </p>
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm text-text-primary border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-brand-blue-dark transition-colors disabled:opacity-40"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? "삽입 중…" : "삽입"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
