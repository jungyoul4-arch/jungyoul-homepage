"use client";

import { useEffect, useState } from "react";
import type { ExamTagOption } from "@/lib/data";

export interface ExamTagValue {
  examYear: string;
  examGrade: string;
  examSubject: string;
}

interface Props {
  value: ExamTagValue;
  onChange: (next: Partial<ExamTagValue>) => void;
  // 미리 fetch한 옵션을 주입하면 자체 fetch 생략 (서버 컴포넌트에서 prefetch 한 경우)
  options?: ExamTagOption[];
  className?: string;
}

const SECTIONS: {
  key: keyof ExamTagValue;
  tagType: ExamTagOption["tagType"];
  label: string;
}[] = [
  { key: "examYear", tagType: "year", label: "연도" },
  { key: "examGrade", tagType: "grade", label: "학년" },
  { key: "examSubject", tagType: "subject", label: "과목" },
];

const selectClass =
  "w-full h-9 px-3 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-600 bg-white disabled:bg-gray-50 disabled:text-gray-400";

function optionsForType(
  dbOptions: ExamTagOption[],
  tagType: ExamTagOption["tagType"]
): ExamTagOption[] {
  return dbOptions
    .filter((o) => o.tagType === tagType)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ExamTagSelects({ value, onChange, options, className }: Props) {
  const [internal, setInternal] = useState<ExamTagOption[] | null>(null);
  const fetched = options ?? internal;

  useEffect(() => {
    if (options) return; // 주입된 옵션이 있으면 fetch 불필요
    let cancelled = false;
    fetch("/api/exam-tag-options")
      .then((r) => r.json())
      .then((data: ExamTagOption[]) => {
        if (!cancelled) setInternal(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setInternal([]);
      });
    return () => {
      cancelled = true;
    };
  }, [options]);

  if (fetched === null) {
    return (
      <div className={className}>
        <p className="text-xs text-gray-400">태그 옵션을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {SECTIONS.map((s) => {
          const opts = optionsForType(fetched, s.tagType);
          const empty = opts.length === 0;
          return (
            <div key={s.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {s.label}
              </label>
              <select
                value={value[s.key] || ""}
                onChange={(e) => onChange({ [s.key]: e.target.value } as Partial<ExamTagValue>)}
                className={selectClass}
                disabled={empty}
              >
                <option value="">선택 안 함</option>
                {opts.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
              {empty && (
                <p className="text-xs text-gray-500 mt-1">
                  어드민 → 시험 태그 옵션에서 먼저 등록하세요
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
