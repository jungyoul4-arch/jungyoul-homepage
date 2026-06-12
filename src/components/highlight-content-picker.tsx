"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { isValidThumbnail } from "@/lib/thumbnail";
import { ThumbnailUploader } from "./thumbnail-uploader";

// 하이라이트 폼의 연결/직접입력 공통 상태. inline-edit-modal·admin/highlights 가 공유.
export interface HighlightFormValue {
  title?: string;
  thumbnail?: string;
  thumbnailOverlays?: string;
  linkUrl?: string;
  linkedKind?: "article" | "html" | "url" | "";
  linkedId?: string;
}

interface ContentOption {
  kind: "article" | "html" | "url";
  id: string;
  title: string;
  categoryLabel: string;
  date: string;
  thumbnail: string;
}

const KIND_LABEL: Record<ContentOption["kind"], string> = {
  article: "기사",
  html: "HTML",
  url: "URL",
};

/**
 * 어드민 하이라이트 폼의 컨텐츠 연결 UI.
 * - "컨텐츠 연결" 모드: 기사·HTML·URL 통합 목록에서 검색·선택 → linkedKind/linkedId 저장.
 *   공개 카드는 resolveHighlights() 가 이 참조를 풀어 최신 title/thumbnail/링크로 동기화한다.
 *   선택 시 title/thumbnail 스냅샷도 함께 저장(어드민 목록 식별 + 컨텐츠 삭제 시 폴백용).
 * - "직접 입력" 모드: 기존처럼 title·linkUrl·thumbnail 을 수동 입력(외부 캠페인 등).
 * value 변경은 onChange(patch) 로 부모에 위임(부모가 form 상태에 머지).
 * mode 초기화를 위해 편집 대상이 바뀌면 부모에서 key 로 리마운트할 것.
 */
export function HighlightContentPicker({
  value,
  onChange,
}: {
  value: HighlightFormValue;
  onChange: (patch: HighlightFormValue) => void;
}) {
  const linked = !!(value.linkedKind && value.linkedId);
  const [mode, setMode] = useState<"linked" | "manual">(
    linked || (!value.title && !value.thumbnail && !value.linkUrl) ? "linked" : "manual",
  );
  const [options, setOptions] = useState<ContentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [a, h, u] = await Promise.allSettled([
          fetch("/api/articles", { signal: controller.signal }),
          fetch("/api/admin/html-pages", { signal: controller.signal }),
          fetch("/api/admin/url-pages", { signal: controller.signal }),
        ]);
        const out: ContentOption[] = [];
        const push = async (
          res: PromiseSettledResult<Response>,
          kind: ContentOption["kind"],
        ) => {
          if (res.status !== "fulfilled" || !res.value.ok) return;
          const rows: Record<string, unknown>[] = await res.value.json().catch(() => []);
          for (const r of rows) {
            if (r.hidden) continue; // 숨긴 컨텐츠는 공개에서 안 보이므로 연결 후보에서 제외
            out.push({
              kind,
              id: String(r.id),
              title: String(r.title ?? ""),
              categoryLabel: String(r.categoryLabel || KIND_LABEL[kind]),
              date: String(r.date ?? ""),
              thumbnail: String(r.thumbnail ?? ""),
            });
          }
        };
        await push(a, "article");
        await push(h, "html");
        await push(u, "url");
        out.sort((x, y) => (y.date || "").localeCompare(x.date || ""));
        setOptions(out);
      } catch {
        // 네트워크 실패 시 빈 목록 — 직접입력 모드로 대체 가능
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const selected = linked
    ? options.find((o) => o.kind === value.linkedKind && o.id === value.linkedId)
    : undefined;

  function selectContent(o: ContentOption) {
    // 연결 참조 + 어드민 목록/삭제 폴백용 스냅샷(title/thumbnail) 저장.
    // linkUrl 은 공개 resolve 가 계산하므로 비움(참조 모드).
    onChange({
      linkedKind: o.kind,
      linkedId: o.id,
      title: o.title,
      thumbnail: o.thumbnail,
      thumbnailOverlays: "",
      linkUrl: "",
    });
  }

  function clearSelection() {
    onChange({ linkedKind: "", linkedId: "" });
    setQuery("");
  }

  function switchMode(next: "linked" | "manual") {
    setMode(next);
    // 직접입력으로 전환하면 참조 해제(수동값은 유지). 연결 모드로 돌아오면 다시 선택.
    if (next === "manual") onChange({ linkedKind: "", linkedId: "" });
  }

  const filtered = options.filter(
    (o) =>
      !query ||
      o.title.toLowerCase().includes(query.toLowerCase()) ||
      o.categoryLabel.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {/* 모드 토글 */}
      <div className="flex gap-2">
        <ModeButton active={mode === "linked"} onClick={() => switchMode("linked")}>
          컨텐츠 연결
        </ModeButton>
        <ModeButton active={mode === "manual"} onClick={() => switchMode("manual")}>
          직접 입력
        </ModeButton>
      </div>

      {mode === "linked" ? (
        <>
          {linked ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="w-[88px] h-[50px] shrink-0 rounded overflow-hidden relative bg-gray-200">
                {isValidThumbnail(selected?.thumbnail ?? value.thumbnail) && (
                  <Image
                    src={selected?.thumbnail ?? value.thumbnail ?? ""}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-blue-600">
                  {selected ? `${KIND_LABEL[selected.kind]} · ${selected.categoryLabel}` : "연결됨"}
                </span>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selected?.title ?? value.title ?? "(제목 없음)"}
                </p>
                {!selected && !loading && (
                  <p className="text-xs text-amber-600">
                    연결된 컨텐츠를 찾을 수 없습니다(삭제·숨김). 마지막 정보로 표시됩니다.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="p-1.5 text-gray-400 hover:text-red-600 shrink-0 transition-colors"
                title="연결 해제"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목으로 검색 (기사·HTML·URL)..."
                className={inputClass + " mb-2"}
              />
              <div className="max-h-[240px] overflow-y-auto border border-gray-200 rounded-sm">
                {loading ? (
                  <p className="text-xs text-gray-400 p-3 text-center">불러오는 중...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3 text-center">연결할 컨텐츠가 없습니다.</p>
                ) : (
                  filtered.slice(0, 30).map((o) => (
                    <button
                      key={`${o.kind}:${o.id}`}
                      type="button"
                      onClick={() => selectContent(o)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="w-[60px] h-[34px] shrink-0 rounded overflow-hidden relative bg-gray-100">
                        {isValidThumbnail(o.thumbnail) && (
                          <Image src={o.thumbnail} alt="" fill unoptimized className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-blue-600">
                          {KIND_LABEL[o.kind]} · {o.categoryLabel}
                        </span>
                        <p className="text-sm text-gray-900 truncate">{o.title}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">
            연결하면 카드의 썸네일·제목이 해당 컨텐츠와 자동으로 동기화됩니다.
          </p>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={value.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연결 링크 (선택)</label>
            <input
              type="text"
              value={value.linkUrl || ""}
              onChange={(e) => onChange({ linkUrl: e.target.value })}
              placeholder="/articles/슬러그, /p/슬러그, https://…"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">썸네일</label>
            <ThumbnailUploader
              value={value.thumbnail || ""}
              overlays={value.thumbnailOverlays || ""}
              onChange={(url, overlaysJson) =>
                onChange({ thumbnail: url, thumbnailOverlays: overlaysJson ?? "" })
              }
              aspect="16:9"
            />
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-9 text-sm font-medium rounded-md border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600";
