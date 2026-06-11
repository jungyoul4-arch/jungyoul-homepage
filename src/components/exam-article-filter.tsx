"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArticleList } from "@/components/article-list";
import type { Article, ExamTagOption } from "@/lib/data";

interface Props {
  articles: Article[];
  tagOptions: ExamTagOption[];
}

const SECTIONS: {
  param: "year" | "grade" | "subject";
  field: "examYear" | "examGrade" | "examSubject";
  tagType: "year" | "grade" | "subject";
  label: string;
}[] = [
  { param: "year", field: "examYear", tagType: "year", label: "연도" },
  { param: "grade", field: "examGrade", tagType: "grade", label: "학년" },
  { param: "subject", field: "examSubject", tagType: "subject", label: "과목" },
];

const selectClass =
  "h-10 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600 bg-white min-w-[120px]";

export function ExamArticleFilter({ articles, tagOptions }: Props) {
  const searchParams = useSearchParams();

  const selected = {
    year: searchParams.get("year") ?? "",
    grade: searchParams.get("grade") ?? "",
    subject: searchParams.get("subject") ?? "",
  };

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (selected.year && a.examYear !== selected.year) return false;
      if (selected.grade && a.examGrade !== selected.grade) return false;
      if (selected.subject && a.examSubject !== selected.subject) return false;
      return true;
    });
  }, [articles, selected.year, selected.grade, selected.subject]);

  function handleChange(param: "year" | "grade" | "subject", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(param, value);
    } else {
      next.delete(param);
    }
    // 필터 변경 시 페이지 1로 리셋
    next.delete("page");
    const qs = next.toString();
    // shallow routing — 서버 라운드트립 없이 URL(year·grade·subject)만 갱신.
    window.history.replaceState(null, "", qs ? `/exam?${qs}` : "/exam");
  }

  const visible = SECTIONS.filter(
    (s) => tagOptions.filter((o) => o.tagType === s.tagType).length > 0
  );

  return (
    <>
      {visible.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-[#F5F7FA] rounded-md">
          <span className="text-sm font-semibold text-text-primary mr-2">필터</span>
          {visible.map((s) => {
            const opts = tagOptions
              .filter((o) => o.tagType === s.tagType)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <div key={s.param} className="flex items-center gap-1.5">
                <label className="text-xs text-text-secondary">{s.label}</label>
                <select
                  value={selected[s.param]}
                  onChange={(e) => handleChange(s.param, e.target.value)}
                  className={selectClass}
                  aria-label={s.label}
                >
                  <option value="">전체</option>
                  {opts.map((o) => (
                    <option key={o.id} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          {(selected.year || selected.grade || selected.subject) && (
            <button
              type="button"
              onClick={() => window.history.replaceState(null, "", "/exam")}
              className="ml-auto text-xs text-brand-blue hover:underline"
            >
              초기화
            </button>
          )}
        </div>
      )}
      <ArticleList articles={filtered} hideTabs />
    </>
  );
}
