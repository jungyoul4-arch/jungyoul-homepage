// STYLING: rough v1 — community tokens only (see globals.css @theme)
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CommunityTag } from "./types";

type Props = {
  tags: CommunityTag[];
  // PC sticky 사이드바 / 모바일 가로 칩 — 둘 다 같은 컴포넌트, Tailwind 분기만.
};

export function CommunityTagFilter({ tags }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("tag") ?? "";

  function setTag(value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set("tag", value);
    else next.delete("tag");
    const qs = next.toString();
    router.replace(qs ? `/community?${qs}` : "/community", { scroll: false });
  }

  return (
    <>
      {/* 모바일: 상단 가로 스크롤 칩 */}
      <div className="lg:hidden -mx-4 px-4 mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 w-max pb-1">
          <Chip active={current === ""} onClick={() => setTag("")} label="전체" />
          {tags.map((t) => (
            <Chip
              key={t.id}
              active={current === t.value}
              onClick={() => setTag(t.value)}
              label={t.value}
            />
          ))}
        </div>
      </div>

      {/* PC: sticky 사이드바 */}
      <aside className="hidden lg:block lg:w-44 lg:shrink-0">
        <div className="sticky top-28 border border-community-border rounded-md p-4 bg-white">
          <h2 className="text-sm font-semibold text-text-primary mb-3">태그</h2>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setTag("")}
                className={`block w-full text-left text-sm py-1.5 px-2 rounded ${
                  current === ""
                    ? "bg-community-surface text-community-accent font-medium"
                    : "text-community-muted hover:bg-community-surface"
                }`}
              >
                전체
              </button>
            </li>
            {tags.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTag(t.value)}
                  className={`block w-full text-left text-sm py-1.5 px-2 rounded ${
                    current === t.value
                      ? "bg-community-surface text-community-accent font-medium"
                      : "text-community-muted hover:bg-community-surface"
                  }`}
                >
                  #{t.value}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${
        active
          ? "bg-community-accent text-white border-community-accent"
          : "bg-white text-community-muted border-community-border hover:bg-community-surface"
      }`}
    >
      {label}
    </button>
  );
}
